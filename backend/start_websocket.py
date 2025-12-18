import asyncio
import os
import sys
from dotenv import load_dotenv
import redis
from loguru import logger
from websocket_server import WebSocketServer
from config import get_config

# 加载环境变量
load_dotenv()

# 配置日志
logger.add(
    "websocket.log",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name} | {message}",
    rotation="1 day",
    retention="7 days"
)

def main():
    """启动独立的WebSocket服务器"""
    try:
        # 获取配置
        config = get_config()
        
        print(f"[DEBUG] 准备启动WebSocket服务器，监听地址: {config.WS_HOST}:{config.WS_PORT}")
        # 检查端口是否被占用
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            result = s.connect_ex((config.WS_HOST, config.WS_PORT))
            if result == 0:
                print(f"[WARNING] 端口 {config.WS_PORT} 已经被占用")
            else:
                print(f"[DEBUG] 端口 {config.WS_PORT} 可用")
        
        # 初始化Redis客户端
        print(f"[DEBUG] 连接到Redis: {config.REDIS_URL}")
        redis_client = redis.from_url(config.REDIS_URL, decode_responses=True)
        
        # 创建WebSocket服务器实例
        ws_server = WebSocketServer(redis_client)
        
        # 启动服务器
        logger.info(f"启动独立WebSocket服务器: {config.WS_HOST}:{config.WS_PORT}")
        print(f"[DEBUG] 服务器实例已创建，正在启动事件循环...")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            print(f"[DEBUG] 开始监听连接请求...")
            loop.run_until_complete(ws_server.start_server(config.WS_HOST, config.WS_PORT))
        except KeyboardInterrupt:
            logger.info("WebSocket服务器被用户中断")
            print("[INFO] WebSocket服务器被用户中断")
        finally:
            print("[DEBUG] 关闭事件循环")
            loop.close()
            print("[DEBUG] 停止WebSocket服务器")
            ws_server.stop()
            
    except Exception as e:
        logger.error(f"WebSocket服务器启动失败: {e}")
        print(f"[ERROR] 启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
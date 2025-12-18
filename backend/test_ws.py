#!/usr/bin/env python3
import asyncio
import websockets
import json

async def handle_client(websocket):
    """处理客户端连接"""
    print(f"客户端连接: {websocket.remote_address}")
    
    # 发送欢迎消息
    await websocket.send(json.dumps({
        "type": "welcome",
        "data": {"message": "连接成功！"},
        "timestamp": "2025-12-18T15:00:00"
    }))
    
    try:
        while True:
            # 接收客户端消息
            message = await websocket.recv()
            print(f"收到消息: {message}")
            
            # 解析消息
            data = json.loads(message)
            
            # 处理订阅请求
            if data.get('type') == 'subscribe':
                print(f"客户端订阅频道: {data.get('data', {}).get('channels')}")
                # 发送订阅确认
                await websocket.send(json.dumps({
                    "type": "subscribed",
                    "data": {"channels": data.get('data', {}).get('channels', [])},
                    "timestamp": "2025-12-18T15:00:00"
                }))
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"客户端断开连接: {e}")
    except Exception as e:
        print(f"处理错误: {e}")

async def main():
    """启动简单的WebSocket服务器"""
    print("启动简单的WebSocket服务器: ws://localhost:5001")
    
    async with websockets.serve(
        handle_client, 
        "localhost", 
        5001,
        ping_interval=30,
        ping_timeout=10
    ):
        await asyncio.Future()  # 保持运行

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("服务器停止")

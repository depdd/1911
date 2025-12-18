import asyncio
import websockets
import json

async def handle_client(websocket):
    """简单的客户端处理函数"""
    # 获取路径信息（如果可用）
    path = getattr(websocket, 'path', '/')
    print(f"客户端连接: {websocket.remote_address}, 路径: {path}")
    
    try:
        # 发送欢迎消息
        await websocket.send(json.dumps({
            "type": "welcome",
            "data": {"message": "连接成功！"},
            "timestamp": "2023-01-01T00:00:00Z"
        }))
        print("已发送欢迎消息")
        
        # 消息处理循环
        while True:
            message = await websocket.recv()
            print(f"收到消息: {message}")
            # 回显消息
            await websocket.send(f"Echo: {message}")
            
    except Exception as e:
        print(f"客户端处理错误: {e}")
    finally:
        print(f"客户端连接关闭: {websocket.remote_address}")

async def main():
    """启动简单的WebSocket服务器"""
    host = "localhost"
    port = 65534
    
    print(f"启动简单WebSocket服务器: {host}:{port}")
    server = await websockets.serve(handle_client, host, port)
    
    print("服务器已启动，等待连接...")
    await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())
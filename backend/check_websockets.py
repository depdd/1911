import websockets
import sys

# 打印websockets库版本
print(f"websockets库版本: {websockets.__version__}")
print(f"Python版本: {sys.version}")

# 查看serve函数的签名
try:
    import inspect
    print("\nwebsockets.serve函数签名:")
    print(inspect.signature(websockets.serve))
    print("\nserve函数文档:")
    print(websockets.serve.__doc__)
except Exception as e:
    print(f"获取函数签名失败: {e}")

# 简单的测试服务器示例
import asyncio

async def echo_server(websocket):
    """只接受一个参数的处理函数"""
    print(f"客户端连接: {websocket.remote_address}")
    try:
        async for message in websocket:
            print(f"收到消息: {message}")
            await websocket.send(f"Echo: {message}")
    except Exception as e:
        print(f"错误: {e}")

async def main():
    print("\n尝试启动服务器(只使用一个参数的处理函数)...")
    try:
        # 使用只接受一个参数的处理函数
        server = await websockets.serve(echo_server, "localhost", 65533)
        print("服务器启动成功！请按Ctrl+C停止")
        await server.serve_forever()
    except Exception as e:
        print(f"服务器启动失败: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n服务器已停止")
import asyncio
import json
import websockets
from datetime import datetime, timedelta
from typing import Dict, Set, Any, Optional
from loguru import logger
import redis
from dataclasses import dataclass
from enum import Enum

# WebSocket消息类型
class MessageType(Enum):
    # 账户相关
    ACCOUNT_UPDATE = "account_update"
    POSITION_UPDATE = "position_update"
    ORDER_UPDATE = "order_update"
    
    # 行情相关
    TICK_DATA = "tick_data"
    KLINE_DATA = "kline_data"
    SYMBOL_UPDATE = "symbol_update"
    
    # 交易相关
    ORDER_REQUEST = "order_request"
    ORDER_RESULT = "order_result"
    TRADE_UPDATE = "trade_update"
    
    # 策略相关
    STRATEGY_START = "strategy_start"
    STRATEGY_STOP = "strategy_stop"
    STRATEGY_UPDATE = "strategy_update"
    
    # 系统相关
    CONNECTION_STATUS = "connection_status"
    HEARTBEAT = "heartbeat"
    ERROR = "error"

@dataclass
class WebSocketMessage:
    type: str
    data: Dict[str, Any]
    timestamp: datetime
    client_id: Optional[str] = None

class WebSocketServer:
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.subscriptions: Dict[str, Set[websockets.WebSocketServerProtocol]] = {
            'account': set(),
            'positions': set(),
            'orders': set(),
            'ticks': set(),
            'klines': set(),
            'strategies': set(),
            'system': set()
        }
        self.client_symbol_subscriptions: Dict[websockets.WebSocketServerProtocol, Set[str]] = {}
        self.running = False
        
    async def start_server(self, host: str, port: int):
        """启动WebSocket服务器"""
        try:
            self.running = True
            logger.info(f"WebSocket服务器启动: {host}:{port}")
            print(f"[DEBUG] WebSocket服务器启动: {host}:{port}")
            
            # 检查端口是否真的可以绑定
            import socket
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                try:
                    s.bind((host, port))
                    print(f"[DEBUG] 成功绑定端口: {host}:{port}")
                    s.close()
                except Exception as e:
                    print(f"[ERROR] 无法绑定端口: {e}")
                    raise
            
            async with websockets.serve(
                self.handle_client, 
                host, 
                port,
                ping_interval=30,
                ping_timeout=10
            ):
                print(f"[DEBUG] WebSocket服务器已启动，正在监听: {host}:{port}")
                logger.info(f"WebSocket服务器已启动，正在监听: {host}:{port}")
                
                # 启动心跳任务
                print("[DEBUG] 启动心跳任务")
                asyncio.create_task(self.heartbeat_task())
                
                # 启动数据推送任务
                print("[DEBUG] 启动数据推送任务")
                asyncio.create_task(self.data_pusher_task())
                
                print("[DEBUG] WebSocket服务器保持运行")
                await asyncio.Future()  # 保持运行
                
        except Exception as e:
            print(f"[ERROR] WebSocket服务器启动失败: {e}")
            logger.error(f"WebSocket服务器启动失败: {e}")
            raise
    
    async def handle_client(self, websocket):
        """处理客户端连接 - 只接受一个参数，适配当前websockets库版本"""
        # 从websocket.remote_address生成client_id
        client_id = str(websocket.remote_address)
        print(f"[DEBUG] 客户端连接: {client_id}")
        
        # 将客户端添加到clients集合
        self.clients.add(websocket)
        
        try:
            # 发送欢迎消息
            await websocket.send(json.dumps({
                "type": "welcome",
                "data": {"message": "连接成功！"},
                "timestamp": datetime.now().isoformat()
            }))
            print("[DEBUG] 已发送欢迎消息")
            
            # 消息处理循环
            while True:
                message = await websocket.recv()
                print(f"[DEBUG] 收到消息: {message}, 客户端: {client_id}")
                await self.handle_message(websocket, message, client_id)
                
        except websockets.exceptions.ConnectionClosed as e:
            print(f"[ERROR] 客户端断开连接: {client_id}, 原因: {e}")
        except Exception as e:
            print(f"[ERROR] 客户端处理错误: {e}")
        finally:
            print(f"[DEBUG] 客户端连接关闭: {websocket.remote_address}")
            self.clients.discard(websocket)
            for subscription_set in self.subscriptions.values():
                subscription_set.discard(websocket)
            if websocket in self.client_symbol_subscriptions:
                del self.client_symbol_subscriptions[websocket]
    
    async def handle_message(self, websocket: websockets.WebSocketServerProtocol, message: str, client_id: str):
        """处理客户端消息"""
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            msg_data = data.get('data', {})
            
            logger.debug(f"收到消息: {msg_type} from {client_id}")
            print(f"[DEBUG] 处理消息类型: {msg_type}，频道: {msg_data.get('channels')}")
            
            if msg_type == 'subscribe' or msg_type == 'resubscribe':
                await self.handle_subscription(websocket, msg_data)
            elif msg_type == 'unsubscribe':
                await self.handle_unsubscription(websocket, msg_data)
            elif msg_type == MessageType.ORDER_REQUEST.value:
                await self.handle_order_request(websocket, msg_data, client_id)
            elif msg_type == MessageType.STRATEGY_START.value:
                await self.handle_strategy_control(websocket, msg_data, 'start', client_id)
            elif msg_type == MessageType.STRATEGY_STOP.value:
                await self.handle_strategy_control(websocket, msg_data, 'stop', client_id)
            elif msg_type == MessageType.HEARTBEAT.value or msg_type == 'ping':
                await self.send_message(websocket, 'pong', {'status': 'ok'})
            else:
                logger.warning(f"未知消息类型: {msg_type}")
                
        except json.JSONDecodeError:
            await self.send_error(websocket, "Invalid JSON format")
        except Exception as e:
            logger.error(f"消息处理异常: {e}")
            await self.send_error(websocket, str(e))
    
    async def handle_subscription(self, websocket: websockets.WebSocketServerProtocol, data: Dict):
        """处理订阅请求"""
        channels = data.get('channels', [])
        symbol = data.get('symbol', '')
        print(f"[DEBUG] 客户端订阅频道: {channels}, 品种: {symbol}")
        
        for channel in channels:
            if channel in self.subscriptions:
                self.subscriptions[channel].add(websocket)
                logger.info(f"客户端 {websocket.remote_address} 订阅频道: {channel}")
                
                if symbol:
                    if websocket not in self.client_symbol_subscriptions:
                        self.client_symbol_subscriptions[websocket] = set()
                    self.client_symbol_subscriptions[websocket].add(symbol)
                    print(f"[DEBUG] 客户端订阅品种: {symbol}")
                
                await self.send_current_data(websocket, channel, symbol)
            else:
                logger.warning(f"未知订阅频道: {channel}")
        print(f"[DEBUG] 订阅完成，客户端订阅的频道: {[ch for ch, subs in self.subscriptions.items() if websocket in subs]}")
        
        await self.send_message(websocket, 'subscribed', {'channels': channels, 'symbol': symbol})
    
    async def handle_unsubscription(self, websocket: websockets.WebSocketServerProtocol, data: Dict):
        """处理取消订阅请求"""
        channels = data.get('channels', [])
        symbol = data.get('symbol', '')
        
        for channel in channels:
            if channel in self.subscriptions:
                self.subscriptions[channel].discard(websocket)
                logger.info(f"客户端 {websocket.remote_address} 取消订阅频道: {channel}")
        
        if symbol and websocket in self.client_symbol_subscriptions:
            self.client_symbol_subscriptions[websocket].discard(symbol)
            print(f"[DEBUG] 客户端取消订阅品种: {symbol}")
            if not self.client_symbol_subscriptions[websocket]:
                del self.client_symbol_subscriptions[websocket]
        
        await self.send_message(websocket, 'unsubscribed', {'channels': channels, 'symbol': symbol})
    
    async def handle_order_request(self, websocket: websockets.WebSocketServerProtocol, data: Dict, client_id: str):
        """处理交易请求"""
        try:
            # 这里应该调用MT5客户端的下单方法
            # 为了演示，我们模拟一个响应
            result = {
                'success': True,
                'ticket': '12345',
                'message': 'Order placed successfully'
            }
            
            await self.send_message(websocket, MessageType.ORDER_RESULT.value, result)
            
        except Exception as e:
            logger.error(f"处理交易请求异常: {e}")
            await self.send_message(websocket, MessageType.ORDER_RESULT.value, {
                'success': False,
                'error': str(e)
            })
    
    async def handle_strategy_control(self, websocket: websockets.WebSocketServerProtocol, data: Dict, action: str, client_id: str):
        """处理策略控制请求"""
        try:
            strategy_id = data.get('strategy_id')
            
            # 这里应该调用策略管理器
            result = {
                'success': True,
                'strategy_id': strategy_id,
                'action': action,
                'message': f'Strategy {action} successfully'
            }
            
            await self.send_message(websocket, MessageType.STRATEGY_UPDATE.value, result)
            
        except Exception as e:
            logger.error(f"处理策略控制异常: {e}")
            await self.send_message(websocket, MessageType.ERROR.value, {
                'error': str(e)
            })
    
    async def send_current_data(self, websocket: websockets.WebSocketServerProtocol, channel: str, symbol: str = ''):
        """发送当前数据给新订阅的客户端"""
        try:
            if not self.redis_client or not self.redis_client.ping():
                logger.warning("Redis连接不可用，发送模拟数据")
                if channel == 'account':
                    mock_account = {
                        'balance': 10000.0,
                        'equity': 10050.0,
                        'margin': 200.0,
                        'free_margin': 9850.0,
                        'margin_level': 5025.0,
                        'currency': 'USD'
                    }
                    await self.send_message(websocket, MessageType.ACCOUNT_UPDATE.value, mock_account)
                elif channel == 'positions':
                    mock_positions = {
                        'positions': []
                    }
                    await self.send_message(websocket, MessageType.POSITION_UPDATE.value, mock_positions)
                return
            
            if channel == 'account':
                account_data = self.redis_client.get('current_account_info')
                if account_data:
                    await self.send_message(websocket, MessageType.ACCOUNT_UPDATE.value, json.loads(account_data))
                else:
                    mock_account = {
                        'balance': 10000.0,
                        'equity': 10050.0,
                        'margin': 200.0,
                        'free_margin': 9850.0,
                        'margin_level': 5025.0,
                        'currency': 'USD'
                    }
                    await self.send_message(websocket, MessageType.ACCOUNT_UPDATE.value, mock_account)
            
            elif channel == 'positions':
                positions_data = self.redis_client.get('current_positions')
                if positions_data:
                    await self.send_message(websocket, MessageType.POSITION_UPDATE.value, json.loads(positions_data))
                else:
                    mock_positions = {
                        'positions': []
                    }
                    await self.send_message(websocket, MessageType.POSITION_UPDATE.value, mock_positions)
            
            elif channel == 'ticks':
                if symbol:
                    tick_data = self.redis_client.get(f'tick:{symbol}')
                    if tick_data:
                        await self.send_message(websocket, MessageType.TICK_DATA.value, json.loads(tick_data))
                else:
                    symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD']
                    for sym in symbols:
                        tick_data = self.redis_client.get(f'tick:{sym}')
                        if tick_data:
                            await self.send_message(websocket, MessageType.TICK_DATA.value, json.loads(tick_data))
            
        except redis.ConnectionError:
            logger.error("Redis连接错误，无法获取数据")
            if channel == 'account':
                mock_account = {
                    'balance': 10000.0,
                    'equity': 10050.0,
                    'margin': 200.0,
                    'free_margin': 9850.0,
                    'margin_level': 5025.0,
                    'currency': 'USD'
                }
                await self.send_message(websocket, MessageType.ACCOUNT_UPDATE.value, mock_account)
        except Exception as e:
            logger.error(f"发送当前数据异常: {e}")
    
    async def broadcast_to_channel(self, channel: str, msg_type: str, data: Dict):
        """向频道广播消息"""
        if channel not in self.subscriptions:
            return
        
        message = self.create_message(msg_type, data)
        disconnected = set()
        
        for websocket in self.subscriptions[channel]:
            try:
                await websocket.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
            except Exception as e:
                logger.error(f"广播消息异常: {e}")
                disconnected.add(websocket)
        
        # 清理断开的连接
        for websocket in disconnected:
            self.subscriptions[channel].discard(websocket)
            self.clients.discard(websocket)
    
    async def send_message(self, websocket: websockets.WebSocketServerProtocol, msg_type: str, data: Dict):
        """发送消息给指定客户端"""
        try:
            message = self.create_message(msg_type, data)
            await websocket.send(message)
        except websockets.exceptions.ConnectionClosed:
            self.clients.discard(websocket)
        except Exception as e:
            logger.error(f"发送消息异常: {e}")
    
    async def send_error(self, websocket: websockets.WebSocketServerProtocol, error: str):
        """发送错误消息"""
        await self.send_message(websocket, MessageType.ERROR.value, {'error': error})
    
    def create_message(self, msg_type: str, data: Dict) -> str:
        """创建WebSocket消息"""
        message = WebSocketMessage(
            type=msg_type,
            data=data,
            timestamp=datetime.now()
        )
        return json.dumps({
            'type': message.type,
            'data': message.data,
            'timestamp': message.timestamp.isoformat()
        }, ensure_ascii=False)
    
    async def heartbeat_task(self):
        """心跳任务"""
        while self.running:
            try:
                # 向所有客户端发送心跳
                disconnected = set()
                for websocket in self.clients:
                    try:
                        await websocket.ping()
                    except websockets.exceptions.ConnectionClosed:
                        disconnected.add(websocket)
                    except Exception:
                        disconnected.add(websocket)
                
                # 清理断开的连接
                for websocket in disconnected:
                    self.clients.discard(websocket)
                    for subscription_set in self.subscriptions.values():
                        subscription_set.discard(websocket)
                
                await asyncio.sleep(30)  # 每30秒检查一次
                
            except Exception as e:
                logger.error(f"心跳任务异常: {e}")
                await asyncio.sleep(5)
    
    async def data_pusher_task(self):
        """数据推送任务"""
        while self.running:
            try:
                # 检查Redis连接
                if not self.redis_client or not self.redis_client.ping():
                    logger.warning("Redis连接不可用，跳过数据推送")
                    await asyncio.sleep(5)
                    continue
                
                logger.debug("开始数据推送任务")
                
                # 推送账户更新
                await self.push_account_updates()
                
                # 推送持仓更新
                await self.push_position_updates()
                
                # 推送行情数据
                await self.push_market_data()
                
                logger.debug("数据推送任务完成，等待下一次执行")
                await asyncio.sleep(0.3)
                
            except redis.ConnectionError:
                logger.error("Redis连接错误，将在5秒后重试")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"数据推送任务异常: {e}")
                await asyncio.sleep(5)
    
    async def push_account_updates(self):
        """推送账户更新"""
        try:
            account_data = self.redis_client.get('current_account_info')
            if account_data:
                data = json.loads(account_data)
                last_update = data.get('last_update', 0)
                current_time = datetime.now().timestamp()
                
                logger.debug(f"账户数据检查: last_update={last_update}, current_time={current_time}, diff={current_time - last_update}")
                
                if current_time - last_update < 5:
                    if 'account' in self.subscriptions and len(self.subscriptions['account']) > 0:
                        logger.info(f"推送账户更新到 {len(self.subscriptions['account'])} 个客户端")
                        await self.broadcast_to_channel('account', MessageType.ACCOUNT_UPDATE.value, data)
                    else:
                        logger.debug("没有客户端订阅账户频道")
                    
        except Exception as e:
            logger.error(f"推送账户更新异常: {e}")
    
    async def push_position_updates(self):
        """推送持仓更新"""
        try:
            positions_data = self.redis_client.get('current_positions')
            if positions_data:
                data = json.loads(positions_data)
                last_update = data.get('last_update', 0)
                current_time = datetime.now().timestamp()
                
                logger.debug(f"持仓数据检查: last_update={last_update}, current_time={current_time}, diff={current_time - last_update}")
                
                if current_time - last_update < 5:
                    if 'positions' in self.subscriptions and len(self.subscriptions['positions']) > 0:
                        logger.info(f"推送持仓更新到 {len(self.subscriptions['positions'])} 个客户端")
                        await self.broadcast_to_channel('positions', MessageType.POSITION_UPDATE.value, data)
                    else:
                        logger.debug("没有客户端订阅持仓频道")
                    
        except Exception as e:
            logger.error(f"推送持仓更新异常: {e}")
    
    async def push_market_data(self):
        """推送行情数据 - 只推送给订阅了特定品种的客户端"""
        try:
            symbol_clients: Dict[str, Set[websockets.WebSocketServerProtocol]] = {}
            
            for client, symbols in self.client_symbol_subscriptions.items():
                for sym in symbols:
                    if sym not in symbol_clients:
                        symbol_clients[sym] = set()
                    symbol_clients[sym].add(client)
            
            for symbol, clients in symbol_clients.items():
                tick_data = self.redis_client.get(f'tick:{symbol}')
                if tick_data:
                    data = json.loads(tick_data)
                    data['symbol'] = symbol
                    
                    logger.debug(f"准备推送{symbol}的tick数据到 {len(clients)} 个客户端")
                    
                    message = self.create_message(MessageType.TICK_DATA.value, data)
                    disconnected = set()
                    
                    for websocket in clients:
                        try:
                            if websocket in self.clients:
                                await websocket.send(message)
                        except websockets.exceptions.ConnectionClosed:
                            disconnected.add(websocket)
                        except Exception as e:
                            logger.error(f"推送tick数据异常: {e}")
                            disconnected.add(websocket)
                    
                    for ws in disconnected:
                        self.clients.discard(ws)
                        if ws in self.client_symbol_subscriptions:
                            del self.client_symbol_subscriptions[ws]
                        for sub_set in self.subscriptions.values():
                            sub_set.discard(ws)
                    
                    logger.debug(f"成功推送{symbol}的tick数据")
                        
        except Exception as e:
            logger.error(f"推送行情数据异常: {e}")
    
    def stop(self):
        """停止WebSocket服务器"""
        self.running = False
        logger.info("WebSocket服务器停止")


if __name__ == '__main__':
    import redis
    from config import Config
    
    config = Config()
    
    redis_client = redis.from_url(config.REDIS_URL, decode_responses=True)
    
    server = WebSocketServer(redis_client)
    
    print(f"启动WebSocket服务器: {config.WS_HOST}:{config.WS_PORT}")
    
    try:
        asyncio.run(server.start_server(config.WS_HOST, config.WS_PORT))
    except KeyboardInterrupt:
        print("WebSocket服务器停止")
        server.stop()
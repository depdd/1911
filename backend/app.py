import asyncio
import json
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from loguru import logger
import redis
import threading
from concurrent.futures import ThreadPoolExecutor

from config import get_config
from models import DatabaseManager, model_to_dict
from mt5_client import mt5_client
from websocket_server import WebSocketServer
from api.dashboard import dashboard_bp
from api.market import market_bp
from api.strategy import strategy_bp
from api.analytics import analytics_bp
from api.settings import settings_bp
from api.auth import init_auth_blueprint
from api.user_accounts import init_accounts_blueprint
from api.user_strategies import init_user_strategies_blueprint
from api.payment import init_payment_blueprint
from api.legal import init_legal_blueprint
from api.risk import init_risk_blueprint

# 配置和初始化
config = get_config()
app = Flask(__name__)
app.config.from_object(config)

# 启用CORS，允许所有来源
CORS(app)

# 初始化数据库
db_manager = DatabaseManager(config.DATABASE_URL)
app.config['db_manager'] = db_manager

# 初始化Redis
redis_client = redis.from_url(config.REDIS_URL, decode_responses=True)

# 初始化WebSocket服务器
websocket_server = WebSocketServer(redis_client)

# 线程池执行器
executor = ThreadPoolExecutor(max_workers=10)

# 配置日志
logger.add(
    config.LOG_FILE,
    level=config.LOG_LEVEL,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name} | {message}",
    rotation="1 day",
    retention="7 days"
)

# 注册蓝图
app.register_blueprint(dashboard_bp)
app.register_blueprint(market_bp)
app.register_blueprint(strategy_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(settings_bp)

# 注册用户系统蓝图
auth_bp = init_auth_blueprint(lambda: db_manager.get_session())
app.register_blueprint(auth_bp, url_prefix='/api/auth')

accounts_bp = init_accounts_blueprint(lambda: db_manager.get_session())
app.register_blueprint(accounts_bp, url_prefix='/api/accounts')

user_strategies_bp = init_user_strategies_blueprint(lambda: db_manager.get_session())
app.register_blueprint(user_strategies_bp, url_prefix='/api/user-strategies')

payment_bp = init_payment_blueprint(lambda: db_manager.get_session())
app.register_blueprint(payment_bp, url_prefix='/api/payment')

legal_bp = init_legal_blueprint(lambda: db_manager.get_session())
app.register_blueprint(legal_bp, url_prefix='/api/legal')

risk_bp = init_risk_blueprint(lambda: db_manager.get_session())
app.register_blueprint(risk_bp, url_prefix='/api/risk')

@app.route('/')
def index():
    """主页"""
    return jsonify({
        'message': 'Forex Quantitative Trading Platform API',
        'version': '1.0.0',
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/health')
def health_check():
    """健康检查"""
    try:
        session = db_manager.get_session()
        session.execute('SELECT 1')
        session.close()
        
        redis_client.ping()
        
        mt5_status = mt5_client.connected
        
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'redis': 'connected',
            'mt5': 'connected' if mt5_status else 'disconnected',
            'websocket_clients': len(websocket_server.clients),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/server-time')
def server_time():
    """获取服务器时间"""
    return jsonify({
        'server_time': datetime.now().isoformat(),
        'timestamp': datetime.now().timestamp()
    })

# MT5连接管理API
@app.route('/api/mt5/connect', methods=['POST'])
def mt5_connect():
    """连接MT5账户"""
    try:
        data = request.get_json()
        login = data.get('login')
        password = data.get('password')
        server = data.get('server')
        
        if not all([login, password, server]):
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # 初始化MT5
        success = asyncio.run(mt5_client.initialize())
        if not success:
            return jsonify({'error': 'MT5 initialization failed'}), 500
        
        # 登录账户
        login_success = asyncio.run(mt5_client.login(login, password, server))
        if not login_success:
            return jsonify({'error': 'Login failed'}), 401
        
        # 更新Redis中的连接状态
        redis_client.setex('mt5_connection_status', 300, 'connected')
        redis_client.setex('current_account_login', 300, str(login))
        
        # 获取账户信息
        account_info = asyncio.run(mt5_client.get_account_info())
        if account_info:
            account_info['last_update'] = datetime.now().timestamp()
            redis_client.setex('current_account_info', 300, json.dumps(account_info))
        
        # 广播连接状态更新
        asyncio.run(websocket_server.broadcast_to_channel(
            'system', 
            'connection_status', 
            {'status': 'connected', 'account': login}
        ))
        
        return jsonify({
            'success': True,
            'message': 'Connected successfully',
            'account_info': account_info
        })
        
    except Exception as e:
        logger.error(f"MT5连接失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/disconnect', methods=['POST'])
def mt5_disconnect():
    """断开MT5连接"""
    try:
        asyncio.run(mt5_client.logout())
        redis_client.delete('mt5_connection_status')
        redis_client.delete('current_account_info')
        redis_client.delete('current_account_login')
        
        # 广播断开状态
        asyncio.run(websocket_server.broadcast_to_channel(
            'system',
            'connection_status',
            {'status': 'disconnected'}
        ))
        
        return jsonify({'success': True, 'message': 'Disconnected successfully'})
        
    except Exception as e:
        logger.error(f"MT5断开连接失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/status')
def mt5_status():
    """获取MT5连接状态"""
    try:
        status = redis_client.get('mt5_connection_status') or 'disconnected'
        account_info = redis_client.get('current_account_info')
        account_login = redis_client.get('current_account_login')
        
        return jsonify({
            'status': status,
            'account_info': json.loads(account_info) if account_info else None,
            'account_login': account_login,
            'connected': status == 'connected'
        })
        
    except Exception as e:
        logger.error(f"获取MT5状态失败: {e}")
        return jsonify({'error': str(e)}), 500

# 账户信息API
@app.route('/api/account/info')
def get_account_info():
    """获取账户信息"""
    try:
        # 获取当前连接的账户
        account_login = redis_client.get('current_account_login')
        logger.info(f"获取账户信息: {account_login}")
        
        account_info = asyncio.run(mt5_client.get_account_info())
        if account_info:
            return jsonify(account_info)
        else:
            return jsonify({'error': 'Failed to get account info'}), 500
            
    except Exception as e:
        logger.error(f"获取账户信息失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/account/summary')
def get_account_summary():
    """获取账户摘要统计"""
    try:
        account_info = asyncio.run(mt5_client.get_account_info())
        if not account_info:
            return jsonify({'error': 'Failed to get account info'}), 500
        
        # 计算一些基本统计信息
        positions = asyncio.run(mt5_client.get_positions())
        total_profit = sum(pos['profit'] for pos in positions)
        
        summary = {
            'balance': account_info['balance'],
            'equity': account_info['equity'],
            'margin': account_info['margin'],
            'free_margin': account_info['free_margin'],
            'margin_level': account_info['margin_level'],
            'total_positions': len(positions),
            'total_profit': total_profit,
            'currency': account_info['currency']
        }
        
        return jsonify(summary)
        
    except Exception as e:
        logger.error(f"获取账户摘要失败: {e}")
        return jsonify({'error': str(e)}), 500

# 持仓管理API
@app.route('/api/positions')
def get_positions():
    """获取当前持仓"""
    try:
        # 获取当前连接的账户
        account_login = redis_client.get('current_account_login')
        logger.info(f"获取持仓信息: {account_login}")
        
        # 尝试从Redis获取缓存数据
        cached_data = redis_client.get('current_positions')
        if cached_data and not config.DEBUG:
            cached = json.loads(cached_data)
            # 检查缓存是否过期（超过30秒）
            cache_age = datetime.now().timestamp() - cached.get('last_update', 0)
            if cache_age < 30:
                logger.info(f"使用缓存的持仓数据，缓存时间: {cache_age:.1f}秒")
                return jsonify({'positions': cached['positions']})
        
        # 从MT5获取最新持仓数据
        positions = asyncio.run(mt5_client.get_positions())
        
        # 增强日志记录
        logger.info(f"获取到{len(positions)}个持仓")
        if positions:
            logger.debug(f"第一个持仓样本: {positions[0]['ticket']} {positions[0]['symbol']} {positions[0]['volume']}")
        
        # 缓存到Redis
        redis_client.setex('current_positions', 60, json.dumps({
            'positions': positions,
            'last_update': datetime.now().timestamp()
        }))
        
        return jsonify({'positions': positions})
        
    except Exception as e:
        logger.error(f"获取持仓失败: {e}")
        # 出错时尝试返回缓存数据
        cached_data = redis_client.get('current_positions')
        if cached_data:
            try:
                cached = json.loads(cached_data)
                logger.warning("返回缓存的持仓数据")
                return jsonify({'positions': cached['positions'], 'from_cache': True})
            except:
                pass
        
        return jsonify({'error': str(e)}), 500

@app.route('/api/positions/<ticket>/close', methods=['POST'])
def close_position(ticket):
    """平仓指定持仓"""
    try:
        result = asyncio.run(mt5_client.close_position(ticket))
        
        if result['success']:
            # 清除缓存，确保下次获取最新数据
            redis_client.delete('current_positions')
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"平仓失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/positions/close_all', methods=['POST'])
def close_all_positions():
    """平仓所有持仓"""
    try:
        positions = asyncio.run(mt5_client.get_positions())
        results = []
        
        for position in positions:
            result = asyncio.run(mt5_client.close_position(str(position['ticket'])))
            results.append({
                'ticket': position['ticket'],
                'symbol': position['symbol'],
                'result': result
            })
        
        # 清除缓存
        redis_client.delete('current_positions')
        
        return jsonify({
            'success': True,
            'closed_positions': len(results),
            'results': results
        })
        
    except Exception as e:
        logger.error(f"全部平仓失败: {e}")
        return jsonify({'error': str(e)}), 500

# 订单管理API
@app.route('/api/orders')
def get_orders():
    """获取当前订单"""
    try:
        orders = asyncio.run(mt5_client.get_orders())
        return jsonify({'orders': orders})
        
    except Exception as e:
        logger.error(f"获取订单失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/history')
def get_orders_history():
    """获取历史订单"""
    try:
        days = request.args.get('days', 30, type=int)
        date_from = datetime.now() - timedelta(days=days)
        date_to = datetime.now()
        
        orders = asyncio.run(mt5_client.get_history_orders(date_from, date_to))
        deals = asyncio.run(mt5_client.get_history_deals(date_from, date_to))
        
        return jsonify({
            'orders': orders,
            'deals': deals,
            'period_days': days
        })
        
    except Exception as e:
        logger.error(f"获取历史订单失败: {e}")
        return jsonify({'error': str(e)}), 500

# 交易操作API
@app.route('/api/trade/order', methods=['POST'])
def place_order():
    """下单"""
    try:
        logger.info("===== 收到交易请求开始 =====")
        # 记录完整请求信息
        logger.info(f"请求头: {dict(request.headers)}")
        
        # 获取请求数据
        data = request.get_json()
        logger.info(f"交易请求数据完整内容: {data}")
        
        # 验证请求数据
        if data is None:
            logger.error("请求数据为空，无法处理")
            return jsonify({'error': 'Request body is required'}), 400
        
        required_fields = ['symbol', 'type', 'volume']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            logger.error(f"缺少必填字段: {missing_fields}")
            return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400
        
        # 验证字段类型
        try:
            volume = float(data['volume'])
            price = float(data.get('price', 0))
            sl = float(data.get('sl', 0))
            tp = float(data.get('tp', 0))
            magic_number = int(data.get('magic_number', 0))
        except ValueError as val_err:
            logger.error(f"字段类型错误: {val_err}")
            return jsonify({'error': f'Invalid number format: {str(val_err)}'}), 400
        
        logger.info(f"准备调用MT5下单: 品种={data['symbol']}, 类型={data['type']}, 手数={volume}")
        
        # 检查MT5连接状态
        if not mt5_client.connected:
            logger.error("MT5客户端未连接")
            return jsonify({'error': 'MT5 client not connected'}), 500
        
        # 检查交易品种是否可用
        if data['symbol'] not in mt5_client.symbols:
            logger.warning(f"交易品种 {data['symbol']} 不在可用列表中")
        
        # 调用MT5客户端下单
        result = asyncio.run(mt5_client.place_order(
            symbol=data['symbol'],
            order_type=data['type'],
            volume=volume,
            price=price,
            sl=sl,
            tp=tp,
            comment=data.get('comment', 'Web Order'),
            magic_number=magic_number
        ))
        
        logger.info(f"MT5下单结果: {result}")
        
        if result.get('success'):
            logger.info(f"下单成功，订单号: {result.get('ticket')}")
            # 广播交易更新
            try:
                asyncio.run(websocket_server.broadcast_to_channel(
                    'system',
                    'trade_update',
                    {
                        'action': 'order_placed',
                        'ticket': result.get('ticket'),
                        'symbol': data['symbol'],
                        'type': data['type'],
                        'volume': volume
                    }
                ))
            except Exception as ws_error:
                logger.warning(f"WebSocket广播失败: {ws_error}")
            
            return jsonify(result)
        else:
            error_msg = result.get('error', 'Unknown error')
            retcode = result.get('retcode', 'Unknown')
            logger.error(f"下单失败: 错误信息={error_msg}, 返回码={retcode}")
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"下单异常: {e}", exc_info=True)
        # 记录详细的异常堆栈
        import traceback
        logger.error(f"异常堆栈: {traceback.format_exc()}")
        return jsonify({'error': f'Internal error: {str(e)}'}), 500
    finally:
        logger.info("===== 交易请求处理结束 =====")

# 市场数据API
@app.route('/api/market/tick/<symbol>')
def get_tick_data(symbol):
    """获取指定品种的tick数据"""
    try:
        tick_data = asyncio.run(mt5_client.get_tick_data(symbol))
        
        if tick_data:
            # 缓存到Redis
            redis_client.setex(f'tick:{symbol}', 60, json.dumps(tick_data))
            return jsonify(tick_data)
        else:
            return jsonify({'error': f'Failed to get tick data for {symbol}'}), 404
            
    except Exception as e:
        logger.error(f"获取tick数据失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/history/<symbol>/<timeframe>')
def get_market_history(symbol, timeframe):
    """获取历史K线数据"""
    try:
        count = request.args.get('count', 1000, type=int)
        
        df = asyncio.run(mt5_client.get_historical_data(symbol, timeframe, count))
        
        if df is not None:
            # 转换为JSON格式
            data = df.to_dict('records')
            for record in data:
                if 'time' in record:
                    record['time'] = record['time'].isoformat()
            
            return jsonify({
                'symbol': symbol,
                'timeframe': timeframe,
                'data': data,
                'count': len(data)
            })
        else:
            return jsonify({'error': f'Failed to get historical data for {symbol}'}), 404
            
    except Exception as e:
        logger.error(f"获取历史数据失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/symbols')
def get_symbols():
    """获取可用交易品种"""
    try:
        symbols = mt5_client.symbols
        
        if not symbols:
            # 如果缓存为空，尝试更新
            asyncio.run(mt5_client.update_symbols())
            symbols = mt5_client.symbols
        
        return jsonify({'symbols': symbols})
        
    except Exception as e:
        logger.error(f"获取交易品种失败: {e}")
        return jsonify({'error': str(e)}), 500

# 数据分析API
@app.route('/api/analytics/summary')
def get_analytics_summary():
    """获取交易分析摘要"""
    try:
        days = request.args.get('days', 30, type=int)
        date_from = datetime.now() - timedelta(days=days)
        date_to = datetime.now()
        
        # 获取历史交易数据
        deals = asyncio.run(mt5_client.get_history_deals(date_from, date_to))
        
        if not deals:
            return jsonify({
                'total_trades': 0,
                'total_profit': 0,
                'win_rate': 0,
                'profit_factor': 0,
                'max_drawdown': 0,
                'sharpe_ratio': 0
            })
        
        # 计算统计指标
        total_trades = len(deals)
        profitable_trades = len([d for d in deals if d['profit'] > 0])
        losing_trades = len([d for d in deals if d['profit'] < 0])
        
        total_profit = sum(d['profit'] for d in deals)
        gross_profit = sum(d['profit'] for d in deals if d['profit'] > 0)
        gross_loss = abs(sum(d['profit'] for d in deals if d['profit'] < 0))
        
        win_rate = (profitable_trades / total_trades * 100) if total_trades > 0 else 0
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else float('inf')
        
        # 计算最大回撤（简化版本）
        cumulative_profit = 0
        max_profit = 0
        max_drawdown = 0
        
        for deal in sorted(deals, key=lambda x: x['trade_time']):
            cumulative_profit += deal['profit']
            max_profit = max(max_profit, cumulative_profit)
            drawdown = max_profit - cumulative_profit
            max_drawdown = max(max_drawdown, drawdown)
        
        # 计算夏普比率（简化版本）
        returns = [d['profit'] for d in deals]
        if len(returns) > 1:
            avg_return = np.mean(returns)
            std_return = np.std(returns)
            sharpe_ratio = (avg_return / std_return) if std_return > 0 else 0
        else:
            sharpe_ratio = 0
        
        return jsonify({
            'total_trades': total_trades,
            'profitable_trades': profitable_trades,
            'losing_trades': losing_trades,
            'total_profit': total_profit,
            'gross_profit': gross_profit,
            'gross_loss': gross_loss,
            'win_rate': round(win_rate, 2),
            'profit_factor': round(profit_factor, 2),
            'max_drawdown': round(max_drawdown, 2),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'period_days': days
        })
        
    except Exception as e:
        logger.error(f"获取分析摘要失败: {e}")
        return jsonify({'error': str(e)}), 500

# 启动函数
def run_websocket_server():
    """运行WebSocket服务器"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(websocket_server.start_server(config.WS_HOST, config.WS_PORT))

def start_data_updater():
    """启动数据更新器"""
    def update_data():
        while True:
            try:
                # 如果MT5已连接，更新数据
                if mt5_client.connected:
                    # 更新账户信息
                    account_info = asyncio.run(mt5_client.get_account_info())
                    if account_info:
                        account_info['last_update'] = datetime.now().timestamp()
                        redis_client.setex('current_account_info', 300, json.dumps(account_info))
                    
                    # 更新持仓信息
                    positions = asyncio.run(mt5_client.get_positions())
                    if positions:
                        redis_client.setex('current_positions', 60, json.dumps({
                            'positions': positions,
                            'last_update': datetime.now().timestamp()
                        }))
                    
                    # 更新主要货币对和加密货币的tick数据
                    symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD']
                    for symbol in symbols:
                        try:
                            tick_data = asyncio.run(mt5_client.get_tick_data(symbol))
                            if tick_data:
                                # 调整BTCUSD的时间戳，使其与其他品种保持一致
                                if symbol == 'BTCUSD' and 'time' in tick_data:
                                    # 获取当前时间
                                    current_time = datetime.now().timestamp()
                                    # 如果BTCUSD的时间戳与当前时间相差超过3600秒（1小时），使用当前时间
                                    if abs(tick_data['time'] - current_time) > 3600:
                                        tick_data['time'] = int(current_time)
                                
                                redis_client.setex(f'tick:{symbol}', 60, json.dumps(tick_data))
                                logger.info(f"成功更新{symbol}的tick数据: {tick_data}")
                            else:
                                logger.warning(f"无法获取{symbol}的tick数据")
                        except Exception as e:
                            logger.error(f"更新{symbol}的tick数据失败: {e}")
                
                # 每5秒更新一次
                import time
                time.sleep(5)
                
            except Exception as e:
                logger.error(f"数据更新器异常: {e}")
                import time
                time.sleep(10)
    
    thread = threading.Thread(target=update_data, daemon=True)
    thread.start()

if __name__ == '__main__':
    try:
        # 初始化MT5客户端
        asyncio.run(mt5_client.initialize())
        
        # WebSocket服务器将通过独立脚本启动
        print(f"WebSocket服务器将通过独立脚本启动: {config.WS_HOST}:{config.WS_PORT}")
        
        # 启动数据更新器
        start_data_updater()
        
        # 启动Flask应用
        logger.info(f"Flask应用启动: {config.WS_HOST}:5000")
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=config.DEBUG,
            threaded=True
        )
        
    except KeyboardInterrupt:
        logger.info("应用停止")
    except Exception as e:
        logger.error(f"应用启动失败: {e}")
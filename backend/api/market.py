from flask import Blueprint, jsonify, request
from loguru import logger

from mt5_client import mt5_client

market_bp = Blueprint('market', __name__)

@market_bp.route('/api/market/symbols')
def get_symbols():
    """获取可用交易品种"""
    try:
        symbols = mt5_client.symbols
        
        if not symbols:
            # 尝试更新符号列表
            mt5_client.update_symbols()
            symbols = mt5_client.symbols
        
        # 分类符号
        forex_pairs = [s for s in symbols if len(s) == 6 and s.endswith('USD')]
        commodities = [s for s in symbols if s.startswith('XAU') or s.startswith('XAG')]
        indices = [s for s in symbols if s.startswith('IDX')]
        cryptocurrencies = [s for s in symbols if s.startswith('BTC') or s.startswith('ETH')]
        
        return jsonify({
            'success': True,
            'data': {
                'all_symbols': symbols,
                'forex_pairs': forex_pairs,
                'commodities': commodities,
                'indices': indices,
                'cryptocurrencies': cryptocurrencies,
                'total_count': len(symbols)
            }
        })
        
    except Exception as e:
        logger.error(f"获取交易品种失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@market_bp.route('/api/market/tick/<symbol>')
def get_tick_data(symbol: str):
    """获取指定品种的tick数据"""
    try:
        tick_data = mt5_client.get_tick_data(symbol)
        
        if tick_data:
            # 计算额外信息
            spread = (tick_data['ask'] - tick_data['bid']) * 10000  # 转换为点
            mid_price = (tick_data['bid'] + tick_data['ask']) / 2
            
            enhanced_data = {
                **tick_data,
                'spread_points': round(spread, 1),
                'mid_price': round(mid_price, 5),
                'symbol': symbol
            }
            
            return jsonify({
                'success': True,
                'data': enhanced_data
            })
        else:
            return jsonify({
                'success': False,
                'error': f'无法获取 {symbol} 的tick数据'
            }), 404
            
    except Exception as e:
        logger.error(f"获取tick数据失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@market_bp.route('/api/market/history/<symbol>/<timeframe>')
async def get_historical_data(symbol: str, timeframe: str):
    """获取历史K线数据"""
    try:
        count = request.args.get('count', 1000, type=int)
        
        df = await mt5_client.get_historical_data(symbol, timeframe, count)
        
        if df is not None:
            data = df.to_dict('records')
            
            for record in data:
                if 'time' in record:
                    if hasattr(record['time'], 'timestamp'):
                        record['time'] = int(record['time'].timestamp())
                    else:
                        record['time'] = int(record['time'])
            
            return jsonify({
                'success': True,
                'data': {
                    'symbol': symbol,
                    'timeframe': timeframe,
                    'data': data,
                    'count': len(data)
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': f'无法获取 {symbol} 的历史数据'
            }), 404
            
    except Exception as e:
        logger.error(f"获取历史数据失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@market_bp.route('/api/market/dom/<symbol>')
def get_market_depth(symbol: str):
    """获取市场深度数据"""
    try:
        # 这里应该实现获取市场深度的逻辑
        # 由于MT5 Python API的限制，这里返回模拟数据
        
        # 获取当前价格
        tick_data = mt5_client.get_tick_data(symbol)
        if not tick_data:
            return jsonify({
                'success': False,
                'error': f'无法获取 {symbol} 的市场深度'
            }), 404
        
        current_bid = tick_data['bid']
        current_ask = tick_data['ask']
        
        # 生成模拟的市场深度数据
        bids = []
        asks = []
        
        # 买单深度 (5档)
        for i in range(5):
            price = current_bid - (i + 1) * 0.0001  # 每档1点
            volume = max(0.1, 5 - i * 0.8)  # 递减的成交量
            bids.append({
                'price': round(price, 5),
                'volume': round(volume, 2)
            })
        
        # 卖单深度 (5档)
        for i in range(5):
            price = current_ask + (i + 1) * 0.0001  # 每档1点
            volume = max(0.1, 5 - i * 0.8)  # 递减的成交量
            asks.append({
                'price': round(price, 5),
                'volume': round(volume, 2)
            })
        
        market_depth = {
            'symbol': symbol,
            'current_bid': current_bid,
            'current_ask': current_ask,
            'spread': round((current_ask - current_bid) * 10000, 1),
            'bids': bids,
            'asks': asks,
            'timestamp': tick_data['time']
        }
        
        return jsonify({
            'success': True,
            'data': market_depth
        })
        
    except Exception as e:
        logger.error(f"获取市场深度失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@market_bp.route('/api/market/info/<symbol>')
def get_symbol_info(symbol: str):
    """获取品种详细信息"""
    try:
        import MetaTrader5 as mt5
        
        symbol_info = mt5.symbol_info(symbol)
        
        if symbol_info is None:
            return jsonify({
                'success': False,
                'error': f'品种 {symbol} 不存在'
            }), 404
        
        info_data = {
            'name': symbol_info.name,
            'description': symbol_info.description,
            'currency_base': symbol_info.currency_base,
            'currency_profit': symbol_info.currency_profit,
            'currency_margin': symbol_info.currency_margin,
            'digits': symbol_info.digits,
            'point': symbol_info.point,
            'trade_mode': symbol_info.trade_mode,
            'spread': symbol_info.spread,
            'spread_float': symbol_info.spread_float,
            'ticks_bookdepth': symbol_info.ticks_bookdepth,
            'trade_calc_mode': symbol_info.trade_calc_mode,
            'trade_mode': symbol_info.trade_mode,
            'start_time': symbol_info.start_time,
            'expiration_time': symbol_info.expiration_time,
            'trade_stops_level': symbol_info.trade_stops_level,
            'trade_freeze_level': symbol_info.trade_freeze_level,
            'trade_exemode': symbol_info.trade_exemode,
            'swap_mode': symbol_info.swap_mode,
            'swap_long': symbol_info.swap_long,
            'swap_short': symbol_info.swap_short,
            'swap_rollover3days': symbol_info.swap_rollover3days,
            'contract_size': symbol_info.contract_size,
            'volume_min': symbol_info.volume_min,
            'volume_max': symbol_info.volume_max,
            'volume_step': symbol_info.volume_step,
            'volume_limit': symbol_info.volume_limit,
            'margin_initial': symbol_info.margin_initial,
            'margin_maintenance': symbol_info.margin_maintenance,
            'margin_long': symbol_info.margin_long,
            'margin_short': symbol_info.margin_short,
            'margin_limit': symbol_info.margin_limit,
            'margin_stop': symbol_info.margin_stop,
            'margin_stop_limit': symbol_info.margin_stop_limit,
            'session_deals': symbol_info.session_deals,
            'session_turnover': symbol_info.session_turnover,
            'session_interest': symbol_info.session_interest,
            'session_buy_orders': symbol_info.session_buy_orders,
            'session_sell_orders': symbol_info.session_sell_orders,
            'session_volume': symbol_info.session_volume,
            'session_price': symbol_info.session_price,
            'session_price_settlement': symbol_info.session_price_settlement,
            'session_price_limit_min': symbol_info.session_price_limit_min,
            'session_price_limit_max': symbol_info.session_price_limit_max,
            'margin_hedged': symbol_info.margin_hedged,
            'price_change': symbol_info.price_change,
            'price_volatility': symbol_info.price_volatility,
            'price_theoretical': symbol_info.price_theoretical,
            'price_greeks_delta': symbol_info.price_greeks_delta,
            'price_greeks_theta': symbol_info.price_greeks_theta,
            'price_greeks_gamma': symbol_info.price_greeks_gamma,
            'price_greeks_vega': symbol_info.price_greeks_vega,
            'price_greeks_rho': symbol_info.price_greeks_rho,
            'volume_real': symbol_info.volume_real,
            'volume_today': symbol_info.volume_today,
            'volume_average': symbol_info.volume_average,
            'volume_exchange': symbol_info.volume_exchange
        }
        
        return jsonify({
            'success': True,
            'data': info_data
        })
        
    except Exception as e:
        logger.error(f"获取品种信息失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
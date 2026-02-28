from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from loguru import logger
from typing import Dict, List, Optional
import asyncio

from models import DatabaseManager, model_to_dict
from mt5_client import mt5_client
from strategies.ma_cross import ma_cross_manager

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard/summary')
def get_dashboard_summary():
    """获取仪表板摘要信息"""
    try:
        # 获取账户信息和持仓信息（使用asyncio.run运行异步函数）
        account_info = asyncio.run(mt5_client.get_account_info())
        
        if not mt5_client.connected or not account_info:
            return jsonify({
                'success': False,
                'error': 'MT5 not connected'
            }), 400
        
        # 获取当前持仓
        positions = asyncio.run(mt5_client.get_positions())
        
        # 计算统计数据
        total_positions = len(positions)
        total_profit = sum(pos['profit'] for pos in positions)
        total_volume = sum(pos['volume'] for pos in positions)
        
        # 获取策略运行状态
        active_strategies = len([
            strategy for strategy in ma_cross_manager.strategies.values()
            if strategy.is_strategy_running()
        ])
        
        summary = {
            'account': {
                'login': account_info.login,
                'balance': account_info.balance,
                'equity': account_info.equity,
                'margin': account_info.margin,
                'free_margin': account_info.margin_free,
                'margin_level': account_info.margin_level,
                'currency': account_info.currency,
                'profit': account_info.profit
            },
            'positions': {
                'total': total_positions,
                'total_volume': round(total_volume, 2),
                'total_profit': round(total_profit, 2),
                'long_positions': len([p for p in positions if p['type'] == 'buy']),
                'short_positions': len([p for p in positions if p['type'] == 'sell'])
            },
            'strategies': {
                'active': active_strategies,
                'total': len(ma_cross_manager.strategies)
            },
            'server_time': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'data': summary
        })
        
    except Exception as e:
        logger.error(f"获取仪表板摘要失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/api/dashboard/positions')
def get_dashboard_positions():
    """获取仪表板持仓信息"""
    try:
        positions = asyncio.run(mt5_client.get_positions())
        
        # 按盈亏排序
        positions.sort(key=lambda x: x['profit'], reverse=True)
        
        # 限制返回数量
        top_positions = positions[:10]
        
        return jsonify({
            'success': True,
            'data': {
                'positions': top_positions,
                'total': len(positions)
            }
        })
        
    except Exception as e:
        logger.error(f"获取持仓信息失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/api/dashboard/performance')
def get_dashboard_performance():
    """获取仪表板性能数据"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
                end_date = end_date.replace(hour=23, minute=59, second=59)
                logger.info(f"使用自定义日期范围: {start_date_str} 到 {end_date_str}")
            except ValueError as e:
                logger.error(f"日期格式错误: {e}")
                return jsonify({'success': False, 'error': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
        else:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
        
        logger.info(f"正在从MT5获取历史交易数据，时间范围: {start_date} 到 {end_date}")
        deals = asyncio.run(mt5_client.get_history_deals(start_date, end_date))
        
        logger.info(f"原始获取到{len(deals)}笔历史交易")
        
        # 过滤掉演示数据和非交易类型的记录
        # 只保留真实的交易类型（buy或sell）
        valid_trade_types = ['buy', 'sell']
        real_trades = [
            deal for deal in deals 
            if deal.get('type') in valid_trade_types and 
               deal.get('symbol') and 
               'demo' not in str(deal.get('comment', '')).lower()
        ]
        
        logger.info(f"过滤后剩余{len(real_trades)}笔真实交易")
        
        # 确保不生成模拟数据
        if not real_trades:
            logger.info("未获取到真实交易数据，返回空数据集")
            return jsonify({
                'success': True,
                'data': {
                    'equity_curve': [],
                    'daily_pnl': [],
                    'total_trades': 0,
                    'total_profit': 0,
                    'win_rate': 0,
                    'max_drawdown': 0
                }
            })
        
        # 使用真实交易数据
        deals = real_trades
        
        # 验证数据真实性
        if len(deals) > 0:
            logger.info(f"真实交易数据样本: {deals[0] if len(deals) > 0 else '无数据'}")
        
        # 计算每日盈亏（保留以便兼容）
        daily_pnl = {}
        for deal in deals:
            date = datetime.fromtimestamp(deal['trade_time']).date()
            date_str = date.isoformat()
            
            if date_str not in daily_pnl:
                daily_pnl[date_str] = 0
            
            daily_pnl[date_str] += deal['profit']
        
        # 获取当前账户余额
        account_info = asyncio.run(mt5_client.get_account_info())
        current_balance = account_info.get('equity', 0) if account_info else 0
        
        # 按交易时间排序
        sorted_deals = sorted(deals, key=lambda x: x['trade_time'], reverse=True)
        
        # 生成按交易记录的资金曲线数据
        equity_curve = []
        
        # 从当前余额开始，倒推每次交易前的余额
        running_balance = current_balance
        
        # 先添加当前余额作为最新数据点
        equity_curve.append({
            'date': datetime.now().isoformat(),
            'profit': 0,
            'cumulative': round(running_balance, 2),
            'cumulative_profit': 0,
            'trade_id': 'current',
            'trade_time': datetime.now().timestamp()
        })
        
        # 从最新到最旧遍历交易
        for deal in sorted_deals:
            # 倒推交易前的余额
            running_balance -= deal['profit']
            trade_time = datetime.fromtimestamp(deal['trade_time'])
            
            equity_curve.append({
                'date': trade_time.isoformat(),
                'profit': deal['profit'],
                'cumulative': round(running_balance, 2),
                'cumulative_profit': deal['profit'],
                'trade_id': deal.get('ticket', 'unknown'),
                'trade_time': deal['trade_time'],
                'symbol': deal.get('symbol', ''),
                'type': 'buy' if deal.get('type') == 0 else 'sell'
            })
        
        # 反转列表，使其按时间顺序（从旧到新）
        equity_curve.reverse()
        
        # 计算累计盈亏
        cumulative_profit = 0
        for item in equity_curve:
            cumulative_profit += item['profit']
            item['cumulative_profit'] = round(cumulative_profit, 2)
        
        # 计算统计指标
        total_trades = len(deals)
        profitable_trades = len([d for d in deals if d['profit'] > 0])
        total_profit = sum(d['profit'] for d in deals)
        win_rate = (profitable_trades / total_trades * 100) if total_trades > 0 else 0
        
        # 计算最大回撤
        max_drawdown = 0
        peak = equity_curve[0]['cumulative'] if equity_curve else 0
        
        for item in equity_curve:
            if item['cumulative'] > peak:
                peak = item['cumulative']
            drawdown = peak - item['cumulative']
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        performance_data = {
            'equity_curve': equity_curve,
            'daily_pnl': [{'date': k, 'profit': v} for k, v in daily_pnl.items()],
            'total_trades': total_trades,
            'total_profit': round(total_profit, 2),
            'win_rate': round(win_rate, 2),
            'max_drawdown': round(max_drawdown, 2),
            'profitable_trades': profitable_trades,
            'losing_trades': total_trades - profitable_trades,
            'last_updated': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'data': performance_data
        })
        
    except Exception as e:
        logger.error(f"获取性能数据失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/api/dashboard/market-overview')
def get_market_overview():
    """获取市场概览"""
    try:
        # 主要货币对
        major_pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'USDCAD', 'NZDUSD']
        
        market_data = []
        
        for symbol in major_pairs:
            try:
                tick = asyncio.run(mt5_client.get_tick_data(symbol))
                if tick:
                    market_data.append({
                        'symbol': symbol,
                        'bid': tick['bid'],
                        'ask': tick['ask'],
                        'spread': round((tick['ask'] - tick['bid']) * 10000, 1),  # 转换为点
                        'time': tick['time']
                    })
            except:
                continue
        
        return jsonify({
            'success': True,
            'data': {
                'symbols': market_data,
                'total_symbols': len(market_data),
                'update_time': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"获取市场概览失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/api/dashboard/strategies-status')
def get_strategies_status():
    """获取策略状态"""
    try:
        strategies_status = []
        
        for strategy_id, strategy in ma_cross_manager.strategies.items():
            performance = strategy.get_performance_metrics()
            
            strategies_status.append({
                'id': strategy_id,
                'name': strategy.name,
                'is_running': strategy.is_strategy_running(),
                'parameters': strategy.get_parameters(),
                'performance': performance,
                'last_update': datetime.now().isoformat()
            })
        
        return jsonify({
            'success': True,
            'data': {
                'strategies': strategies_status,
                'total_strategies': len(strategies_status),
                'active_strategies': len([s for s in strategies_status if s['is_running']])
            }
        })
        
    except Exception as e:
        logger.error(f"获取策略状态失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
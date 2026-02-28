"""
数据分析API
提供交易分析、风险评估、统计报告等功能
"""
from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from loguru import logger
from typing import Dict, List, Optional
import asyncio
import math
from collections import defaultdict

from mt5_client import mt5_client

analytics_bp = Blueprint('analytics', __name__)


def get_date_range():
    """从请求参数获取日期范围"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    days = request.args.get('days', type=int)
    
    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            end_date = end_date.replace(hour=23, minute=59, second=59)
            return start_date, end_date
        except ValueError:
            pass
    
    if days:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        return start_date, end_date
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    return start_date, end_date


@analytics_bp.route('/analytics/summary')
def get_analytics_summary():
    """获取分析摘要数据"""
    try:
        start_date, end_date = get_date_range()
        
        deals = asyncio.run(mt5_client.get_history_deals(start_date, end_date))
        
        valid_trade_types = ['buy', 'sell']
        real_trades = [
            deal for deal in deals 
            if deal.get('type') in valid_trade_types and 
               deal.get('symbol') and 
               'demo' not in str(deal.get('comment', '')).lower()
        ]
        
        if not real_trades:
            return jsonify({
                'total_profit': 0,
                'win_rate': 0,
                'profit_factor': 0,
                'max_drawdown': 0,
                'total_trades': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'sharpe_ratio': 0,
                'avg_profit': 0,
                'avg_loss': 0,
                'largest_win': 0,
                'largest_loss': 0,
                'avg_holding_time': 0,
                'best_symbol': None,
                'worst_symbol': None
            })
        
        total_trades = len(real_trades)
        winning_trades = [d for d in real_trades if d['profit'] > 0]
        losing_trades = [d for d in real_trades if d['profit'] < 0]
        
        total_profit = sum(d['profit'] for d in real_trades)
        gross_profit = sum(d['profit'] for d in winning_trades)
        gross_loss = abs(sum(d['profit'] for d in losing_trades))
        
        win_rate = (len(winning_trades) / total_trades * 100) if total_trades > 0 else 0
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else float('inf') if gross_profit > 0 else 0
        
        sorted_deals = sorted(real_trades, key=lambda x: x['trade_time'])
        cumulative = 0
        peak = 0
        max_drawdown = 0
        
        for deal in sorted_deals:
            cumulative += deal['profit']
            if cumulative > peak:
                peak = cumulative
            drawdown = peak - cumulative
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        returns = [d['profit'] for d in real_trades]
        if len(returns) > 1:
            avg_return = sum(returns) / len(returns)
            variance = sum((r - avg_return) ** 2 for r in returns) / len(returns)
            std_dev = math.sqrt(variance)
            sharpe_ratio = (avg_return / std_dev) * math.sqrt(252) if std_dev > 0 else 0
        else:
            sharpe_ratio = 0
        
        avg_profit = gross_profit / len(winning_trades) if winning_trades else 0
        avg_loss = gross_loss / len(losing_trades) if losing_trades else 0
        largest_win = max((d['profit'] for d in winning_trades), default=0)
        largest_loss = min((d['profit'] for d in losing_trades), default=0)
        
        symbol_stats = defaultdict(lambda: {'profit': 0, 'trades': 0})
        for deal in real_trades:
            symbol = deal.get('symbol', 'UNKNOWN')
            symbol_stats[symbol]['profit'] += deal['profit']
            symbol_stats[symbol]['trades'] += 1
        
        best_symbol = max(symbol_stats.items(), key=lambda x: x[1]['profit'], default=(None, {'profit': 0}))
        worst_symbol = min(symbol_stats.items(), key=lambda x: x[1]['profit'], default=(None, {'profit': 0}))
        
        return jsonify({
            'total_profit': round(total_profit, 2),
            'win_rate': round(win_rate, 2),
            'profit_factor': round(profit_factor, 2) if profit_factor != float('inf') else 999.99,
            'max_drawdown': round(max_drawdown, 2),
            'total_trades': total_trades,
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'avg_profit': round(avg_profit, 2),
            'avg_loss': round(avg_loss, 2),
            'largest_win': round(largest_win, 2),
            'largest_loss': round(largest_loss, 2),
            'avg_holding_time': 0,
            'best_symbol': best_symbol[0],
            'worst_symbol': worst_symbol[0],
            'best_symbol_profit': round(best_symbol[1]['profit'], 2),
            'worst_symbol_profit': round(worst_symbol[1]['profit'], 2)
        })
        
    except Exception as e:
        logger.error(f"获取分析摘要失败: {e}")
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/analytics/profit-by-symbol')
def get_profit_by_symbol():
    """按品种分析盈亏"""
    try:
        start_date, end_date = get_date_range()
        
        deals = asyncio.run(mt5_client.get_history_deals(start_date, end_date))
        
        valid_trade_types = ['buy', 'sell']
        real_trades = [
            deal for deal in deals 
            if deal.get('type') in valid_trade_types and 
               deal.get('symbol')
        ]
        
        symbol_data = defaultdict(lambda: {
            'profit': 0,
            'trades': 0,
            'wins': 0,
            'losses': 0,
            'volume': 0
        })
        
        for deal in real_trades:
            symbol = deal.get('symbol', 'UNKNOWN')
            symbol_data[symbol]['profit'] += deal['profit']
            symbol_data[symbol]['trades'] += 1
            symbol_data[symbol]['volume'] += deal.get('volume', 0)
            if deal['profit'] > 0:
                symbol_data[symbol]['wins'] += 1
            else:
                symbol_data[symbol]['losses'] += 1
        
        result = []
        for symbol, data in symbol_data.items():
            if data['trades'] == 0:
                continue
            win_rate = (data['wins'] / data['trades'] * 100) if data['trades'] > 0 else 0
            result.append({
                'symbol': symbol,
                'profit': round(data['profit'], 2),
                'trades': data['trades'],
                'wins': data['wins'],
                'losses': data['losses'],
                'win_rate': round(win_rate, 2),
                'volume': round(data['volume'], 2)
            })
        
        result.sort(key=lambda x: x['profit'], reverse=True)
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f"获取品种盈亏分析失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/analytics/profit-by-time')
def get_profit_by_time():
    """按时间分析盈亏"""
    try:
        start_date, end_date = get_date_range()
        granularity = request.args.get('granularity', 'daily')
        
        deals = asyncio.run(mt5_client.get_history_deals(start_date, end_date))
        
        valid_trade_types = ['buy', 'sell']
        real_trades = [
            deal for deal in deals 
            if deal.get('type') in valid_trade_types and 
               deal.get('symbol')
        ]
        
        time_data = defaultdict(lambda: {'profit': 0, 'trades': 0})
        
        for deal in real_trades:
            trade_time = datetime.fromtimestamp(deal['trade_time'])
            
            if granularity == 'hourly':
                key = trade_time.strftime('%Y-%m-%d %H:00')
            elif granularity == 'weekly':
                key = trade_time.strftime('%Y-W%W')
            elif granularity == 'monthly':
                key = trade_time.strftime('%Y-%m')
            else:
                key = trade_time.strftime('%Y-%m-%d')
            
            time_data[key]['profit'] += deal['profit']
            time_data[key]['trades'] += 1
        
        result = []
        for time_key, data in sorted(time_data.items()):
            result.append({
                'time': time_key,
                'profit': round(data['profit'], 2),
                'trades': data['trades']
            })
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f"获取时间盈亏分析失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/analytics/trade-distribution')
def get_trade_distribution():
    """获取交易分布统计"""
    try:
        start_date, end_date = get_date_range()
        
        deals = asyncio.run(mt5_client.get_history_deals(start_date, end_date))
        
        valid_trade_types = ['buy', 'sell']
        real_trades = [
            deal for deal in deals 
            if deal.get('type') in valid_trade_types and 
               deal.get('symbol')
        ]
        
        symbol_distribution = defaultdict(int)
        type_distribution = {'buy': 0, 'sell': 0}
        hour_distribution = defaultdict(int)
        day_distribution = defaultdict(int)
        profit_ranges = {
            '< -100': 0,
            '-100 to -50': 0,
            '-50 to -20': 0,
            '-20 to 0': 0,
            '0 to 20': 0,
            '20 to 50': 0,
            '50 to 100': 0,
            '> 100': 0
        }
        
        for deal in real_trades:
            symbol = deal.get('symbol', 'UNKNOWN')
            symbol_distribution[symbol] += 1
            
            trade_type = deal.get('type', 'unknown')
            if trade_type in type_distribution:
                type_distribution[trade_type] += 1
            
            trade_time = datetime.fromtimestamp(deal['trade_time'])
            hour_distribution[trade_time.hour] += 1
            day_distribution[trade_time.strftime('%A')] += 1
            
            profit = deal['profit']
            if profit < -100:
                profit_ranges['< -100'] += 1
            elif profit < -50:
                profit_ranges['-100 to -50'] += 1
            elif profit < -20:
                profit_ranges['-50 to -20'] += 1
            elif profit < 0:
                profit_ranges['-20 to 0'] += 1
            elif profit < 20:
                profit_ranges['0 to 20'] += 1
            elif profit < 50:
                profit_ranges['20 to 50'] += 1
            elif profit < 100:
                profit_ranges['50 to 100'] += 1
            else:
                profit_ranges['> 100'] += 1
        
        return jsonify({
            'success': True,
            'data': {
                'by_symbol': dict(symbol_distribution),
                'by_type': type_distribution,
                'by_hour': dict(sorted(hour_distribution.items())),
                'by_day': dict(day_distribution),
                'by_profit_range': profit_ranges
            }
        })
        
    except Exception as e:
        logger.error(f"获取交易分布失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/analytics/risk-metrics')
def get_risk_metrics():
    """获取风险指标"""
    try:
        start_date, end_date = get_date_range()
        
        deals = asyncio.run(mt5_client.get_history_deals(start_date, end_date))
        
        valid_trade_types = ['buy', 'sell']
        real_trades = [
            deal for deal in deals 
            if deal.get('type') in valid_trade_types and 
               deal.get('symbol')
        ]
        
        if not real_trades:
            return jsonify({
                'success': True,
                'data': {
                    'max_drawdown': 0,
                    'max_drawdown_percent': 0,
                    'volatility': 0,
                    'var_95': 0,
                    'var_99': 0,
                    'expected_shortfall': 0,
                    'max_consecutive_losses': 0,
                    'max_consecutive_wins': 0,
                    'avg_trade_duration': 0,
                    'risk_reward_ratio': 0
                }
            })
        
        sorted_deals = sorted(real_trades, key=lambda x: x['trade_time'])
        cumulative = 0
        peak = 0
        max_drawdown = 0
        drawdown_points = []
        
        for deal in sorted_deals:
            cumulative += deal['profit']
            if cumulative > peak:
                peak = cumulative
            drawdown = peak - cumulative
            drawdown_points.append(drawdown)
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        account_info = asyncio.run(mt5_client.get_account_info())
        balance = account_info.get('balance', 10000) if account_info else 10000
        max_drawdown_percent = (max_drawdown / balance * 100) if balance > 0 else 0
        
        returns = [d['profit'] for d in real_trades]
        avg_return = sum(returns) / len(returns)
        variance = sum((r - avg_return) ** 2 for r in returns) / len(returns)
        volatility = math.sqrt(variance)
        
        sorted_returns = sorted(returns)
        var_95_index = int(len(sorted_returns) * 0.05)
        var_99_index = int(len(sorted_returns) * 0.01)
        var_95 = sorted_returns[var_95_index] if var_95_index < len(sorted_returns) else sorted_returns[0]
        var_99 = sorted_returns[var_99_index] if var_99_index < len(sorted_returns) else sorted_returns[0]
        
        tail_returns = [r for r in sorted_returns if r <= var_95]
        expected_shortfall = sum(tail_returns) / len(tail_returns) if tail_returns else 0
        
        consecutive_losses = 0
        consecutive_wins = 0
        max_consecutive_losses = 0
        max_consecutive_wins = 0
        
        for deal in sorted_deals:
            if deal['profit'] < 0:
                consecutive_losses += 1
                consecutive_wins = 0
                max_consecutive_losses = max(max_consecutive_losses, consecutive_losses)
            else:
                consecutive_wins += 1
                consecutive_losses = 0
                max_consecutive_wins = max(max_consecutive_wins, consecutive_wins)
        
        winning_trades = [d for d in real_trades if d['profit'] > 0]
        losing_trades = [d for d in real_trades if d['profit'] < 0]
        avg_win = sum(d['profit'] for d in winning_trades) / len(winning_trades) if winning_trades else 0
        avg_loss = abs(sum(d['profit'] for d in losing_trades) / len(losing_trades)) if losing_trades else 0
        risk_reward_ratio = avg_win / avg_loss if avg_loss > 0 else 0
        
        return jsonify({
            'success': True,
            'data': {
                'max_drawdown': round(max_drawdown, 2),
                'max_drawdown_percent': round(max_drawdown_percent, 2),
                'volatility': round(volatility, 2),
                'var_95': round(var_95, 2),
                'var_99': round(var_99, 2),
                'expected_shortfall': round(expected_shortfall, 2),
                'max_consecutive_losses': max_consecutive_losses,
                'max_consecutive_wins': max_consecutive_wins,
                'avg_trade_duration': 0,
                'risk_reward_ratio': round(risk_reward_ratio, 2)
            }
        })
        
    except Exception as e:
        logger.error(f"获取风险指标失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@analytics_bp.route('/analytics/equity-curve')
def get_equity_curve():
    """获取资金曲线数据"""
    try:
        start_date, end_date = get_date_range()
        
        deals = asyncio.run(mt5_client.get_history_deals(start_date, end_date))
        
        valid_trade_types = ['buy', 'sell']
        real_trades = [
            deal for deal in deals 
            if deal.get('type') in valid_trade_types and 
               deal.get('symbol')
        ]
        
        if not real_trades:
            return jsonify({
                'success': True,
                'data': {
                    'equity_curve': [],
                    'drawdown_curve': []
                }
            })
        
        account_info = asyncio.run(mt5_client.get_account_info())
        current_balance = account_info.get('balance', 10000) if account_info else 10000
        
        sorted_deals = sorted(real_trades, key=lambda x: x['trade_time'])
        
        equity_curve = []
        drawdown_curve = []
        cumulative = 0
        peak = 0
        
        for deal in sorted_deals:
            cumulative += deal['profit']
            equity = current_balance - sum(d['profit'] for d in sorted_deals) + cumulative
            
            if cumulative > peak:
                peak = cumulative
            drawdown = peak - cumulative
            
            equity_curve.append({
                'time': datetime.fromtimestamp(deal['trade_time']).isoformat(),
                'equity': round(equity, 2),
                'profit': round(deal['profit'], 2),
                'cumulative_profit': round(cumulative, 2)
            })
            
            drawdown_curve.append({
                'time': datetime.fromtimestamp(deal['trade_time']).isoformat(),
                'drawdown': round(drawdown, 2)
            })
        
        return jsonify({
            'success': True,
            'data': {
                'equity_curve': equity_curve,
                'drawdown_curve': drawdown_curve
            }
        })
        
    except Exception as e:
        logger.error(f"获取资金曲线失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

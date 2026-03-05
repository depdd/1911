from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
from models import UserOperationLog, UserMT5Account, UserStrategy
from api.auth import jwt_required, get_db_session
import json

risk_bp = Blueprint('risk', __name__)

RISK_THRESHOLDS = {
    'max_daily_loss_percent': 10,
    'max_position_size': 10.0,
    'max_leverage': 100,
    'max_daily_trades': 100,
    'max_drawdown_percent': 20,
    'alert_thresholds': {
        'loss_warning': 5,
        'loss_critical': 8,
        'drawdown_warning': 10,
        'drawdown_critical': 15
    }
}

def init_risk_blueprint(db_session_getter):
    global get_db_session
    get_db_session = db_session_getter
    return risk_bp

def check_daily_loss(user_id: int, account_id: int) -> dict:
    session = get_db_session()
    
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    logs = session.query(UserOperationLog).filter(
        UserOperationLog.user_id == user_id,
        UserOperationLog.operation_type.in_(['trade_loss', 'trade_profit']),
        UserOperationLog.created_at >= start_of_day
    ).all()
    
    total_loss = 0
    total_profit = 0
    
    for log in logs:
        try:
            detail = json.loads(log.operation_detail) if log.operation_detail else {}
            if 'loss' in detail:
                total_loss += detail['loss']
            if 'profit' in detail:
                total_profit += detail['profit']
        except:
            pass
    
    return {
        'daily_loss': total_loss,
        'daily_profit': total_profit,
        'net_pnl': total_profit - total_loss
    }

def check_trade_frequency(user_id: int) -> dict:
    session = get_db_session()
    
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    trade_count = session.query(UserOperationLog).filter(
        UserOperationLog.user_id == user_id,
        UserOperationLog.operation_type == 'trade_executed',
        UserOperationLog.created_at >= start_of_day
    ).count()
    
    hour_ago = datetime.utcnow() - timedelta(hours=1)
    trades_last_hour = session.query(UserOperationLog).filter(
        UserOperationLog.user_id == user_id,
        UserOperationLog.operation_type == 'trade_executed',
        UserOperationLog.created_at >= hour_ago
    ).count()
    
    return {
        'daily_trades': trade_count,
        'trades_last_hour': trades_last_hour,
        'limit': RISK_THRESHOLDS['max_daily_trades']
    }

def check_running_strategies(user_id: int) -> dict:
    session = get_db_session()
    
    strategies = session.query(UserStrategy).filter_by(
        user_id=user_id,
        status='running'
    ).all()
    
    total_profit = sum(s.total_profit for s in strategies)
    
    return {
        'running_count': len(strategies),
        'total_profit': total_profit,
        'strategies': [{
            'id': s.id,
            'name': s.strategy_name,
            'profit': s.total_profit,
            'drawdown': s.max_drawdown
        } for s in strategies]
    }

def generate_risk_alerts(user_id: int) -> list:
    alerts = []
    session = get_db_session()
    
    from models import User
    user = session.query(User).filter_by(id=user_id).first()
    if not user:
        return alerts
    
    accounts = session.query(UserMT5Account).filter_by(user_id=user_id, is_active=True).all()
    
    for account in accounts:
        daily_pnl = check_daily_loss(user_id, account.id)
        
        if daily_pnl['net_pnl'] < 0:
            loss_percent = abs(daily_pnl['net_pnl']) / 10000 * 100
            
            if loss_percent >= RISK_THRESHOLDS['alert_thresholds']['loss_critical']:
                alerts.append({
                    'level': 'critical',
                    'type': 'daily_loss',
                    'message': f'Critical daily loss: {daily_pnl["net_pnl"]:.2f}',
                    'account_id': account.id,
                    'account_name': account.account_name
                })
            elif loss_percent >= RISK_THRESHOLDS['alert_thresholds']['loss_warning']:
                alerts.append({
                    'level': 'warning',
                    'type': 'daily_loss',
                    'message': f'Warning: Daily loss approaching limit: {daily_pnl["net_pnl"]:.2f}',
                    'account_id': account.id,
                    'account_name': account.account_name
                })
    
    trade_freq = check_trade_frequency(user_id)
    if trade_freq['daily_trades'] >= RISK_THRESHOLDS['max_daily_trades'] * 0.8:
        alerts.append({
            'level': 'warning',
            'type': 'trade_frequency',
            'message': f'High trade frequency: {trade_freq["daily_trades"]} trades today'
        })
    
    strategies = check_running_strategies(user_id)
    for s in strategies['strategies']:
        if s['drawdown'] >= RISK_THRESHOLDS['alert_thresholds']['drawdown_critical']:
            alerts.append({
                'level': 'critical',
                'type': 'strategy_drawdown',
                'message': f'Strategy {s["name"]} has critical drawdown: {s["drawdown"]:.2f}%',
                'strategy_id': s['id']
            })
        elif s['drawdown'] >= RISK_THRESHOLDS['alert_thresholds']['drawdown_warning']:
            alerts.append({
                'level': 'warning',
                'type': 'strategy_drawdown',
                'message': f'Strategy {s["name"]} drawdown warning: {s["drawdown"]:.2f}%',
                'strategy_id': s['id']
            })
    
    return alerts

@risk_bp.route('/status', methods=['GET'])
@jwt_required
def get_risk_status():
    user = g.current_user
    user_id = user.id
    
    session = get_db_session()
    
    accounts = session.query(UserMT5Account).filter_by(user_id=user_id, is_active=True).all()
    account_risks = []
    
    for account in accounts:
        daily_pnl = check_daily_loss(user_id, account.id)
        account_risks.append({
            'account_id': account.id,
            'account_name': account.account_name,
            'daily_pnl': daily_pnl,
            'connection_status': account.connection_status
        })
    
    trade_freq = check_trade_frequency(user_id)
    strategies = check_running_strategies(user_id)
    alerts = generate_risk_alerts(user_id)
    
    return jsonify({
        'accounts': account_risks,
        'trade_frequency': trade_freq,
        'strategies': strategies,
        'alerts': alerts,
        'thresholds': RISK_THRESHOLDS
    }), 200

@risk_bp.route('/alerts', methods=['GET'])
@jwt_required
def get_alerts():
    user_id = g.user_id
    
    alerts = generate_risk_alerts(user_id)
    
    return jsonify({
        'alerts': alerts,
        'has_critical': any(a['level'] == 'critical' for a in alerts)
    }), 200

@risk_bp.route('/thresholds', methods=['GET'])
@jwt_required
def get_thresholds():
    return jsonify({
        'thresholds': RISK_THRESHOLDS
    }), 200

@risk_bp.route('/thresholds', methods=['PUT'])
@jwt_required
def update_thresholds():
    user = g.current_user
    
    if user.membership_level not in ['pro', 'enterprise']:
        return jsonify({'error': 'This feature requires Pro or Enterprise membership'}), 403
    
    data = request.get_json()
    
    global RISK_THRESHOLDS
    
    if 'max_daily_loss_percent' in data:
        RISK_THRESHOLDS['max_daily_loss_percent'] = data['max_daily_loss_percent']
    if 'max_position_size' in data:
        RISK_THRESHOLDS['max_position_size'] = data['max_position_size']
    if 'max_daily_trades' in data:
        RISK_THRESHOLDS['max_daily_trades'] = data['max_daily_trades']
    
    return jsonify({
        'message': 'Thresholds updated',
        'thresholds': RISK_THRESHOLDS
    }), 200

@risk_bp.route('/history', methods=['GET'])
@jwt_required
def get_risk_history():
    user_id = g.user_id
    session = get_db_session()
    
    days = request.args.get('days', 7, type=int)
    date_from = datetime.utcnow() - timedelta(days=days)
    
    logs = session.query(UserOperationLog).filter(
        UserOperationLog.user_id == user_id,
        UserOperationLog.operation_type.in_(['trade_loss', 'trade_profit', 'risk_alert']),
        UserOperationLog.created_at >= date_from
    ).order_by(UserOperationLog.created_at.desc()).all()
    
    history = []
    for log in logs:
        try:
            detail = json.loads(log.operation_detail) if log.operation_detail else {}
        except:
            detail = {}
        
        history.append({
            'id': log.id,
            'type': log.operation_type,
            'detail': detail,
            'ip_address': log.ip_address,
            'created_at': log.created_at.isoformat()
        })
    
    return jsonify({
        'history': history,
        'period_days': days
    }), 200

@risk_bp.route('/emergency-stop', methods=['POST'])
@jwt_required
def emergency_stop():
    user_id = g.user_id
    session = get_db_session()
    
    running_strategies = session.query(UserStrategy).filter_by(
        user_id=user_id,
        status='running'
    ).all()
    
    stopped = []
    for strategy in running_strategies:
        strategy.status = 'stopped'
        strategy.stopped_at = datetime.utcnow()
        stopped.append({
            'id': strategy.id,
            'name': strategy.strategy_name
        })
    
    session.commit()
    
    from api.auth import log_operation
    log_operation(user_id, 'emergency_stop', f'Stopped {len(stopped)} strategies')
    
    return jsonify({
        'message': 'Emergency stop executed',
        'stopped_strategies': stopped
    }), 200

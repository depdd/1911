from flask import Blueprint, request, jsonify, g
from datetime import datetime
import json
import threading
from models import UserStrategy, UserMT5Account, User
from api.auth import jwt_required, check_membership_limit, log_operation, get_db_session, MEMBERSHIP_LIMITS

user_strategies_bp = Blueprint('user_strategies', __name__)

active_strategies = {}

def init_user_strategies_blueprint(db_session_getter):
    global get_db_session
    get_db_session = db_session_getter
    return user_strategies_bp

@user_strategies_bp.route('', methods=['GET'])
@jwt_required
def get_user_strategies():
    user = g.current_user
    session = get_db_session()
    
    strategies = session.query(UserStrategy).filter_by(user_id=user.id).all()
    
    return jsonify({
        'strategies': [{
            'id': s.id,
            'strategy_name': s.strategy_name,
            'template_id': s.template_id,
            'parameters': json.loads(s.parameters) if s.parameters else {},
            'status': s.status,
            'total_trades': s.total_trades,
            'total_profit': s.total_profit,
            'max_drawdown': s.max_drawdown,
            'win_rate': s.win_rate,
            'started_at': s.started_at.isoformat() if s.started_at else None,
            'stopped_at': s.stopped_at.isoformat() if s.stopped_at else None,
            'created_at': s.created_at.isoformat(),
            'mt5_account': {
                'id': s.mt5_account.id,
                'account_name': s.mt5_account.account_name,
                'login': s.mt5_account.login
            } if s.mt5_account else None
        } for s in strategies]
    }), 200

@user_strategies_bp.route('/<int:strategy_id>', methods=['GET'])
@jwt_required
def get_user_strategy(strategy_id):
    user = g.current_user
    session = get_db_session()
    
    strategy = session.query(UserStrategy).filter_by(id=strategy_id, user_id=user.id).first()
    if not strategy:
        return jsonify({'error': 'Strategy not found'}), 404
    
    return jsonify({
        'id': strategy.id,
        'strategy_name': strategy.strategy_name,
        'template_id': strategy.template_id,
        'parameters': json.loads(strategy.parameters) if strategy.parameters else {},
        'status': strategy.status,
        'total_trades': strategy.total_trades,
        'total_profit': strategy.total_profit,
        'max_drawdown': strategy.max_drawdown,
        'win_rate': strategy.win_rate,
        'started_at': strategy.started_at.isoformat() if strategy.started_at else None,
        'stopped_at': strategy.stopped_at.isoformat() if strategy.stopped_at else None,
        'created_at': strategy.created_at.isoformat(),
        'mt5_account': {
            'id': strategy.mt5_account.id,
            'account_name': strategy.mt5_account.account_name,
            'login': strategy.mt5_account.login,
            'server': strategy.mt5_account.server
        } if strategy.mt5_account else None
    }), 200

@user_strategies_bp.route('', methods=['POST'])
@jwt_required
@check_membership_limit('strategy')
def create_user_strategy():
    user = g.current_user
    data = request.get_json()
    
    strategy_name = data.get('strategy_name', '').strip()
    template_id = data.get('template_id', '')
    mt5_account_id = data.get('mt5_account_id')
    parameters = data.get('parameters', {})
    
    if not strategy_name or not template_id or not mt5_account_id:
        return jsonify({'error': 'Strategy name, template ID and MT5 account are required'}), 400
    
    session = get_db_session()
    
    mt5_account = session.query(UserMT5Account).filter_by(id=mt5_account_id, user_id=user.id).first()
    if not mt5_account:
        return jsonify({'error': 'MT5 account not found'}), 404
    
    existing = session.query(UserStrategy).filter_by(
        user_id=user.id,
        strategy_name=strategy_name
    ).first()
    
    if existing:
        return jsonify({'error': 'Strategy with this name already exists'}), 400
    
    new_strategy = UserStrategy(
        user_id=user.id,
        mt5_account_id=mt5_account_id,
        strategy_name=strategy_name,
        template_id=template_id,
        parameters=json.dumps(parameters),
        status='stopped'
    )
    
    session.add(new_strategy)
    session.commit()
    
    log_operation(user.id, 'create_strategy', f'Created strategy: {strategy_name} (template: {template_id})')
    
    return jsonify({
        'message': 'Strategy created',
        'strategy': {
            'id': new_strategy.id,
            'strategy_name': new_strategy.strategy_name,
            'template_id': new_strategy.template_id,
            'status': new_strategy.status
        }
    }), 201

@user_strategies_bp.route('/<int:strategy_id>', methods=['PUT'])
@jwt_required
def update_user_strategy(strategy_id):
    user = g.current_user
    data = request.get_json()
    
    session = get_db_session()
    
    strategy = session.query(UserStrategy).filter_by(id=strategy_id, user_id=user.id).first()
    if not strategy:
        return jsonify({'error': 'Strategy not found'}), 404
    
    if strategy.status == 'running':
        return jsonify({'error': 'Cannot update running strategy. Please stop it first.'}), 400
    
    if 'strategy_name' in data:
        strategy.strategy_name = data['strategy_name'].strip()
    
    if 'parameters' in data:
        strategy.parameters = json.dumps(data['parameters'])
    
    if 'mt5_account_id' in data:
        mt5_account = session.query(UserMT5Account).filter_by(id=data['mt5_account_id'], user_id=user.id).first()
        if not mt5_account:
            return jsonify({'error': 'MT5 account not found'}), 404
        strategy.mt5_account_id = data['mt5_account_id']
    
    session.commit()
    
    log_operation(user.id, 'update_strategy', f'Updated strategy: {strategy.strategy_name}')
    
    return jsonify({
        'message': 'Strategy updated',
        'strategy': {
            'id': strategy.id,
            'strategy_name': strategy.strategy_name,
            'template_id': strategy.template_id
        }
    }), 200

@user_strategies_bp.route('/<int:strategy_id>', methods=['DELETE'])
@jwt_required
def delete_user_strategy(strategy_id):
    user = g.current_user
    session = get_db_session()
    
    strategy = session.query(UserStrategy).filter_by(id=strategy_id, user_id=user.id).first()
    if not strategy:
        return jsonify({'error': 'Strategy not found'}), 404
    
    if strategy.status == 'running':
        return jsonify({'error': 'Cannot delete running strategy. Please stop it first.'}), 400
    
    strategy_name = strategy.strategy_name
    session.delete(strategy)
    session.commit()
    
    log_operation(user.id, 'delete_strategy', f'Deleted strategy: {strategy_name}')
    
    return jsonify({'message': 'Strategy deleted'}), 200

@user_strategies_bp.route('/<int:strategy_id>/start', methods=['POST'])
@jwt_required
def start_user_strategy(strategy_id):
    user = g.current_user
    session = get_db_session()
    
    strategy = session.query(UserStrategy).filter_by(id=strategy_id, user_id=user.id).first()
    if not strategy:
        return jsonify({'error': 'Strategy not found'}), 404
    
    if strategy.status == 'running':
        return jsonify({'error': 'Strategy is already running'}), 400
    
    mt5_account = strategy.mt5_account
    if not mt5_account or not mt5_account.is_active:
        return jsonify({'error': 'MT5 account is not active'}), 400
    
    try:
        from strategies.linshu import LinShuStrategy
        from strategies.dual_grid_martin import DualGridMartinStrategy
        from api.user_accounts import decrypt_password
        import MetaTrader5 as mt5
        
        password = decrypt_password(mt5_account.password)
        
        if not mt5.initialize():
            return jsonify({'error': 'MT5 initialization failed'}), 500
        
        if not mt5.login(int(mt5_account.login), password, mt5_account.server):
            mt5.shutdown()
            return jsonify({'error': 'MT5 login failed'}), 400
        
        params = json.loads(strategy.parameters) if strategy.parameters else {}
        params['symbol'] = params.get('symbol', 'EURUSD')
        
        strategy_classes = {
            'linshu': LinShuStrategy,
            'dual_grid_martin': DualGridMartinStrategy
        }
        
        strategy_class = strategy_classes.get(strategy.template_id)
        if not strategy_class:
            mt5.shutdown()
            return jsonify({'error': f'Unknown strategy template: {strategy.template_id}'}), 400
        
        strategy_instance = strategy_class(params, strategy_id=strategy.strategy_id)
        
        def run_strategy():
            try:
                strategy_instance.start()
            except Exception as e:
                print(f"Strategy error: {e}")
        
        strategy_thread = threading.Thread(target=run_strategy, daemon=True)
        strategy_thread.start()
        
        active_strategies[strategy_id] = {
            'instance': strategy_instance,
            'thread': strategy_thread,
            'mt5': mt5
        }
        
        strategy.status = 'running'
        strategy.started_at = datetime.utcnow()
        session.commit()
        
        log_operation(user.id, 'start_strategy', f'Started strategy: {strategy.strategy_name}')
        
        return jsonify({
            'message': 'Strategy started',
            'strategy': {
                'id': strategy.id,
                'strategy_name': strategy.strategy_name,
                'status': strategy.status
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_strategies_bp.route('/<int:strategy_id>/stop', methods=['POST'])
@jwt_required
def stop_user_strategy(strategy_id):
    user = g.current_user
    session = get_db_session()
    
    strategy = session.query(UserStrategy).filter_by(id=strategy_id, user_id=user.id).first()
    if not strategy:
        return jsonify({'error': 'Strategy not found'}), 404
    
    if strategy.status != 'running':
        return jsonify({'error': 'Strategy is not running'}), 400
    
    if strategy_id in active_strategies:
        try:
            active_strategies[strategy_id]['instance'].stop()
            active_strategies[strategy_id]['mt5'].shutdown()
            del active_strategies[strategy_id]
        except Exception as e:
            print(f"Error stopping strategy: {e}")
    
    strategy.status = 'stopped'
    strategy.stopped_at = datetime.utcnow()
    session.commit()
    
    log_operation(user.id, 'stop_strategy', f'Stopped strategy: {strategy.strategy_name}')
    
    return jsonify({
        'message': 'Strategy stopped',
        'strategy': {
            'id': strategy.id,
            'strategy_name': strategy.strategy_name,
            'status': strategy.status
        }
    }), 200

@user_strategies_bp.route('/<int:strategy_id>/logs', methods=['GET'])
@jwt_required
def get_strategy_logs(strategy_id):
    user = g.current_user
    session = get_db_session()
    
    strategy = session.query(UserStrategy).filter_by(id=strategy_id, user_id=user.id).first()
    if not strategy:
        return jsonify({'error': 'Strategy not found'}), 404
    
    from strategies.strategy_logger import StrategyLogger
    logger = StrategyLogger()
    logs = logger.get_logs(strategy.strategy_name, limit=100)
    
    return jsonify({
        'logs': logs
    }), 200

@user_strategies_bp.route('/running', methods=['GET'])
@jwt_required
def get_running_strategies():
    user = g.current_user
    session = get_db_session()
    
    strategies = session.query(UserStrategy).filter_by(user_id=user.id, status='running').all()
    
    return jsonify({
        'running_strategies': [{
            'id': s.id,
            'strategy_name': s.strategy_name,
            'template_id': s.template_id,
            'started_at': s.started_at.isoformat() if s.started_at else None,
            'mt5_account': {
                'id': s.mt5_account.id,
                'account_name': s.mt5_account.account_name
            } if s.mt5_account else None
        } for s in strategies]
    }), 200

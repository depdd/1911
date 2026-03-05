from flask import Blueprint, request, jsonify, g
from datetime import datetime
from cryptography.fernet import Fernet
import base64
import hashlib
from models import UserMT5Account, UserStrategy, User
from api.auth import jwt_required, check_membership_limit, log_operation, get_db_session

accounts_bp = Blueprint('accounts', __name__)

ENCRYPTION_KEY = b'your-32-byte-encryption-key-here!'

def get_cipher():
    key = base64.urlsafe_b64encode(hashlib.sha256(ENCRYPTION_KEY).digest())
    return Fernet(key)

def encrypt_password(password: str) -> str:
    cipher = get_cipher()
    return cipher.encrypt(password.encode()).decode()

def decrypt_password(encrypted: str) -> str:
    cipher = get_cipher()
    return cipher.decrypt(encrypted.encode()).decode()

def init_accounts_blueprint(db_session_getter):
    global get_db_session
    get_db_session = db_session_getter
    return accounts_bp

@accounts_bp.route('', methods=['GET'])
@jwt_required
def get_accounts():
    user = g.current_user
    session = get_db_session()
    
    accounts = session.query(UserMT5Account).filter_by(user_id=user.id).all()
    
    return jsonify({
        'accounts': [{
            'id': acc.id,
            'account_name': acc.account_name,
            'login': acc.login,
            'server': acc.server,
            'is_active': acc.is_active,
            'is_primary': acc.is_primary,
            'connection_status': acc.connection_status,
            'last_connected_at': acc.last_connected_at.isoformat() if acc.last_connected_at else None,
            'created_at': acc.created_at.isoformat(),
            'strategies_count': session.query(UserStrategy).filter_by(mt5_account_id=acc.id).count()
        } for acc in accounts]
    }), 200

@accounts_bp.route('/<int:account_id>', methods=['GET'])
@jwt_required
def get_account(account_id):
    user = g.current_user
    session = get_db_session()
    
    account = session.query(UserMT5Account).filter_by(id=account_id, user_id=user.id).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    strategies = session.query(UserStrategy).filter_by(mt5_account_id=account.id).all()
    
    return jsonify({
        'id': account.id,
        'account_name': account.account_name,
        'login': account.login,
        'server': account.server,
        'is_active': account.is_active,
        'is_primary': account.is_primary,
        'connection_status': account.connection_status,
        'last_connected_at': account.last_connected_at.isoformat() if account.last_connected_at else None,
        'created_at': account.created_at.isoformat(),
        'strategies': [{
            'id': s.id,
            'strategy_name': s.strategy_name,
            'template_id': s.template_id,
            'status': s.status,
            'total_profit': s.total_profit,
            'win_rate': s.win_rate
        } for s in strategies]
    }), 200

@accounts_bp.route('', methods=['POST'])
@jwt_required
@check_membership_limit('account')
def create_account():
    user = g.current_user
    data = request.get_json()
    
    account_name = data.get('account_name', '').strip()
    login = data.get('login', '').strip()
    password = data.get('password', '')
    server = data.get('server', '').strip()
    is_primary = data.get('is_primary', False)
    
    if not account_name or not login or not password or not server:
        return jsonify({'error': 'Account name, login, password and server are required'}), 400
    
    session = get_db_session()
    
    existing = session.query(UserMT5Account).filter_by(
        user_id=user.id,
        login=login,
        server=server
    ).first()
    
    if existing:
        return jsonify({'error': 'This MT5 account is already added'}), 400
    
    encrypted_password = encrypt_password(password)
    
    if is_primary:
        session.query(UserMT5Account).filter_by(user_id=user.id, is_primary=True).update({'is_primary': False})
    
    new_account = UserMT5Account(
        user_id=user.id,
        account_name=account_name,
        login=login,
        password=encrypted_password,
        server=server,
        is_primary=is_primary,
        connection_status='disconnected'
    )
    
    session.add(new_account)
    session.commit()
    
    log_operation(user.id, 'create_account', f'Added MT5 account: {account_name} ({login}@{server})')
    
    return jsonify({
        'message': 'MT5 account added successfully',
        'account': {
            'id': new_account.id,
            'account_name': new_account.account_name,
            'login': new_account.login,
            'server': new_account.server,
            'is_primary': new_account.is_primary
        }
    }), 201

@accounts_bp.route('/<int:account_id>', methods=['PUT'])
@jwt_required
def update_account(account_id):
    user = g.current_user
    data = request.get_json()
    
    session = get_db_session()
    
    account = session.query(UserMT5Account).filter_by(id=account_id, user_id=user.id).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    if 'account_name' in data:
        account.account_name = data['account_name'].strip()
    
    if 'password' in data and data['password']:
        account.password = encrypt_password(data['password'])
    
    if 'is_primary' in data and data['is_primary']:
        session.query(UserMT5Account).filter_by(user_id=user.id, is_primary=True).update({'is_primary': False})
        account.is_primary = True
    
    if 'is_active' in data:
        account.is_active = data['is_active']
    
    session.commit()
    
    log_operation(user.id, 'update_account', f'Updated MT5 account: {account.account_name}')
    
    return jsonify({
        'message': 'Account updated',
        'account': {
            'id': account.id,
            'account_name': account.account_name,
            'login': account.login,
            'server': account.server,
            'is_primary': account.is_primary,
            'is_active': account.is_active
        }
    }), 200

@accounts_bp.route('/<int:account_id>', methods=['DELETE'])
@jwt_required
def delete_account(account_id):
    user = g.current_user
    session = get_db_session()
    
    account = session.query(UserMT5Account).filter_by(id=account_id, user_id=user.id).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    running_strategies = session.query(UserStrategy).filter_by(
        mt5_account_id=account.id,
        status='running'
    ).count()
    
    if running_strategies > 0:
        return jsonify({
            'error': f'Cannot delete account with {running_strategies} running strategies. Please stop all strategies first.'
        }), 400
    
    account_name = account.account_name
    session.delete(account)
    session.commit()
    
    log_operation(user.id, 'delete_account', f'Deleted MT5 account: {account_name}')
    
    return jsonify({'message': 'Account deleted'}), 200

@accounts_bp.route('/<int:account_id>/test', methods=['POST'])
@jwt_required
def test_connection(account_id):
    user = g.current_user
    session = get_db_session()
    
    account = session.query(UserMT5Account).filter_by(id=account_id, user_id=user.id).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    try:
        import MetaTrader5 as mt5
        
        password = decrypt_password(account.password)
        
        if not mt5.initialize():
            return jsonify({'error': 'MT5 initialization failed'}), 500
        
        if not mt5.login(int(account.login), password, account.server):
            mt5.shutdown()
            return jsonify({'error': 'MT5 login failed. Check your credentials.'}), 400
        
        account_info = mt5.account_info()
        mt5.shutdown()
        
        if account_info:
            account.connection_status = 'connected'
            account.last_connected_at = datetime.utcnow()
            session.commit()
            
            return jsonify({
                'message': 'Connection successful',
                'account_info': {
                    'login': account_info.login,
                    'server': account_info.server,
                    'balance': account_info.balance,
                    'equity': account_info.equity,
                    'currency': account_info.currency
                }
            }), 200
        
        return jsonify({'error': 'Failed to get account info'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounts_bp.route('/<int:account_id>/set-primary', methods=['POST'])
@jwt_required
def set_primary_account(account_id):
    user = g.current_user
    session = get_db_session()
    
    account = session.query(UserMT5Account).filter_by(id=account_id, user_id=user.id).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    session.query(UserMT5Account).filter_by(user_id=user.id, is_primary=True).update({'is_primary': False})
    account.is_primary = True
    session.commit()
    
    log_operation(user.id, 'set_primary_account', f'Set primary account: {account.account_name}')
    
    return jsonify({'message': 'Primary account updated'}), 200

@accounts_bp.route('/primary', methods=['GET'])
@jwt_required
def get_primary_account():
    user = g.current_user
    session = get_db_session()
    
    account = session.query(UserMT5Account).filter_by(user_id=user.id, is_primary=True).first()
    
    if not account:
        accounts = session.query(UserMT5Account).filter_by(user_id=user.id).first()
        if accounts:
            return jsonify({'account': {
                'id': accounts.id,
                'account_name': accounts.account_name,
                'login': accounts.login,
                'server': accounts.server
            }}), 200
        return jsonify({'account': None}), 200
    
    return jsonify({
        'account': {
            'id': account.id,
            'account_name': account.account_name,
            'login': account.login,
            'server': account.server,
            'connection_status': account.connection_status
        }
    }), 200

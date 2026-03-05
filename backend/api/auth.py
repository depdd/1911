from flask import Blueprint, request, jsonify, g
from functools import wraps
from datetime import datetime, timedelta
import bcrypt
import jwt
import secrets
import re
from models import User, UserSettings, UserAPIKey, UserOperationLog, UserMT5Account, UserStrategy, UserSubscription, Payment
from config import Config

auth_bp = Blueprint('auth', __name__)

get_db_session = None

def init_auth_blueprint(db_session_getter):
    global get_db_session
    get_db_session = db_session_getter
    return auth_bp

JWT_SECRET = Config.SECRET_KEY if hasattr(Config, 'SECRET_KEY') else 'your-secret-key-change-in-production'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_HOURS = 24

MEMBERSHIP_LIMITS = {
    'free': {'strategies': 1, 'accounts': 1, 'features': ['basic_monitoring']},
    'basic': {'strategies': 3, 'accounts': 3, 'features': ['basic_monitoring', 'advanced_analytics']},
    'pro': {'strategies': 10, 'accounts': 10, 'features': ['basic_monitoring', 'advanced_analytics', 'real_time_alerts', 'api_access']},
    'enterprise': {'strategies': -1, 'accounts': -1, 'features': ['all']}
}

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_jwt(user_id: int) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def generate_api_key() -> tuple:
    api_key = secrets.token_hex(32)
    api_secret = secrets.token_hex(32)
    return api_key, api_secret

def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> dict:
    result = {'valid': True, 'errors': []}
    if len(password) < 8:
        result['valid'] = False
        result['errors'].append('Password must be at least 8 characters')
    if not re.search(r'[A-Z]', password):
        result['valid'] = False
        result['errors'].append('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', password):
        result['valid'] = False
        result['errors'].append('Password must contain at least one lowercase letter')
    if not re.search(r'[0-9]', password):
        result['valid'] = False
        result['errors'].append('Password must contain at least one number')
    return result

def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

def log_operation(user_id: int, operation_type: str, detail: str = None):
    session = get_db_session()
    try:
        log = UserOperationLog(
            user_id=user_id,
            operation_type=operation_type,
            operation_detail=detail,
            ip_address=get_client_ip(),
            user_agent=request.headers.get('User-Agent', '')[:255]
        )
        session.add(log)
        session.commit()
    except Exception as e:
        session.rollback()

def jwt_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        decoded = decode_jwt(token)
        if not decoded:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        session = get_db_session()
        user = session.query(User).filter_by(id=decoded['user_id']).first()
        if not user or not user.is_active:
            return jsonify({'error': 'User not found or inactive'}), 401
        
        if user.membership_expire_at and user.membership_expire_at < datetime.utcnow():
            user.membership_level = 'free'
            user.membership_expire_at = None
            session.commit()
        
        g.current_user = user
        g.user_id = user.id
        
        return f(*args, **kwargs)
    return decorated_function

def check_membership_limit(resource_type: str):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = g.current_user
            limits = MEMBERSHIP_LIMITS.get(user.membership_level, MEMBERSHIP_LIMITS['free'])
            
            session = get_db_session()
            
            if resource_type == 'strategy':
                current_count = session.query(UserStrategy).filter_by(user_id=user.id).count()
                max_count = limits['strategies']
                if max_count != -1 and current_count >= max_count:
                    return jsonify({
                        'error': f'Strategy limit reached. Your {user.membership_level} plan allows {max_count} strategies.'
                    }), 403
            
            elif resource_type == 'account':
                current_count = session.query(UserMT5Account).filter_by(user_id=user.id).count()
                max_count = limits['accounts']
                if max_count != -1 and current_count >= max_count:
                    return jsonify({
                        'error': f'Account limit reached. Your {user.membership_level} plan allows {max_count} accounts.'
                    }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def check_feature(feature_name: str):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = g.current_user
            limits = MEMBERSHIP_LIMITS.get(user.membership_level, MEMBERSHIP_LIMITS['free'])
            
            if 'all' not in limits['features'] and feature_name not in limits['features']:
                return jsonify({
                    'error': f'Feature "{feature_name}" is not available in your {user.membership_level} plan. Please upgrade to access this feature.'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    email = data.get('email', '').strip().lower()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not email or not username or not password:
        return jsonify({'error': 'Email, username and password are required'}), 400
    
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    password_validation = validate_password(password)
    if not password_validation['valid']:
        return jsonify({'error': password_validation['errors']}), 400
    
    if len(username) < 3 or len(username) > 50:
        return jsonify({'error': 'Username must be between 3 and 50 characters'}), 400
    
    session = get_db_session()
    
    existing_user = session.query(User).filter(
        (User.email == email) | (User.username == username)
    ).first()
    
    if existing_user:
        if existing_user.email == email:
            return jsonify({'error': 'Email already registered'}), 400
        return jsonify({'error': 'Username already taken'}), 400
    
    password_hash = hash_password(password)
    
    user = User(
        email=email,
        username=username,
        password_hash=password_hash,
        membership_level='free',
        is_active=True,
        is_verified=False
    )
    session.add(user)
    session.flush()
    
    user_settings = UserSettings(
        user_id=user.id,
        theme='dark',
        language='zh',
        timezone='Asia/Shanghai'
    )
    session.add(user_settings)
    
    session.commit()
    
    token = generate_jwt(user.id)
    
    log_operation(user.id, 'register', f'User registered with email: {email}')
    
    return jsonify({
        'message': 'Registration successful',
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'membership_level': user.membership_level
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    session = get_db_session()
    
    user = session.query(User).filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 401
    
    if not verify_password(password, user.password_hash):
        log_operation(user.id, 'login_failed', 'Invalid password attempt')
        return jsonify({'error': 'Invalid email or password'}), 401
    
    user.last_login_at = datetime.utcnow()
    user.last_login_ip = get_client_ip()
    session.commit()
    
    token = generate_jwt(user.id)
    
    log_operation(user.id, 'login', 'User logged in successfully')
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'membership_level': user.membership_level,
            'membership_expire_at': user.membership_expire_at.isoformat() if user.membership_expire_at else None
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required
def logout():
    log_operation(g.user_id, 'logout', 'User logged out')
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required
def get_current_user():
    user = g.current_user
    session = get_db_session()
    
    accounts_count = session.query(UserMT5Account).filter_by(user_id=user.id).count()
    strategies_count = session.query(UserStrategy).filter_by(user_id=user.id).count()
    
    return jsonify({
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'membership_level': user.membership_level,
        'membership_expire_at': user.membership_expire_at.isoformat() if user.membership_expire_at else None,
        'is_verified': user.is_verified,
        'created_at': user.created_at.isoformat(),
        'stats': {
            'accounts_count': accounts_count,
            'strategies_count': strategies_count
        }
    }), 200

@auth_bp.route('/me', methods=['PUT'])
@jwt_required
def update_current_user():
    user = g.current_user
    data = request.get_json()
    
    session = get_db_session()
    
    if 'username' in data:
        new_username = data['username'].strip()
        if len(new_username) < 3 or len(new_username) > 50:
            return jsonify({'error': 'Username must be between 3 and 50 characters'}), 400
        
        existing = session.query(User).filter(
            User.username == new_username,
            User.id != user.id
        ).first()
        if existing:
            return jsonify({'error': 'Username already taken'}), 400
        user.username = new_username
    
    session.commit()
    log_operation(g.user_id, 'update_profile', 'User updated profile')
    
    return jsonify({
        'message': 'Profile updated',
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username
        }
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required
def change_password():
    user = g.current_user
    data = request.get_json()
    
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current password and new password are required'}), 400
    
    if not verify_password(current_password, user.password_hash):
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    password_validation = validate_password(new_password)
    if not password_validation['valid']:
        return jsonify({'error': password_validation['errors']}), 400
    
    user.password_hash = hash_password(new_password)
    
    session = get_db_session()
    session.commit()
    
    log_operation(g.user_id, 'change_password', 'User changed password')
    
    return jsonify({'message': 'Password changed successfully'}), 200

@auth_bp.route('/api-keys', methods=['GET'])
@jwt_required
def get_api_keys():
    user = g.current_user
    session = get_db_session()
    
    keys = session.query(UserAPIKey).filter_by(user_id=user.id).all()
    
    return jsonify({
        'api_keys': [{
            'id': key.id,
            'key_name': key.key_name,
            'api_key': key.api_key,
            'permissions': key.permissions,
            'is_active': key.is_active,
            'last_used_at': key.last_used_at.isoformat() if key.last_used_at else None,
            'expire_at': key.expire_at.isoformat() if key.expire_at else None,
            'created_at': key.created_at.isoformat()
        } for key in keys]
    }), 200

@auth_bp.route('/api-keys', methods=['POST'])
@jwt_required
def create_api_key():
    user = g.current_user
    data = request.get_json()
    
    key_name = data.get('key_name', '').strip()
    permissions = data.get('permissions', 'read')
    expire_days = data.get('expire_days', 365)
    
    if not key_name:
        return jsonify({'error': 'Key name is required'}), 400
    
    api_key, api_secret = generate_api_key()
    
    new_key = UserAPIKey(
        user_id=user.id,
        key_name=key_name,
        api_key=api_key,
        api_secret=api_secret,
        permissions=permissions,
        expire_at=datetime.utcnow() + timedelta(days=expire_days) if expire_days > 0 else None
    )
    
    session = get_db_session()
    session.add(new_key)
    session.commit()
    
    log_operation(g.user_id, 'create_api_key', f'Created API key: {key_name}')
    
    return jsonify({
        'message': 'API key created',
        'api_key': {
            'id': new_key.id,
            'key_name': new_key.key_name,
            'api_key': api_key,
            'api_secret': api_secret,
            'permissions': new_key.permissions,
            'expire_at': new_key.expire_at.isoformat() if new_key.expire_at else None
        }
    }), 201

@auth_bp.route('/api-keys/<int:key_id>', methods=['DELETE'])
@jwt_required
def delete_api_key(key_id):
    user = g.current_user
    session = get_db_session()
    
    key = session.query(UserAPIKey).filter_by(id=key_id, user_id=user.id).first()
    if not key:
        return jsonify({'error': 'API key not found'}), 404
    
    session.delete(key)
    session.commit()
    
    log_operation(g.user_id, 'delete_api_key', f'Deleted API key: {key.key_name}')
    
    return jsonify({'message': 'API key deleted'}), 200

@auth_bp.route('/membership', methods=['GET'])
@jwt_required
def get_membership_info():
    user = g.current_user
    limits = MEMBERSHIP_LIMITS.get(user.membership_level, MEMBERSHIP_LIMITS['free'])
    
    return jsonify({
        'level': user.membership_level,
        'expire_at': user.membership_expire_at.isoformat() if user.membership_expire_at else None,
        'limits': limits
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required
def refresh_token():
    user = g.current_user
    token = generate_jwt(user.id)
    
    return jsonify({
        'token': token,
        'message': 'Token refreshed'
    }), 200

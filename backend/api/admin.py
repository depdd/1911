from flask import Blueprint, request, jsonify, g
from functools import wraps
from datetime import datetime, timedelta
from models import User, UserStrategy, UserMT5Account, UserSubscription, Payment, UserOperationLog, StrategyTemplate
from api.auth import jwt_required, get_db_session, log_operation
from sqlalchemy import desc, or_
import json
import os
import re

admin_bp = Blueprint('admin', __name__)

def init_admin_blueprint(db_session_getter):
    global get_db_session
    get_db_session = db_session_getter
    return admin_bp

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'current_user'):
            return jsonify({'error': 'Unauthorized'}), 401
        
        user = g.current_user
        if not user.is_active:
            return jsonify({'error': 'User is inactive'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/stats', methods=['GET'])
@jwt_required
@admin_required
def get_admin_stats():
    session = get_db_session()
    try:
        total_users = session.query(User).count()
        active_users = session.query(User).filter_by(is_active=True).count()
        total_strategies = session.query(UserStrategy).count()
        running_strategies = session.query(UserStrategy).filter_by(status='running').count()
        
        today = datetime.utcnow().date()
        new_users_today = session.query(User).filter(
            User.created_at >= datetime.combine(today, datetime.min.time())
        ).count()
        
        subscription_stats = {}
        for level in ['free', 'basic', 'pro', 'enterprise']:
            subscription_stats[level] = session.query(User).filter_by(membership_level=level).count()
        
        return jsonify({
            'success': True,
            'data': {
                'total_users': total_users,
                'active_users': active_users,
                'total_strategies': total_strategies,
                'active_strategies': running_strategies,
                'new_users_today': new_users_today,
                'subscription_stats': subscription_stats
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users', methods=['GET'])
@jwt_required
@admin_required
def get_users():
    session = get_db_session()
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        membership = request.args.get('membership', '')
        status = request.args.get('status', '')
        
        query = session.query(User)
        
        if search:
            query = query.filter(
                or_(
                    User.email.ilike(f'%{search}%'),
                    User.username.ilike(f'%{search}%')
                )
            )
        
        if membership:
            query = query.filter_by(membership_level=membership)
        
        if status:
            is_active = status == 'active'
            query = query.filter_by(is_active=is_active)
        
        total = query.count()
        users = query.order_by(desc(User.created_at)).offset((page - 1) * per_page).limit(per_page).all()
        
        users_data = []
        for user in users:
            mt5_count = session.query(UserMT5Account).filter_by(user_id=user.id).count()
            strategies_count = session.query(UserStrategy).filter_by(user_id=user.id).count()
            users_data.append({
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'membership_level': user.membership_level,
                'membership_expire_at': user.membership_expire_at.isoformat() if user.membership_expire_at else None,
                'is_active': user.is_active,
                'is_verified': user.is_verified,
                'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
                'last_login_ip': user.last_login_ip,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'mt5_accounts_count': mt5_count,
                'strategies_count': strategies_count
            })
        
        return jsonify({
            'success': True,
            'data': {
                'users': users_data,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-templates', methods=['GET'])
@jwt_required
@admin_required
def get_strategy_templates():
    session = get_db_session()
    try:
        templates = session.query(StrategyTemplate).order_by(desc(StrategyTemplate.created_at)).all()
        
        templates_data = []
        for t in templates:
            templates_data.append({
                'id': t.id,
                'template_id': t.template_id,
                'name': t.name,
                'description': t.description,
                'category': t.category,
                'risk_level': t.risk_level,
                'default_parameters': json.loads(t.default_parameters) if t.default_parameters else {},
                'parameters_schema': json.loads(t.parameters_schema) if t.parameters_schema else [],
                'performance': json.loads(t.performance) if t.performance else {},
                'is_active': t.is_active,
                'created_at': t.created_at.isoformat() if t.created_at else None,
                'updated_at': t.updated_at.isoformat() if t.updated_at else None
            })
        
        return jsonify({
            'success': True,
            'data': templates_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-templates', methods=['POST'])
@jwt_required
@admin_required
def create_strategy_template():
    session = get_db_session()
    try:
        data = request.get_json()
        
        template_id = data.get('template_id', '').strip()
        name = data.get('name', '').strip()
        description = data.get('description', '')
        category = data.get('category', '')
        risk_level = data.get('risk_level', 'medium')
        default_parameters = data.get('default_parameters', {})
        parameters_schema = data.get('parameters_schema', [])
        performance = data.get('performance', {})
        
        if not template_id or not name:
            return jsonify({'error': 'template_id和name不能为空'}), 400
        
        existing = session.query(StrategyTemplate).filter_by(template_id=template_id).first()
        if existing:
            return jsonify({'error': 'template_id已存在'}), 400
        
        template = StrategyTemplate(
            template_id=template_id,
            name=name,
            description=description,
            category=category,
            risk_level=risk_level,
            default_parameters=json.dumps(default_parameters),
            parameters_schema=json.dumps(parameters_schema),
            performance=json.dumps(performance),
            is_active=True
        )
        
        session.add(template)
        session.commit()
        
        log_operation(g.user_id, 'admin_create_template', f'Created template: {template_id}')
        
        return jsonify({
            'success': True,
            'message': '策略模板创建成功',
            'data': {
                'id': template.id,
                'template_id': template.template_id,
                'name': template.name
            }
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-templates/<int:id>', methods=['PUT'])
@jwt_required
@admin_required
def update_strategy_template(id):
    session = get_db_session()
    try:
        template = session.query(StrategyTemplate).filter_by(id=id).first()
        if not template:
            return jsonify({'error': '策略模板不存在'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            template.name = data['name'].strip() if data['name'] else template.name
        if 'description' in data:
            template.description = data['description']
        if 'category' in data:
            template.category = data['category']
        if 'risk_level' in data:
            template.risk_level = data['risk_level']
        if 'default_parameters' in data:
            template.default_parameters = json.dumps(data['default_parameters'])
        if 'parameters_schema' in data:
            template.parameters_schema = json.dumps(data['parameters_schema'])
        if 'performance' in data:
            template.performance = json.dumps(data['performance'])
        if 'is_active' in data:
            template.is_active = data['is_active']
        
        session.commit()
        log_operation(g.user_id, 'admin_update_template', f'Updated template: {template.template_id}')
        
        return jsonify({
            'success': True,
            'message': '策略模板更新成功'
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-templates/<int:id>', methods=['DELETE'])
@jwt_required
@admin_required
def delete_strategy_template(id):
    session = get_db_session()
    try:
        template = session.query(StrategyTemplate).filter_by(id=id).first()
        if not template:
            return jsonify({'error': '策略模板不存在'}), 404
        
        template_id = template.template_id
        session.delete(template)
        session.commit()
        
        log_operation(g.user_id, 'admin_delete_template', f'Deleted template: {template_id}')
        
        return jsonify({
            'success': True,
            'message': '策略模板删除成功'
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-files', methods=['GET'])
@jwt_required
@admin_required
def get_strategy_files():
    try:
        from strategies.strategy_manager import strategy_manager
        strategy_manager.reload_all()
        strategies = strategy_manager.list_strategies()
        
        session = get_db_session()
        
        deleted_templates = session.query(StrategyTemplate).filter(StrategyTemplate.is_deleted == True).all()
        inactive_templates = session.query(StrategyTemplate).filter(StrategyTemplate.is_active == False).all()
        excluded_ids = set(t.template_id for t in deleted_templates) | set(t.template_id for t in inactive_templates)
        
        db_templates = session.query(StrategyTemplate).filter_by(is_deleted=False, is_active=True).all()
        existing_ids = {s.get('id') for s in strategies}
        
        for template in db_templates:
            if template.template_id not in existing_ids and template.template_id not in excluded_ids:
                strategies.append({
                    'id': template.template_id,
                    'name': template.name,
                    'description': template.description or '',
                    'category': template.category or '',
                    'risk_level': template.risk_level or 'medium',
                    'is_builtin': False,
                    'loaded_at': template.created_at.isoformat() if template.created_at else '',
                    'file_path': '',
                    'is_template_only': True
                })
        
        strategies = [s for s in strategies if s.get('id') not in excluded_ids]
        
        for strategy in strategies:
            strategy_id = strategy.get('id')
            running_count = session.query(UserStrategy).filter_by(
                template_id=strategy_id,
                status='running'
            ).count()
            total_count = session.query(UserStrategy).filter_by(
                template_id=strategy_id
            ).count()
            strategy['running_count'] = running_count
            strategy['total_count'] = total_count
        
        return jsonify({
            'success': True,
            'data': strategies
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-files', methods=['POST'])
@jwt_required
@admin_required
def upload_strategy_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': '未找到上传文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '未选择文件'}), 400
        
        if not file.filename.endswith('.py'):
            return jsonify({'error': '只支持.py文件'}), 400
        
        strategy_id = request.form.get('strategy_id', '').strip()
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '')
        category = request.form.get('category', '自定义')
        risk_level = request.form.get('risk_level', 'medium')
        class_name = request.form.get('class_name', '').strip() or None
        
        if not strategy_id:
            safe_name = os.path.splitext(file.filename)[0]
            strategy_id = re.sub(r'[^a-zA-Z0-9_]', '_', safe_name).lower()
        
        if not name:
            name = strategy_id
        
        file_content = file.read()
        
        dangerous_patterns = [
            r'import\s+os\s*\.\s*system',
            r'import\s+subprocess',
            r'eval\s*\(',
            r'exec\s*\(',
            r'__import__\s*\(',
            r'open\s*\([^)]*[\'"]w',
        ]
        
        content_str = file_content.decode('utf-8', errors='ignore')
        for pattern in dangerous_patterns:
            if re.search(pattern, content_str):
                return jsonify({'error': f'策略代码包含不允许的操作: {pattern}'}), 400
        
        from strategies.strategy_manager import strategy_manager
        
        file_path = strategy_manager.save_strategy_file(file_content, f"{strategy_id}.py")
        
        result = strategy_manager.register_strategy(
            strategy_id=strategy_id,
            file_path=file_path,
            name=name,
            description=description,
            category=category,
            risk_level=risk_level,
            class_name=class_name
        )
        
        if result['success']:
            log_operation(g.user_id, 'admin_upload_strategy', f'Uploaded strategy: {strategy_id}')
            
            session = get_db_session()
            template = session.query(StrategyTemplate).filter_by(template_id=strategy_id).first()
            if not template:
                template = StrategyTemplate(
                    template_id=strategy_id,
                    name=name,
                    description=description,
                    category=category,
                    risk_level=risk_level,
                    default_parameters='{}',
                    parameters_schema='[]',
                    performance='{}',
                    is_active=True
                )
                session.add(template)
                session.commit()
            
            return jsonify({
                'success': True,
                'message': '策略上传成功',
                'data': {
                    'strategy_id': strategy_id,
                    'name': name,
                    'file_path': file_path
                }
            })
        else:
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': result.get('error', '策略注册失败')}), 400
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-files/<strategy_id>', methods=['DELETE'])
@jwt_required
@admin_required
def delete_strategy_file(strategy_id):
    try:
        from strategies.strategy_manager import strategy_manager
        from datetime import datetime
        
        info = strategy_manager.get_strategy_info(strategy_id)
        if not info:
            return jsonify({'error': '策略不存在'}), 404
        
        session = get_db_session()
        running_strategies = session.query(UserStrategy).filter_by(
            template_id=strategy_id,
            status='running'
        ).all()
        
        if running_strategies:
            users_info = []
            for s in running_strategies:
                users_info.append({
                    'username': s.user.username,
                    'email': s.user.email,
                    'strategy_name': s.strategy_name
                })
            return jsonify({
                'error': '有用户正在使用该策略',
                'in_use': True,
                'users': users_info,
                'count': len(running_strategies)
            }), 400
        
        strategy_manager.unregister_strategy(strategy_id)
        
        template = session.query(StrategyTemplate).filter_by(template_id=strategy_id).first()
        if template:
            template.is_deleted = True
            template.deleted_at = datetime.utcnow()
        else:
            template = StrategyTemplate(
                template_id=strategy_id,
                name=info.get('name', strategy_id),
                description=info.get('description', ''),
                category=info.get('category', ''),
                risk_level=info.get('risk_level', 'medium'),
                is_active=True,
                is_deleted=True,
                deleted_at=datetime.utcnow()
            )
            session.add(template)
        
        session.commit()
        
        log_operation(g.user_id, 'admin_delete_strategy', f'Deleted strategy: {strategy_id}')
        
        return jsonify({
            'success': True,
            'message': '策略已移至回收站'
        })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-files/recycled', methods=['GET'])
@jwt_required
@admin_required
def get_recycled_strategies():
    try:
        session = get_db_session()
        deleted_templates = session.query(StrategyTemplate).filter_by(is_deleted=True).all()
        
        recycled = []
        for t in deleted_templates:
            recycled.append({
                'id': t.template_id,
                'name': t.name,
                'description': t.description or '',
                'category': t.category or '',
                'risk_level': t.risk_level or 'medium',
                'is_builtin': False,
                'deleted_at': t.deleted_at.isoformat() if t.deleted_at else None
            })
        
        return jsonify({
            'success': True,
            'data': recycled
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-files/<strategy_id>/restore', methods=['POST'])
@jwt_required
@admin_required
def restore_strategy_file(strategy_id):
    try:
        from strategies.strategy_manager import strategy_manager
        
        session = get_db_session()
        template = session.query(StrategyTemplate).filter_by(template_id=strategy_id, is_deleted=True).first()
        
        if not template:
            return jsonify({'error': '策略不在回收站中'}), 404
        
        template.is_deleted = False
        template.deleted_at = None
        session.commit()
        
        strategy_manager.reload_strategy(strategy_id)
        
        log_operation(g.user_id, 'admin_restore_strategy', f'Restored strategy: {strategy_id}')
        return jsonify({
            'success': True,
            'message': '策略恢复成功'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-files/<strategy_id>/permanent', methods=['DELETE'])
@jwt_required
@admin_required
def permanently_delete_strategy(strategy_id):
    try:
        from strategies.strategy_manager import strategy_manager
        from datetime import datetime
        
        session = get_db_session()
        template = session.query(StrategyTemplate).filter_by(template_id=strategy_id, is_deleted=True).first()
        
        if not template:
            return jsonify({'error': '策略不在回收站中'}), 404
        
        strategy_manager.permanently_delete_strategy(strategy_id)
        
        template.is_active = False
        template.deleted_at = datetime.utcnow()
        session.commit()
        
        log_operation(g.user_id, 'admin_permanent_delete_strategy', f'Permanently deleted strategy: {strategy_id}')
        return jsonify({
            'success': True,
            'message': '策略已永久删除'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategy-files/<strategy_id>/reload', methods=['POST'])
@jwt_required
@admin_required
def reload_strategy_file(strategy_id):
    try:
        from strategies.strategy_manager import strategy_manager
        
        info = strategy_manager.get_strategy_info(strategy_id)
        if not info:
            return jsonify({'error': '策略不存在'}), 404
        
        file_path = info.get('file_path', '')
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': '策略文件不存在'}), 404
        
        success = strategy_manager.load_strategy_from_file(
            file_path, 
            strategy_id, 
            info.get('class_name'),
            info
        )
        
        if success:
            log_operation(g.user_id, 'admin_reload_strategy', f'Reloaded strategy: {strategy_id}')
            return jsonify({
                'success': True,
                'message': '策略重载成功'
            })
        else:
            return jsonify({'error': '策略重载失败'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required
@admin_required
def get_user_detail(user_id):
    session = get_db_session()
    try:
        user = session.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        mt5_accounts = session.query(UserMT5Account).filter_by(user_id=user_id).all()
        mt5_accounts_data = []
        for acc in mt5_accounts:
            mt5_accounts_data.append({
                'id': acc.id,
                'account_name': acc.account_name,
                'login': acc.login,
                'server': acc.server,
                'is_active': acc.is_active,
                'is_primary': acc.is_primary,
                'connection_status': acc.connection_status,
                'last_connected_at': acc.last_connected_at.isoformat() if acc.last_connected_at else None
            })
        
        strategies = session.query(UserStrategy).filter_by(user_id=user_id).all()
        strategies_data = []
        for s in strategies:
            strategies_data.append({
                'id': s.id,
                'name': s.strategy_name,
                'template_id': s.template_id,
                'status': s.status,
                'total_trades': s.total_trades,
                'total_profit': s.total_profit,
                'created_at': s.created_at.isoformat() if s.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'membership_level': user.membership_level,
                    'membership_expire_at': user.membership_expire_at.isoformat() if user.membership_expire_at else None,
                    'is_active': user.is_active,
                    'is_verified': user.is_verified,
                    'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
                    'last_login_ip': user.last_login_ip,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None
                },
                'mt5_accounts': mt5_accounts_data,
                'strategies': strategies_data
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/status', methods=['PUT'])
@jwt_required
@admin_required
def update_user_status(user_id):
    session = get_db_session()
    try:
        user = session.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        is_active = data.get('is_active')
        
        if is_active is not None:
            user.is_active = is_active
            session.commit()
            log_operation(g.user_id, 'admin_update_user_status', f'User {user_id} status changed to {is_active}')
        
        return jsonify({
            'success': True,
            'message': 'User status updated'
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/membership', methods=['PUT'])
@jwt_required
@admin_required
def update_user_membership(user_id):
    session = get_db_session()
    try:
        user = session.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        membership_level = data.get('membership_level')
        expire_days = data.get('expire_days', 30)
        
        if membership_level:
            user.membership_level = membership_level
            if membership_level != 'free':
                user.membership_expire_at = datetime.utcnow() + timedelta(days=expire_days)
            else:
                user.membership_expire_at = None
            session.commit()
            log_operation(g.user_id, 'admin_update_membership', f'User {user_id} membership changed to {membership_level}')
        
        return jsonify({
            'success': True,
            'message': 'User membership updated'
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategies', methods=['GET'])
@jwt_required
@admin_required
def get_strategies():
    session = get_db_session()
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        template_id = request.args.get('type', '')
        status = request.args.get('status', '')
        
        query = session.query(UserStrategy).join(User)
        
        if search:
            query = query.filter(
                or_(
                    UserStrategy.strategy_name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                    User.username.ilike(f'%{search}%')
                )
            )
        
        if template_id:
            query = query.filter_by(template_id=template_id)
        
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        strategies = query.order_by(desc(UserStrategy.created_at)).offset((page - 1) * per_page).limit(per_page).all()
        
        strategies_data = []
        for s in strategies:
            strategies_data.append({
                'id': s.id,
                'name': s.strategy_name,
                'template_id': s.template_id,
                'status': s.status,
                'is_active': s.status == 'running',
                'symbol': json.loads(s.parameters).get('symbol', '-') if s.parameters else '-',
                'timeframe': json.loads(s.parameters).get('timeframe', '-') if s.parameters else '-',
                'total_trades': s.total_trades,
                'total_profit': s.total_profit,
                'created_at': s.created_at.isoformat() if s.created_at else None,
                'user': {
                    'id': s.user.id,
                    'email': s.user.email,
                    'username': s.user.username
                }
            })
        
        return jsonify({
            'success': True,
            'data': {
                'strategies': strategies_data,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategies/<int:strategy_id>', methods=['GET'])
@jwt_required
@admin_required
def get_strategy_detail(strategy_id):
    session = get_db_session()
    try:
        strategy = session.query(UserStrategy).filter_by(id=strategy_id).first()
        if not strategy:
            return jsonify({'error': 'Strategy not found'}), 404
        
        mt5_account = session.query(UserMT5Account).filter_by(id=strategy.mt5_account_id).first()
        
        return jsonify({
            'success': True,
            'data': {
                'id': strategy.id,
                'name': strategy.strategy_name,
                'template_id': strategy.template_id,
                'parameters': strategy.parameters,
                'status': strategy.status,
                'total_trades': strategy.total_trades,
                'total_profit': strategy.total_profit,
                'max_drawdown': strategy.max_drawdown,
                'win_rate': strategy.win_rate,
                'created_at': strategy.created_at.isoformat() if strategy.created_at else None,
                'updated_at': strategy.updated_at.isoformat() if strategy.updated_at else None,
                'user': {
                    'id': strategy.user.id,
                    'email': strategy.user.email,
                    'username': strategy.user.username
                },
                'mt5_account': {
                    'id': mt5_account.id,
                    'account_name': mt5_account.account_name,
                    'login': mt5_account.login,
                    'server': mt5_account.server
                } if mt5_account else None
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategies/<int:strategy_id>', methods=['PUT'])
@jwt_required
@admin_required
def update_strategy(strategy_id):
    session = get_db_session()
    try:
        strategy = session.query(UserStrategy).filter_by(id=strategy_id).first()
        if not strategy:
            return jsonify({'error': 'Strategy not found'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            strategy.strategy_name = data['name']
        if 'parameters' in data:
            strategy.parameters = data['parameters']
        if 'status' in data:
            strategy.status = data['status']
        
        session.commit()
        log_operation(g.user_id, 'admin_update_strategy', f'Strategy {strategy_id} updated')
        
        return jsonify({
            'success': True,
            'message': 'Strategy updated'
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/strategies/<int:strategy_id>', methods=['DELETE'])
@jwt_required
@admin_required
def delete_strategy(strategy_id):
    session = get_db_session()
    try:
        strategy = session.query(UserStrategy).filter_by(id=strategy_id).first()
        if not strategy:
            return jsonify({'error': 'Strategy not found'}), 404
        
        session.delete(strategy)
        session.commit()
        log_operation(g.user_id, 'admin_delete_strategy', f'Strategy {strategy_id} deleted')
        
        return jsonify({
            'success': True,
            'message': 'Strategy deleted'
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/operations', methods=['GET'])
@jwt_required
@admin_required
def get_operations():
    session = get_db_session()
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        user_id = request.args.get('user_id', '')
        operation_type = request.args.get('type', '')
        
        query = session.query(UserOperationLog).join(User)
        
        if user_id:
            query = query.filter_by(user_id=int(user_id))
        
        if operation_type:
            query = query.filter_by(operation_type=operation_type)
        
        total = query.count()
        logs = query.order_by(desc(UserOperationLog.created_at)).offset((page - 1) * per_page).limit(per_page).all()
        
        logs_data = []
        for log in logs:
            logs_data.append({
                'id': log.id,
                'user_id': log.user_id,
                'username': log.user.username if log.user else None,
                'operation_type': log.operation_type,
                'operation_detail': log.operation_detail,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent,
                'created_at': log.created_at.isoformat() if log.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': {
                'logs': logs_data,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

"""
系统设置API
提供用户设置管理功能
"""
from flask import Blueprint, jsonify, request
from loguru import logger
from datetime import datetime
import json

from models import DatabaseManager, UserSettings, model_to_dict
from config import Config

settings_bp = Blueprint('settings', __name__)

db_manager = DatabaseManager(Config.DATABASE_URL)

DEFAULT_USER_ID = 'default_user'

DEFAULT_SETTINGS = {
    'theme': 'dark',
    'language': 'zh',
    'timezone': 'Asia/Shanghai',
    'compact_mode': False,
    'chart_settings': {
        'defaultTimeframe': 'H1',
        'chartTheme': 'dark',
        'showGrid': True,
        'showVolume': True
    },
    'notification_settings': {
        'emailNotifications': True,
        'pushNotifications': True,
        'soundNotifications': True,
        'desktopNotifications': False
    },
    'system_settings': {
        'autoRefresh': True,
        'refreshInterval': 5,
        'dataRetention': 30,
        'logLevel': 'info'
    }
}


@settings_bp.route('/settings', methods=['GET'])
def get_settings():
    """获取用户设置"""
    try:
        session = db_manager.get_session()
        user_settings = session.query(UserSettings).filter(
            UserSettings.user_id == DEFAULT_USER_ID
        ).first()
        
        if not user_settings:
            user_settings = UserSettings(
                user_id=DEFAULT_USER_ID,
                theme=DEFAULT_SETTINGS['theme'],
                language=DEFAULT_SETTINGS['language'],
                timezone=DEFAULT_SETTINGS['timezone'],
                chart_settings=json.dumps(DEFAULT_SETTINGS['chart_settings']),
                notification_settings=json.dumps(DEFAULT_SETTINGS['notification_settings']),
                risk_settings=json.dumps(DEFAULT_SETTINGS['system_settings'])
            )
            session.add(user_settings)
            session.commit()
        
        chart_settings = json.loads(user_settings.chart_settings) if user_settings.chart_settings else DEFAULT_SETTINGS['chart_settings']
        notification_settings = json.loads(user_settings.notification_settings) if user_settings.notification_settings else DEFAULT_SETTINGS['notification_settings']
        system_settings = json.loads(user_settings.risk_settings) if user_settings.risk_settings else DEFAULT_SETTINGS['system_settings']
        
        result = {
            'theme': user_settings.theme,
            'language': user_settings.language,
            'timezone': user_settings.timezone,
            'compactMode': getattr(user_settings, 'compact_mode', False),
            'chartSettings': chart_settings,
            'notificationSettings': notification_settings,
            'systemSettings': system_settings
        }
        
        session.close()
        return jsonify({'success': True, 'data': result})
        
    except Exception as e:
        logger.error(f"获取设置失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@settings_bp.route('/settings', methods=['PUT'])
def update_settings():
    """更新用户设置"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '无效的请求数据'}), 400
        
        session = db_manager.get_session()
        user_settings = session.query(UserSettings).filter(
            UserSettings.user_id == DEFAULT_USER_ID
        ).first()
        
        if not user_settings:
            user_settings = UserSettings(
                user_id=DEFAULT_USER_ID,
                theme=DEFAULT_SETTINGS['theme'],
                language=DEFAULT_SETTINGS['language'],
                timezone=DEFAULT_SETTINGS['timezone']
            )
            session.add(user_settings)
        
        if 'theme' in data:
            user_settings.theme = data['theme']
        if 'language' in data:
            user_settings.language = data['language']
        if 'timezone' in data:
            user_settings.timezone = data['timezone']
        
        if 'chartSettings' in data:
            user_settings.chart_settings = json.dumps(data['chartSettings'])
        if 'notificationSettings' in data:
            user_settings.notification_settings = json.dumps(data['notificationSettings'])
        if 'systemSettings' in data:
            user_settings.risk_settings = json.dumps(data['systemSettings'])
        
        user_settings.updated_at = datetime.now()
        session.commit()
        session.close()
        
        return jsonify({'success': True, 'message': '设置已保存'})
        
    except Exception as e:
        logger.error(f"更新设置失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@settings_bp.route('/settings/reset', methods=['POST'])
def reset_settings():
    """重置设置为默认值"""
    try:
        session = db_manager.get_session()
        user_settings = session.query(UserSettings).filter(
            UserSettings.user_id == DEFAULT_USER_ID
        ).first()
        
        if user_settings:
            user_settings.theme = DEFAULT_SETTINGS['theme']
            user_settings.language = DEFAULT_SETTINGS['language']
            user_settings.timezone = DEFAULT_SETTINGS['timezone']
            user_settings.chart_settings = json.dumps(DEFAULT_SETTINGS['chart_settings'])
            user_settings.notification_settings = json.dumps(DEFAULT_SETTINGS['notification_settings'])
            user_settings.risk_settings = json.dumps(DEFAULT_SETTINGS['system_settings'])
            user_settings.updated_at = datetime.now()
        else:
            user_settings = UserSettings(
                user_id=DEFAULT_USER_ID,
                theme=DEFAULT_SETTINGS['theme'],
                language=DEFAULT_SETTINGS['language'],
                timezone=DEFAULT_SETTINGS['timezone'],
                chart_settings=json.dumps(DEFAULT_SETTINGS['chart_settings']),
                notification_settings=json.dumps(DEFAULT_SETTINGS['notification_settings']),
                risk_settings=json.dumps(DEFAULT_SETTINGS['system_settings'])
            )
            session.add(user_settings)
        
        session.commit()
        session.close()
        
        return jsonify({'success': True, 'message': '设置已重置为默认值'})
        
    except Exception as e:
        logger.error(f"重置设置失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

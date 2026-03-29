import os
from dataclasses import dataclass, field
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Config:
    # Flask配置
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG: bool = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # 数据库配置
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'sqlite:///forex_trading.db')
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # MT5配置
    MT5_TIMEOUT: int = int(os.getenv('MT5_TIMEOUT', '30'))
    MT5_ACCOUNT: str = os.getenv('MT5_ACCOUNT', '')
    MT5_PASSWORD: str = os.getenv('MT5_PASSWORD', '')
    MT5_SERVER: str = os.getenv('MT5_SERVER', '')
    
    # WebSocket配置
    WS_HOST: str = os.getenv('WS_HOST', '0.0.0.0')
    WS_PORT: int = int(os.getenv('WS_PORT', '65534'))
    
    # 交易配置
    MAX_POSITIONS: int = int(os.getenv('MAX_POSITIONS', '100'))
    RISK_PERCENTAGE: float = float(os.getenv('RISK_PERCENTAGE', '2.0'))
    
    # 缓存配置
    CACHE_TTL: int = int(os.getenv('CACHE_TTL', '300'))  # 5分钟
    MARKET_DATA_TTL: int = int(os.getenv('MARKET_DATA_TTL', '60'))  # 1分钟
    
    # 日志配置
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE: str = os.getenv('LOG_FILE', 'app.log')
    
    # CORS配置
    CORS_ORIGINS: List[str] = field(default_factory=lambda: ['http://localhost:3000', 'http://127.0.0.1:3000'])
    
    # 邮件配置
    SMTP_HOST: str = os.getenv('SMTP_HOST', 'smtp.qq.com')
    SMTP_PORT: int = int(os.getenv('SMTP_PORT', '465'))
    SMTP_USER: str = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD: str = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM: str = os.getenv('SMTP_FROM', '')
    SMTP_USE_SSL: bool = os.getenv('SMTP_USE_SSL', 'True').lower() == 'true'
    
    # 支付宝支付配置
    ALIPAY_APP_ID: str = os.getenv('ALIPAY_APP_ID', '')
    ALIPAY_PRIVATE_KEY: str = os.getenv('ALIPAY_PRIVATE_KEY', '')
    ALIPAY_PUBLIC_KEY: str = os.getenv('ALIPAY_PUBLIC_KEY', '')
    ALIPAY_NOTIFY_URL: str = os.getenv('ALIPAY_NOTIFY_URL', '')
    ALIPAY_RETURN_URL: str = os.getenv('ALIPAY_RETURN_URL', '')
    ALIPAY_SANDBOX: bool = os.getenv('ALIPAY_SANDBOX', 'True').lower() == 'true'
    
    # 微信支付配置
    WECHAT_APP_ID: str = os.getenv('WECHAT_APP_ID', '')
    WECHAT_MCH_ID: str = os.getenv('WECHAT_MCH_ID', '')
    WECHAT_API_KEY: str = os.getenv('WECHAT_API_KEY', '')
    WECHAT_API_V3_KEY: str = os.getenv('WECHAT_API_V3_KEY', '')
    WECHAT_NOTIFY_URL: str = os.getenv('WECHAT_NOTIFY_URL', '')
    WECHAT_CERT_PATH: str = os.getenv('WECHAT_CERT_PATH', '')
    WECHAT_KEY_PATH: str = os.getenv('WECHAT_KEY_PATH', '')
    WECHAT_SANDBOX: bool = os.getenv('WECHAT_SANDBOX', 'True').lower() == 'true'
    
    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        """获取所有配置项"""
        return {
            key: value for key, value in cls.__dict__.items() 
            if not key.startswith('_') and not callable(value)
        }

# 开发环境配置
class DevelopmentConfig(Config):
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

# 生产环境配置
class ProductionConfig(Config):
    DEBUG = False
    LOG_LEVEL = 'WARNING'

# 测试环境配置
class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    DATABASE_URL = 'postgresql://postgres:password@localhost:5432/forex_trading_test'

# 配置映射
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config(config_name: str = None) -> Config:
    """获取指定环境的配置"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    return config_map.get(config_name, DevelopmentConfig)()
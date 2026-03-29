from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
import json
import enum

Base = declarative_base()

class MembershipLevel(enum.Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    membership_level = Column(String(20), default='free')
    membership_expire_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    mt5_accounts = relationship("UserMT5Account", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("UserAPIKey", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("UserSubscription", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    operation_logs = relationship("UserOperationLog", back_populates="user", cascade="all, delete-orphan")
    strategies = relationship("UserStrategy", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserMT5Account(Base):
    __tablename__ = 'user_mt5_accounts'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    account_name = Column(String(100), nullable=False)
    login = Column(String(50), nullable=False)
    password = Column(String(255), nullable=False)
    server = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_primary = Column(Boolean, default=False)
    last_connected_at = Column(DateTime, nullable=True)
    connection_status = Column(String(20), default='disconnected')
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="mt5_accounts")
    strategies = relationship("UserStrategy", back_populates="mt5_account", cascade="all, delete-orphan")

class UserAPIKey(Base):
    __tablename__ = 'user_api_keys'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    key_name = Column(String(100), nullable=False)
    api_key = Column(String(64), unique=True, nullable=False, index=True)
    api_secret = Column(String(64), nullable=False)
    permissions = Column(Text, default='read')
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    expire_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    user = relationship("User", back_populates="api_keys")

class UserSubscription(Base):
    __tablename__ = 'user_subscriptions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    plan = Column(String(20), nullable=False)
    status = Column(String(20), default='active')
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=False)
    auto_renew = Column(Boolean, default=False)
    payment_id = Column(Integer, ForeignKey('payments.id'), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="subscriptions")

class Payment(Base):
    __tablename__ = 'payments'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    order_no = Column(String(64), unique=True, nullable=False, index=True)
    transaction_id = Column(String(64), nullable=True, index=True)
    payment_method = Column(String(20), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default='CNY')
    status = Column(String(20), default='pending')
    plan = Column(String(20), nullable=False)
    duration_months = Column(Integer, default=1)
    payment_data = Column(Text, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="payments")

class UserStrategy(Base):
    __tablename__ = 'user_strategies'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    mt5_account_id = Column(Integer, ForeignKey('user_mt5_accounts.id'), nullable=False)
    strategy_name = Column(String(100), nullable=False)
    template_id = Column(String(50), nullable=False)
    parameters = Column(Text)
    status = Column(String(20), default='stopped')
    total_trades = Column(Integer, default=0)
    total_profit = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    win_rate = Column(Float, default=0.0)
    started_at = Column(DateTime, nullable=True)
    stopped_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    mt5_account = relationship("UserMT5Account", back_populates="strategies")
    user = relationship("User", back_populates="strategies")

class UserOperationLog(Base):
    __tablename__ = 'user_operation_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    operation_type = Column(String(50), nullable=False)
    operation_detail = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    user = relationship("User", back_populates="operation_logs")

class StrategyTemplate(Base):
    __tablename__ = 'strategy_templates'
    
    id = Column(Integer, primary_key=True)
    template_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    risk_level = Column(String(20), default='medium')
    default_parameters = Column(Text)
    parameters_schema = Column(Text)
    performance = Column(Text)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Account(Base):
    __tablename__ = 'accounts'
    
    id = Column(Integer, primary_key=True)
    account_id = Column(String(50), unique=True, nullable=False, index=True)
    login = Column(String(100), nullable=False)
    server = Column(String(100), nullable=False)
    balance = Column(Float, default=0.0)
    equity = Column(Float, default=0.0)
    margin = Column(Float, default=0.0)
    free_margin = Column(Float, default=0.0)
    margin_level = Column(Float, default=0.0)
    currency = Column(String(10), default='USD')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 关联关系
    positions = relationship("Position", back_populates="account")
    trades = relationship("Trade", back_populates="account")
    orders = relationship("Order", back_populates="account")

class Position(Base):
    __tablename__ = 'positions'
    
    id = Column(Integer, primary_key=True)
    ticket = Column(String(50), unique=True, nullable=False, index=True)
    account_id = Column(String(50), ForeignKey('accounts.account_id'), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    type = Column(String(10), nullable=False)  # buy/sell
    volume = Column(Float, nullable=False)
    open_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    sl = Column(Float, default=0.0)  # 止损
    tp = Column(Float, default=0.0)  # 止盈
    profit = Column(Float, default=0.0)
    swap = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)
    open_time = Column(DateTime, nullable=False)
    magic_number = Column(Integer, default=0)
    comment = Column(String(255), default='')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 关联关系
    account = relationship("Account", back_populates="positions")

class Trade(Base):
    __tablename__ = 'trades'
    
    id = Column(Integer, primary_key=True)
    ticket = Column(String(50), unique=True, nullable=False, index=True)
    account_id = Column(String(50), ForeignKey('accounts.account_id'), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # buy/sell/balance/credit
    volume = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    profit = Column(Float, default=0.0)
    swap = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)
    order_ticket = Column(String(50), nullable=False)
    position_ticket = Column(String(50), nullable=False)
    magic_number = Column(Integer, default=0)
    comment = Column(String(255), default='')
    trade_time = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())
    
    # 关联关系
    account = relationship("Account", back_populates="trades")

class Order(Base):
    __tablename__ = 'orders'
    
    id = Column(Integer, primary_key=True)
    ticket = Column(String(50), unique=True, nullable=False, index=True)
    account_id = Column(String(50), ForeignKey('accounts.account_id'), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # buy/sell/buy_limit/sell_limit/buy_stop/sell_stop
    volume = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    sl = Column(Float, default=0.0)
    tp = Column(Float, default=0.0)
    current_volume = Column(Float, nullable=False)
    open_time = Column(DateTime, nullable=False)
    expiration_time = Column(DateTime, nullable=True)
    magic_number = Column(Integer, default=0)
    comment = Column(String(255), default='')
    status = Column(String(20), default='pending')  # pending/filled/cancelled
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 关联关系
    account = relationship("Account", back_populates="orders")

class Strategy(Base):
    __tablename__ = 'strategies'
    
    id = Column(Integer, primary_key=True)
    strategy_id = Column(String(100), nullable=False, unique=True, index=True)  # 唯一策略ID
    name = Column(String(100), nullable=False)
    template_id = Column(String(50), nullable=False)  # 策略模板ID
    parameters = Column(Text)  # JSON格式的参数配置
    status = Column(String(20), default='stopped')  # running/stopped/paused/error
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 关联关系
    executions = relationship("StrategyExecution", back_populates="strategy")

class StrategyExecution(Base):
    __tablename__ = 'strategy_executions'
    
    id = Column(Integer, primary_key=True)
    strategy_id = Column(Integer, ForeignKey('strategies.id'), nullable=False)
    account_id = Column(String(50), ForeignKey('accounts.account_id'), nullable=False)
    parameters = Column(Text)  # JSON格式的执行参数
    status = Column(String(20), default='stopped')  # running/stopped/paused/error
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    total_trades = Column(Integer, default=0)
    total_profit = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 关联关系
    strategy = relationship("Strategy", back_populates="executions")

class MarketData(Base):
    __tablename__ = 'market_data'
    
    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), nullable=False, index=True)
    timeframe = Column(String(10), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Integer, default=0)
    spread = Column(Integer, default=0)
    real_volume = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('idx_symbol_timeframe_timestamp', 'symbol', 'timeframe', 'timestamp'),
    )

class UserSettings(Base):
    __tablename__ = 'user_settings'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True, index=True)
    theme = Column(String(20), default='dark')
    language = Column(String(10), default='zh')
    timezone = Column(String(50), default='UTC')
    chart_settings = Column(Text)
    notification_settings = Column(Text)
    risk_settings = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="settings")

class TradingStats(Base):
    __tablename__ = 'trading_stats'
    
    id = Column(Integer, primary_key=True)
    account_id = Column(String(50), ForeignKey('accounts.account_id'), nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    total_profit = Column(Float, default=0.0)
    total_loss = Column(Float, default=0.0)
    gross_profit = Column(Float, default=0.0)
    gross_loss = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    sharpe_ratio = Column(Float, default=0.0)
    win_rate = Column(Float, default=0.0)
    profit_factor = Column(Float, default=0.0)
    average_win = Column(Float, default=0.0)
    average_loss = Column(Float, default=0.0)
    largest_win = Column(Float, default=0.0)
    largest_loss = Column(Float, default=0.0)
    consecutive_wins = Column(Integer, default=0)
    consecutive_losses = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    
    # 关联关系
    account = relationship("Account")

# 数据库连接和会话管理
class DatabaseManager:
    def __init__(self, database_url: str):
        self.engine = create_engine(
            database_url,
            pool_size=50,
            max_overflow=20,
            pool_timeout=10,
            pool_recycle=1800,
            pool_pre_ping=True,
            echo=False
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_session(self):
        return self.SessionLocal()
    
    def create_tables(self):
        Base.metadata.create_all(self.engine)

# JSON序列化工具
def model_to_dict(obj):
    """将SQLAlchemy模型转换为字典"""
    if obj is None:
        return None
    
    result = {}
    for column in obj.__table__.columns:
        value = getattr(obj, column.name)
        if isinstance(value, datetime):
            value = value.isoformat()
        result[column.name] = value
    
    return result

def json_serializer(obj):
    """JSON序列化器"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
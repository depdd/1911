-- 外汇量化交易平台数据库初始化脚本
-- PostgreSQL数据库

-- 创建数据库（如果不存在）
-- CREATE DATABASE forex_trading;
-- \c forex_trading;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建账户表
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(50) UNIQUE NOT NULL,
    login VARCHAR(100) NOT NULL,
    server VARCHAR(100) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.0,
    equity DECIMAL(15, 2) DEFAULT 0.0,
    margin DECIMAL(15, 2) DEFAULT 0.0,
    free_margin DECIMAL(15, 2) DEFAULT 0.0,
    margin_level DECIMAL(8, 2) DEFAULT 0.0,
    currency VARCHAR(10) DEFAULT 'USD',
    leverage INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建持仓表
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    ticket VARCHAR(50) UNIQUE NOT NULL,
    account_id VARCHAR(50) REFERENCES accounts(account_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
    volume DECIMAL(10, 2) NOT NULL,
    open_price DECIMAL(12, 5) NOT NULL,
    current_price DECIMAL(12, 5) NOT NULL,
    sl DECIMAL(12, 5) DEFAULT 0.0,
    tp DECIMAL(12, 5) DEFAULT 0.0,
    profit DECIMAL(12, 2) DEFAULT 0.0,
    swap DECIMAL(10, 2) DEFAULT 0.0,
    commission DECIMAL(10, 2) DEFAULT 0.0,
    open_time TIMESTAMP NOT NULL,
    magic_number INTEGER DEFAULT 0,
    comment VARCHAR(255) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建交易记录表
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    ticket VARCHAR(50) UNIQUE NOT NULL,
    account_id VARCHAR(50) REFERENCES accounts(account_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    volume DECIMAL(10, 2) NOT NULL,
    price DECIMAL(12, 5) NOT NULL,
    profit DECIMAL(12, 2) DEFAULT 0.0,
    swap DECIMAL(10, 2) DEFAULT 0.0,
    commission DECIMAL(10, 2) DEFAULT 0.0,
    order_ticket VARCHAR(50) NOT NULL,
    position_ticket VARCHAR(50) NOT NULL,
    magic_number INTEGER DEFAULT 0,
    comment VARCHAR(255) DEFAULT '',
    trade_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建订单表
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    ticket VARCHAR(50) UNIQUE NOT NULL,
    account_id VARCHAR(50) REFERENCES accounts(account_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    volume DECIMAL(10, 2) NOT NULL,
    price DECIMAL(12, 5) NOT NULL,
    sl DECIMAL(12, 5) DEFAULT 0.0,
    tp DECIMAL(12, 5) DEFAULT 0.0,
    current_volume DECIMAL(10, 2) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    expiration_time TIMESTAMP,
    magic_number INTEGER DEFAULT 0,
    comment VARCHAR(255) DEFAULT '',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建策略表
CREATE TABLE IF NOT EXISTS strategies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    parameters JSON,
    is_active BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100) NOT NULL,
    performance_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建策略执行表
CREATE TABLE IF NOT EXISTS strategy_executions (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER REFERENCES strategies(id) ON DELETE CASCADE,
    account_id VARCHAR(50) REFERENCES accounts(account_id) ON DELETE CASCADE,
    parameters JSON,
    status VARCHAR(20) DEFAULT 'stopped',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    total_trades INTEGER DEFAULT 0,
    total_profit DECIMAL(15, 2) DEFAULT 0.0,
    max_drawdown DECIMAL(8, 2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建市场数据表
CREATE TABLE IF NOT EXISTS market_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    open DECIMAL(12, 5) NOT NULL,
    high DECIMAL(12, 5) NOT NULL,
    low DECIMAL(12, 5) NOT NULL,
    close DECIMAL(12, 5) NOT NULL,
    volume INTEGER DEFAULT 0,
    spread INTEGER DEFAULT 0,
    real_volume INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE NOT NULL,
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'zh',
    timezone VARCHAR(50) DEFAULT 'UTC',
    chart_settings JSON,
    notification_settings JSON,
    risk_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建交易统计表
CREATE TABLE IF NOT EXISTS trading_stats (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(50) REFERENCES accounts(account_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    total_profit DECIMAL(15, 2) DEFAULT 0.0,
    total_loss DECIMAL(15, 2) DEFAULT 0.0,
    gross_profit DECIMAL(15, 2) DEFAULT 0.0,
    gross_loss DECIMAL(15, 2) DEFAULT 0.0,
    max_drawdown DECIMAL(8, 2) DEFAULT 0.0,
    sharpe_ratio DECIMAL(6, 2) DEFAULT 0.0,
    win_rate DECIMAL(5, 2) DEFAULT 0.0,
    profit_factor DECIMAL(6, 2) DEFAULT 0.0,
    average_win DECIMAL(10, 2) DEFAULT 0.0,
    average_loss DECIMAL(10, 2) DEFAULT 0.0,
    largest_win DECIMAL(12, 2) DEFAULT 0.0,
    largest_loss DECIMAL(12, 2) DEFAULT 0.0,
    consecutive_wins INTEGER DEFAULT 0,
    consecutive_losses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(100),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建WebSocket消息表（用于消息历史）
CREATE TABLE IF NOT EXISTS websocket_messages (
    id SERIAL PRIMARY KEY,
    message_type VARCHAR(50) NOT NULL,
    data JSON,
    client_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_positions_account_id ON positions(account_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_trade_time ON trades(trade_time);
CREATE INDEX IF NOT EXISTS idx_orders_account_id ON orders(account_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timeframe ON market_data(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_trading_stats_account_id ON trading_stats(account_id);
CREATE INDEX IF NOT EXISTS idx_trading_stats_date ON trading_stats(date);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- 创建触发器函数（用于更新时间戳）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新时间戳的表创建触发器
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategy_executions_updated_at BEFORE UPDATE ON strategy_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认数据
INSERT INTO strategies (name, description, file_path, parameters, created_by, is_public) VALUES
('MA_Cross_Strategy', '移动平均线交叉策略', 'strategies/ma_cross.py', '{"fast_period": 20, "slow_period": 50, "volume": 0.1}', 'system', true),
('RSI_Strategy', 'RSI超买超卖策略', 'strategies/rsi_strategy.py', '{"rsi_period": 14, "overbought": 70, "oversold": 30}', 'system', true),
('Bollinger_Bands_Strategy', '布林带突破策略', 'strategies/bollinger_bands.py', '{"period": 20, "std_dev": 2}', 'system', true);

-- 创建视图
CREATE OR REPLACE VIEW v_account_summary AS
SELECT 
    a.account_id,
    a.login,
    a.server,
    a.balance,
    a.equity,
    a.margin,
    a.free_margin,
    a.margin_level,
    a.currency,
    COUNT(p.id) as open_positions,
    COALESCE(SUM(p.profit), 0) as total_profit,
    COALESCE(SUM(p.volume), 0) as total_volume
FROM accounts a
LEFT JOIN positions p ON a.account_id = p.account_id AND p.is_active = true
WHERE a.is_active = true
GROUP BY a.account_id, a.login, a.server, a.balance, a.equity, a.margin, a.free_margin, a.margin_level, a.currency;

CREATE OR REPLACE VIEW v_strategy_performance AS
SELECT 
    s.id,
    s.name,
    s.is_active,
    COUNT(se.id) as total_executions,
    AVG(se.total_profit) as avg_profit,
    MAX(se.total_profit) as max_profit,
    MIN(se.max_drawdown) as min_drawdown
FROM strategies s
LEFT JOIN strategy_executions se ON s.id = se.strategy_id
GROUP BY s.id, s.name, s.is_active;

-- 授予权限（根据需要调整）
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO forex_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO forex_user;
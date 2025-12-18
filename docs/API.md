# API文档

## 概述

外汇量化交易平台提供RESTful API和WebSocket API，支持实时数据获取、交易执行、策略管理等功能。

## 基础信息

- **Base URL**: `http://localhost:5000/api`
- **WebSocket URL**: `ws://localhost:5001`
- **认证方式**: Token认证（在请求头中携带）
- **数据格式**: JSON
- **编码**: UTF-8

## 认证

### 登录认证

```http
POST /api/mt5/connect
Content-Type: application/json

{
    "login": "123456",
    "password": "password",
    "server": "MetaQuotes-Demo"
}
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "123456",
            "username": "MT5_123456",
            "email": "123456@mt5.local",
            "role": "user",
            "isActive": true,
            "createdAt": "2024-01-01T00:00:00Z",
            "lastLogin": "2024-01-01T00:00:00Z"
        },
        "account": {
            "login": "123456",
            "server": "MetaQuotes-Demo",
            "balance": 10000.0,
            "equity": 10000.0,
            "margin": 0.0,
            "freeMargin": 10000.0,
            "marginLevel": 0.0,
            "currency": "USD",
            "leverage": 100,
            "profit": 0.0,
            "credit": 0.0,
            "company": "MetaQuotes Software Corp."
        },
        "token": "mt5_123456_1640995200"
    }
}
```

## MT5连接管理

### 获取连接状态

```http
GET /api/mt5/status
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "status": "connected",
        "account_info": {
            "login": "123456",
            "server": "MetaQuotes-Demo",
            "balance": 10000.0,
            "equity": 10000.0,
            "margin": 0.0,
            "free_margin": 10000.0,
            "margin_level": 0.0,
            "currency": "USD",
            "leverage": 100
        },
        "connected": true
    }
}
```

### 断开连接

```http
POST /api/mt5/disconnect
```

**响应示例：**
```json
{
    "success": true,
    "message": "Disconnected successfully"
}
```

## 账户管理

### 获取账户信息

```http
GET /api/account/info
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "login": "123456",
        "server": "MetaQuotes-Demo",
        "balance": 10000.0,
        "equity": 10000.0,
        "margin": 0.0,
        "free_margin": 10000.0,
        "margin_level": 0.0,
        "currency": "USD",
        "leverage": 100,
        "profit": 0.0,
        "credit": 0.0,
        "company": "MetaQuotes Software Corp."
    }
}
```

### 获取账户摘要

```http
GET /api/account/summary
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "balance": 10000.0,
        "equity": 10000.0,
        "margin": 0.0,
        "free_margin": 10000.0,
        "margin_level": 0.0,
        "total_positions": 2,
        "total_profit": 150.5,
        "currency": "USD"
    }
}
```

## 持仓管理

### 获取当前持仓

```http
GET /api/positions
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "positions": [
            {
                "ticket": "12345",
                "symbol": "EURUSD",
                "type": "buy",
                "volume": 0.1,
                "open_price": 1.08500,
                "current_price": 1.08650,
                "sl": 1.08000,
                "tp": 1.09000,
                "profit": 15.0,
                "swap": 0.0,
                "commission": -1.5,
                "open_time": "2024-01-01T10:00:00Z",
                "magic_number": 0,
                "comment": ""
            }
        ]
    }
}
```

### 平仓指定持仓

```http
POST /api/positions/{ticket}/close
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "ticket": "12345",
        "volume": 0.1,
        "price": 1.08650,
        "profit": 15.0,
        "message": "Position closed successfully"
    }
}
```

### 平仓所有持仓

```http
POST /api/positions/close_all
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "closed_positions": 2,
        "results": [
            {
                "ticket": "12345",
                "symbol": "EURUSD",
                "result": {
                    "success": true,
                    "profit": 15.0
                }
            }
        ]
    }
}
```

## 交易操作

### 下单

```http
POST /api/trade/order
Content-Type: application/json

{
    "symbol": "EURUSD",
    "type": "buy",
    "volume": 0.1,
    "price": 0,
    "sl": 1.08000,
    "tp": 1.09000,
    "comment": "MA Cross Strategy"
}
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "ticket": "67890",
        "volume": 0.1,
        "price": 1.08500,
        "comment": "Order placed successfully"
    }
}
```

## 市场数据

### 获取交易品种

```http
GET /api/market/symbols
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "all_symbols": ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
        "forex_pairs": ["EURUSD", "GBPUSD", "USDJPY"],
        "commodities": ["XAUUSD", "XAGUSD"],
        "indices": [],
        "total_count": 4
    }
}
```

### 获取Tick数据

```http
GET /api/market/tick/{symbol}
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "symbol": "EURUSD",
        "time": 1640995200,
        "bid": 1.08500,
        "ask": 1.08520,
        "last": 1.08510,
        "volume": 1000,
        "time_msc": 1640995200000,
        "flags": 0,
        "volume_real": 1000.0,
        "spread_points": 2.0,
        "mid_price": 1.08510
    }
}
```

### 获取历史K线数据

```http
GET /api/market/history/{symbol}/{timeframe}?count=100
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "symbol": "EURUSD",
        "timeframe": "H1",
        "data": [
            {
                "time": "2024-01-01T00:00:00Z",
                "open": 1.08400,
                "high": 1.08600,
                "low": 1.08300,
                "close": 1.08500,
                "volume": 1000,
                "ma_20": 1.08450
            }
        ],
        "count": 100
    }
}
```

## 数据分析

### 获取交易统计

```http
GET /api/analytics/summary?days=30
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "total_trades": 50,
        "profitable_trades": 32,
        "losing_trades": 18,
        "total_profit": 1250.50,
        "gross_profit": 2500.00,
        "gross_loss": 1249.50,
        "win_rate": 64.0,
        "profit_factor": 2.0,
        "max_drawdown": 5.2,
        "sharpe_ratio": 1.85,
        "period_days": 30
    }
}
```

## 策略管理

### 获取策略列表

```http
GET /api/strategies
```

**响应示例：**
```json
{
    "success": true,
    "data": {
        "strategies": [
            {
                "id": 1,
                "name": "MA_Cross_Strategy",
                "description": "移动平均线交叉策略",
                "is_active": true,
                "is_public": true,
                "created_by": "system",
                "performance": {
                    "total_trades": 156,
                    "win_rate": 68.5,
                    "total_profit": 1560.0
                }
            }
        ]
    }
}
```

### 启动策略

```http
POST /api/strategies/{id}/start
Content-Type: application/json

{
    "parameters": {
        "fast_period": 20,
        "slow_period": 50,
        "volume": 0.1
    }
}
```

**响应示例：**
```json
{
    "success": true,
    "message": "Strategy started successfully"
}
```

## WebSocket API

### 连接WebSocket

```javascript
const ws = new WebSocket('ws://localhost:5001');

ws.onopen = function() {
    console.log('WebSocket connected');
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
};
```

### 订阅频道

```javascript
// 订阅账户更新
ws.send(JSON.stringify({
    type: 'subscribe',
    data: {
        channels: ['account', 'positions', 'ticks']
    }
}));
```

### 消息格式

**账户更新消息：**
```json
{
    "type": "account_update",
    "data": {
        "login": "123456",
        "balance": 10000.0,
        "equity": 10050.0,
        "margin": 100.0,
        "free_margin": 9950.0,
        "margin_level": 10050.0
    },
    "timestamp": "2024-01-01T00:00:00Z"
}
```

**持仓更新消息：**
```json
{
    "type": "position_update",
    "data": {
        "positions": [...],
        "total": 2
    },
    "timestamp": "2024-01-01T00:00:00Z"
}
```

**Tick数据消息：**
```json
{
    "type": "tick_data",
    "data": {
        "symbol": "EURUSD",
        "bid": 1.08500,
        "ask": 1.08520,
        "last": 1.08510,
        "volume": 1000,
        "timestamp": 1640995200
    },
    "timestamp": "2024-01-01T00:00:00Z"
}
```

## 错误处理

### 错误响应格式

```json
{
    "success": false,
    "error": "错误描述",
    "code": "ERROR_CODE",
    "details": {
        "field": "具体错误信息"
    }
}
```

### 常见错误码

- `MT5_CONNECTION_FAILED` - MT5连接失败
- `INVALID_SYMBOL` - 无效的交易品种
- `INSUFFICIENT_FUNDS` - 资金不足
- `MAX_POSITIONS_REACHED` - 达到最大持仓数量
- `MARKET_CLOSED` - 市场已关闭
- `INVALID_ORDER_TYPE` - 无效的订单类型
- `ORDER_NOT_FOUND` - 订单不存在
- `STRATEGY_NOT_FOUND` - 策略不存在

## 限流说明

- **REST API**: 每个IP每分钟最多1000次请求
- **WebSocket**: 每个连接每秒最多100条消息
- **交易API**: 每个账户每分钟最多60次交易请求

## 版本信息

- **API版本**: v1.0.0
- **支持格式**: JSON
- **字符编码**: UTF-8
- **时区**: UTC

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持MT5连接和交易
- 实现基础策略系统
- 提供实时行情数据
- 完成WebSocket通信

---

**注意**: 本文档可能会随着API的更新而变化，请以实际API响应为准。
# 外汇量化交易平台项目结构大纲

## 项目根目录
```
/mnt/okcomputer/output/
├── backend/                    # Flask后端应用
│   ├── app.py                 # 主应用文件
│   ├── models.py              # 数据库模型
│   ├── websocket_server.py    # WebSocket服务器
│   ├── mt5_client.py          # MT5客户端封装
│   ├── strategies/            # 交易策略目录
│   │   ├── ma_cross.py       # 移动平均线交叉策略
│   │   ├── rsi_strategy.py   # RSI策略
│   │   └── bollinger_bands.py # 布林带策略
│   ├── api/                   # API路由
│   │   ├── dashboard.py      # 仪表板API
│   │   ├── market.py         # 行情数据API
│   │   ├── trading.py        # 交易API
│   │   ├── strategy.py       # 策略API
│   │   └── analytics.py      # 数据分析API
│   ├── requirements.txt       # Python依赖
│   └── config.py             # 配置文件
├── frontend/                   # React前端应用
│   ├── package.json          # Node.js依赖
│   ├── src/
│   │   ├── App.tsx           # 主应用组件
│   │   ├── main.tsx          # 入口文件
│   │   ├── components/       # 组件目录
│   │   │   ├── Dashboard/    # 仪表板组件
│   │   │   ├── MarketData/   # 行情数据组件
│   │   │   ├── TradingPanel/ # 交易面板组件
│   │   │   ├── StrategyStore/# 策略商店组件
│   │   │   ├── Analytics/    # 数据分析组件
│   │   │   └── Settings/     # 系统设置组件
│   │   ├── hooks/            # 自定义Hooks
│   │   ├── services/         # API服务
│   │   ├── utils/            # 工具函数
│   │   └── styles/           # 样式文件
│   ├── public/               # 静态资源
│   └── vite.config.ts        # Vite配置
├── database/                  # 数据库相关
│   ├── init.sql              # 数据库初始化脚本
│   └── migrations/           # 数据库迁移文件
├── docs/                     # 文档目录
│   ├── API.md               # API文档
│   ├── DEPLOYMENT.md        # 部署文档
│   └── USER_GUIDE.md        # 用户指南
└── scripts/                  # 脚本文件
    ├── start.sh             # 启动脚本
    └── setup.sh             # 环境设置脚本
```

## 核心功能模块

### 1. 仪表板模块 (Dashboard)
- **后端API**: 账户信息、持仓数据、资金曲线
- **前端组件**: 实时数据卡片、图表、快速交易面板
- **WebSocket**: 实时推送账户和持仓更新

### 2. MT5连接模块 (Connection)
- **后端服务**: MT5客户端管理、连接状态监控
- **前端组件**: 连接界面、状态指示器
- **功能**: 账户登录、服务器选择、心跳检测

### 3. 实时行情模块 (Market Data)
- **后端API**: K线数据、实时tick数据
- **前端组件**: 专业K线图表、技术指标
- **数据源**: MT5历史数据和实时数据

### 4. 交易管理模块 (Trading)
- **后端API**: 下单、平仓、修改订单
- **前端组件**: 交易面板、持仓管理
- **功能**: 快速交易、一键平仓、止损止盈设置

### 5. 策略管理模块 (Strategy)
- **后端服务**: 策略引擎、参数管理
- **前端组件**: 策略商店、参数配置界面
- **功能**: 策略启停、参数优化、性能监控

### 6. 数据分析模块 (Analytics)
- **后端API**: 交易统计、风险评估
- **前端组件**: 图表分析、报表展示
- **功能**: 绩效分析、回撤分析、风险指标

### 7. 系统设置模块 (Settings)
- **功能**: 主题切换、语言设置、个性化配置
- **存储**: Redis缓存用户偏好设置

## 技术栈

### 后端技术
- **框架**: Flask 2.3.3
- **数据库**: PostgreSQL + Redis
- **WebSocket**: gevent-websocket
- **MT5集成**: MetaTrader5 Python库
- **数据分析**: pandas, numpy, pandas-ta

### 前端技术
- **框架**: React 18 + TypeScript
- **UI库**: Ant Design 5.8.0
- **图表**: Lightweight Charts (TradingView)
- **状态管理**: Zustand
- **样式**: Styled-Components

## 部署架构
- **开发环境**: 本地运行，支持热重载
- **生产环境**: 支持Docker容器化部署
- **数据库**: PostgreSQL主库 + Redis缓存
- **Web服务器**: Nginx反向代理
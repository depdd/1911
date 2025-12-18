# 外汇量化交易平台

一个专业的外汇量化交易平台，支持MT5连接、实时行情、策略交易、数据分析等功能。

## 🌟 功能特性

### 核心功能
- **MT5账户连接** - 支持多账户管理，实时连接状态监控
- **实时行情数据** - 专业K线图表，多时间周期，技术指标
- **智能交易面板** - 一键交易，快速下单，持仓管理
- **量化策略系统** - 内置多种交易策略，支持自定义策略
- **数据分析中心** - 交易统计，风险评估，绩效分析
- **系统设置** - 个性化配置，主题切换，语言设置

### 技术特色
- **实时数据推送** - WebSocket技术，毫秒级数据更新
- **响应式设计** - 支持桌面端和移动端访问
- **未来魔幻UI** - 深色主题，霓虹蓝配色，科技感十足
- **高性能架构** - Flask + React，模块化设计
- **安全可靠** - 数据加密，权限控制，异常处理

## 🚀 快速开始

### 环境要求
- **Python 3.8+** - 后端运行环境
- **Node.js 16+** - 前端运行环境
- **PostgreSQL 12+** - 数据库（可选，默认使用SQLite）
- **Redis 6+** - 缓存服务（可选）
- **MetaTrader 5** - 交易终端

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd forex-trading-platform
```

2. **启动服务**
```bash
./scripts/start.sh
```

或者分别启动前后端：

**启动后端：**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```

**启动前端：**
```bash
cd frontend
npm install
npm run dev
```

3. **访问平台**
- 前端地址：http://localhost:3000
- 后端API：http://localhost:5000/api
- WebSocket：ws://localhost:5001

### 首次使用

1. **连接MT5账户**
   - 输入MT5账户号码
   - 输入账户密码
   - 选择服务器
   - 点击连接

2. **配置交易策略**
   - 浏览策略商店
   - 选择适合的策略
   - 配置策略参数
   - 启动策略运行

3. **开始交易**
   - 查看实时行情
   - 使用快速交易面板
   - 监控持仓状态
   - 分析交易数据

## 📁 项目结构

```
forex-trading-platform/
├── backend/                    # Flask后端应用
│   ├── api/                   # API路由
│   │   ├── dashboard.py      # 仪表板API
│   │   ├── market.py         # 行情数据API
│   │   ├── trading.py        # 交易API
│   │   ├── strategy.py       # 策略API
│   │   └── analytics.py      # 数据分析API
│   ├── strategies/           # 交易策略
│   │   ├── ma_cross.py      # 移动平均线交叉策略
│   │   ├── rsi_strategy.py  # RSI策略
│   │   └── bollinger_bands.py # 布林带策略
│   ├── app.py               # 主应用文件
│   ├── config.py            # 配置文件
│   ├── models.py            # 数据库模型
│   ├── mt5_client.py        # MT5客户端
│   ├── websocket_server.py  # WebSocket服务器
│   └── requirements.txt     # Python依赖
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/      # React组件
│   │   │   ├── Dashboard/   # 仪表板组件
│   │   │   ├── MarketData/  # 行情数据组件
│   │   │   ├── TradingPanel/ # 交易面板组件
│   │   │   ├── StrategyStore/ # 策略商店组件
│   │   │   ├── Analytics/   # 数据分析组件
│   │   │   ├── Settings/    # 系统设置组件
│   │   │   └── Layout/      # 布局组件
│   │   ├── contexts/        # React上下文
│   │   ├── services/        # API服务
│   │   ├── utils/           # 工具函数
│   │   └── styles/          # 样式文件
│   ├── package.json         # Node.js依赖
│   ├── vite.config.ts       # Vite配置
│   └── tsconfig.json        # TypeScript配置
├── database/                # 数据库相关
│   └── init.sql            # 数据库初始化脚本
├── scripts/                 # 脚本文件
│   └── start.sh            # 启动脚本
├── docs/                    # 文档目录
├── README.md               # 项目说明
└── LICENSE                 # 许可证
```

## 🛠️ 技术栈

### 后端技术
- **Flask 2.3.3** - Web框架
- **SQLAlchemy 2.0.23** - ORM框架
- **PostgreSQL** - 主数据库
- **Redis 5.0.1** - 缓存服务
- **WebSocket** - 实时通信
- **MetaTrader5** - MT5交易接口
- **Pandas** - 数据分析
- **Loguru** - 日志管理

### 前端技术
- **React 18** - UI框架
- **TypeScript 5.0** - 类型系统
- **Ant Design 5.8** - UI组件库
- **Styled-Components** - CSS-in-JS
- **Lightweight Charts** - 专业图表库
- **WebSocket** - 实时数据
- **Zustand** - 状态管理

### 部署技术
- **Nginx** - 反向代理
- **Gunicorn** - WSGI服务器
- **Docker** - 容器化部署
- **PM2** - 进程管理

## 📊 交易策略

### 内置策略
1. **移动平均线交叉策略**
   - 快慢均线交叉信号
   - 趋势跟踪策略
   - 适合趋势行情

2. **RSI超买超卖策略**
   - RSI指标识别
   - 反转交易机会
   - 适合震荡行情

3. **布林带突破策略**
   - 布林带上下轨
   - 突破交易策略
   - 适合波动行情

### 策略管理
- **策略商店** - 浏览和选择策略
- **参数配置** - 自定义策略参数
- **性能监控** - 实时策略表现
- **风险管理** - 止损止盈设置

## 🔧 配置说明

### 环境变量
```bash
# Flask配置
FLASK_ENV=development
SECRET_KEY=your-secret-key
DEBUG=True

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/forex_trading
REDIS_URL=redis://localhost:6379/0

# MT5配置
MT5_ACCOUNT=your-mt5-account
MT5_PASSWORD=your-mt5-password
MT5_SERVER=your-mt5-server

# WebSocket配置
WS_HOST=0.0.0.0
WS_PORT=5001
```

### 配置文件
- `backend/config.py` - 后端配置
- `frontend/vite.config.ts` - 前端构建配置
- `frontend/src/styles/theme.ts` - 主题配置

## 📈 性能优化

### 后端优化
- **异步处理** - 支持异步API调用
- **缓存机制** - Redis缓存热点数据
- **连接池** - 数据库连接池管理
- **日志监控** - 详细的性能日志

### 前端优化
- **代码分割** - 按需加载组件
- **虚拟滚动** - 大数据列表优化
- **图表优化** - 高性能图表渲染
- **缓存策略** - 智能数据缓存

### 部署优化
- **负载均衡** - 多实例部署
- **CDN加速** - 静态资源加速
- **压缩优化** - Gzip压缩
- **缓存策略** - 浏览器缓存

## 🔒 安全特性

### 数据安全
- **数据加密** - 敏感数据加密存储
- **权限控制** - 基于角色的权限管理
- **输入验证** - 严格的输入验证
- **SQL注入防护** - ORM参数化查询

### 网络安全
- **HTTPS支持** - SSL/TLS加密
- **CORS配置** - 跨域请求控制
- **请求限流** - API请求频率限制
- **WebSocket安全** - 连接认证和授权

## 🐛 故障排除

### 常见问题
1. **MT5连接失败**
   - 检查MT5终端是否运行
   - 确认账户信息正确
   - 检查网络连接

2. **WebSocket连接失败**
   - 检查端口是否被占用
   - 确认防火墙设置
   - 检查网络连接

3. **前端构建失败**
   - 检查Node.js版本
   - 清理npm缓存
   - 重新安装依赖

### 日志查看
```bash
# 后端日志
tail -f backend/app.log

# 前端日志
npm run dev
```

## 🤝 贡献指南

### 开发流程
1. Fork项目
2. 创建功能分支
3. 提交代码变更
4. 创建Pull Request

### 代码规范
- **Python** - 遵循PEP 8规范
- **TypeScript** - 遵循ESLint规则
- **Git** - 遵循Conventional Commits

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

- **项目维护** - 开发团队
- **技术支持** - 技术支持团队
- **商业合作** - 商务团队

## 🙏 致谢

感谢以下开源项目的支持：
- [Flask](https://flask.palletsprojects.com/)
- [React](https://reactjs.org/)
- [Ant Design](https://ant.design/)
- [MetaTrader 5](https://www.metatrader5.com/)
- [TradingView](https://www.tradingview.com/)

---

**免责声明**：本项目仅供学习和研究使用，不构成投资建议。交易有风险，投资需谨慎。
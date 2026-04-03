# 外汇量化交易平台

一个专业的外汇量化交易平台，支持MT5连接、实时行情、策略交易、数据分析等功能。

## 🌟 功能特性

### 核心功能
- **用户认证系统** - 支持邮箱验证码登录、密码登录、自动注册
- **MT5账户管理** - 多账户管理，实时连接状态监控
- **实时行情数据** - 专业K线图表，多时间周期，技术指标
- **智能交易面板** - 一键交易，快速下单，持仓管理
- **量化策略系统** - 动态加载Python策略，策略模板管理
- **数据分析中心** - 交易统计，风险评估，绩效分析
- **订阅管理系统** - 订阅计划管理、订单管理（支付接口为模拟实现）
- **管理后台** - 策略管理、用户管理、系统监控

### 技术特色
- **实时数据推送** - WebSocket技术，毫秒级数据更新
- **响应式设计** - 支持桌面端和移动端访问
- **现代UI设计** - 深色主题，科技感界面
- **高性能架构** - Flask + React，模块化设计
- **安全可靠** - JWT认证，数据加密，权限控制
- **策略动态加载** - 支持上传.py策略文件，实时加载运行

## 🚀 快速开始

### 环境要求
- **Python 3.8+** - 后端运行环境
- **Node.js 16+** - 前端运行环境
- **Redis 6+** - 缓存服务（必需）
- **MetaTrader 5** - 交易终端（可选）
- **PostgreSQL 12+** - 数据库（可选，默认使用SQLite）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd forex-trading-platform
```

2. **安装后端依赖**
```bash
cd backend
pip install -r requirements.txt
```

3. **安装前端依赖**
```bash
cd frontend
npm install
```

4. **配置环境变量**

创建 `backend/.env` 文件：
```env
# Flask配置
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-in-production
DEBUG=True

# 数据库配置
DATABASE_URL=sqlite:///forex_trading.db
REDIS_URL=redis://localhost:6379/0

# WebSocket配置
WS_HOST=0.0.0.0
WS_PORT=65534

# 邮件配置
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your-email@qq.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=your-email@qq.com
SMTP_USE_SSL=True

# MT5配置（可选）
MT5_ACCOUNT=
MT5_PASSWORD=
MT5_SERVER=
```

5. **初始化数据库**
```bash
cd backend
python init_db.py
python scripts/create_admin.py
```

6. **启动Redis服务**
```bash
redis-server
```

### 启动项目

**方式一：分别启动各服务**

1. 启动后端服务：
```bash
cd backend
python app.py
```

2. 启动WebSocket服务：
```bash
cd backend
python start_websocket.py
```

3. 启动前端服务：
```bash
cd frontend
npm run dev
```

**方式二：使用启动脚本（Linux/Mac）**
```bash
./scripts/start.sh
```

### 访问平台
- **前端地址**：http://localhost:3000
- **后端API**：http://localhost:5000/api
- **WebSocket**：ws://localhost:65534

### 默认管理员账号
- **邮箱**：admin@system.local
- **密码**：admin

## 📁 项目结构

```
forex-trading-platform/
├── backend/                    # Flask后端应用
│   ├── api/                   # API路由模块
│   │   ├── admin.py          # 管理员API
│   │   ├── analytics.py      # 数据分析API
│   │   ├── auth.py           # 用户认证API
│   │   ├── dashboard.py      # 仪表板API
│   │   ├── legal.py          # 法律文档API
│   │   ├── market.py         # 行情数据API
│   │   ├── payment.py        # 支付API（模拟实现）
│   │   ├── risk.py           # 风险管理API
│   │   ├── settings.py       # 设置API
│   │   ├── strategy.py       # 策略API
│   │   ├── user_accounts.py  # 用户账户API
│   │   └── user_strategies.py # 用户策略API
│   ├── scripts/              # 脚本文件
│   │   └── create_admin.py  # 创建管理员脚本
│   ├── services/             # 服务模块
│   │   ├── cache_service.py # 缓存服务
│   │   └── email_service.py # 邮件服务
│   ├── strategies/           # 交易策略
│   │   ├── base_strategy.py # 策略基类
│   │   ├── strategy_manager.py # 策略管理器
│   │   ├── strategy_logger.py # 策略日志
│   │   ├── dual_grid_martin.py # 双向网格马丁策略
│   │   ├── linshu.py        # 林树策略
│   │   ├── martin_grid.py   # 马丁网格策略
│   │   ├── rsi_reversal.py  # RSI反转策略
│   │   └── shuangxiang.py   # 双向策略
│   ├── app.py               # 主应用文件
│   ├── config.py            # 配置文件
│   ├── models.py            # 数据库模型
│   ├── mt5_client.py        # MT5客户端
│   ├── websocket_server.py  # WebSocket服务器
│   ├── start_websocket.py   # WebSocket启动脚本
│   └── requirements.txt     # Python依赖
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/      # React组件
│   │   │   ├── Admin/       # 管理后台组件
│   │   │   ├── Analytics/   # 数据分析组件
│   │   │   ├── Auth/        # 认证组件（登录、定价、用户中心）
│   │   │   ├── Dashboard/   # 仪表板组件
│   │   │   ├── Layout/      # 布局组件
│   │   │   ├── MarketData/  # 行情数据组件
│   │   │   ├── Settings/    # 设置组件
│   │   │   ├── StrategyStore/ # 策略商店组件
│   │   │   └── TradingPanel/ # 交易面板组件
│   │   ├── contexts/        # React上下文
│   │   ├── hooks/           # 自定义Hooks
│   │   ├── i18n/            # 国际化
│   │   ├── services/        # API服务
│   │   ├── styles/          # 样式文件
│   │   ├── types/           # TypeScript类型
│   │   ├── utils/           # 工具函数
│   │   └── workers/         # Web Workers
│   ├── package.json         # Node.js依赖
│   ├── vite.config.ts       # Vite配置
│   └── tsconfig.json        # TypeScript配置
├── database/                # 数据库相关
│   └── init.sql            # 数据库初始化脚本
├── docs/                    # 文档目录
│   ├── API.md              # API文档
│   └── DEPLOYMENT.md       # 部署文档
├── scripts/                 # 脚本文件
│   └── start.sh            # 启动脚本
├── .gitignore              # Git忽略文件
└── README.md               # 项目说明
```

## 🛠️ 技术栈

### 后端技术
- **Flask 2.3.3** - Web框架
- **SQLAlchemy 2.0.23** - ORM框架
- **Redis 5.0.1** - 缓存服务
- **WebSocket** - 实时通信
- **MetaTrader5 5.0.44** - MT5交易接口
- **Pandas 2.1.4** - 数据分析
- **NumPy 1.25.2** - 数值计算
- **Loguru 0.7.2** - 日志管理
- **PyJWT 2.8.0** - JWT认证
- **Bcrypt 4.1.2** - 密码加密

### 前端技术
- **React 18.2** - UI框架
- **TypeScript 5.0** - 类型系统
- **Ant Design 5.8** - UI组件库
- **Styled-Components 6.0** - CSS-in-JS
- **Lightweight Charts 4.0** - 专业图表库
- **ECharts 5.4** - 数据可视化
- **React Router 6.15** - 路由管理
- **Zustand 4.4** - 状态管理
- **Axios 1.5** - HTTP客户端
- **Vite 4.4** - 构建工具

## 📊 交易策略

### 策略系统特性
- **动态加载** - 支持上传.py策略文件，实时加载运行
- **策略基类** - 提供BaseStrategy基类，简化策略开发
- **参数配置** - 灵活的策略参数配置系统
- **性能监控** - 实时监控策略运行状态和性能
- **日志记录** - 详细的策略运行日志

### 内置策略
1. **双向网格马丁策略 (dual_grid_martin)**
   - 双向网格交易
   - 马丁加仓策略
   - 适合震荡行情

2. **林树策略 (linshu)**
   - 趋势跟踪策略
   - 动态止损止盈
   - 适合趋势行情

3. **马丁网格策略 (martin_grid)**
   - 网格交易策略
   - 马丁加仓机制
   - 适合震荡行情

4. **RSI反转策略 (rsi_reversal)**
   - RSI指标识别
   - 反转交易机会
   - 适合震荡行情

5. **双向策略 (shuangxiang)**
   - 双向交易策略
   - 对冲风险
   - 适合各种行情

### 自定义策略开发

继承BaseStrategy类实现自定义策略：

```python
from strategies.base_strategy import BaseStrategy

class MyStrategy(BaseStrategy):
    def __init__(self, params: dict, strategy_id: str = None):
        super().__init__(params, strategy_id)
    
    def on_tick(self):
        # 实现策略逻辑
        pass
    
    def get_performance(self) -> dict:
        # 返回策略性能数据
        return super().get_performance()
```

## 🔧 API文档

### 认证API
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/verify-code` - 验证验证码
- `POST /api/auth/login-with-code` - 验证码登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取用户信息
- `PUT /api/auth/me` - 更新用户信息
- `POST /api/auth/change-password` - 修改密码

### 市场数据API
- `GET /api/market/symbols` - 获取交易品种
- `GET /api/market/tick/<symbol>` - 获取tick数据
- `GET /api/market/history/<symbol>/<timeframe>` - 获取历史数据
- `GET /api/market/info/<symbol>` - 获取品种信息

### 策略API
- `GET /api/strategies/templates` - 获取策略模板
- `GET /api/strategies/templates/<template_id>` - 获取单个模板
- `GET /api/strategies` - 获取用户策略
- `POST /api/strategies` - 创建策略
- `GET /api/strategies/<id>` - 获取策略详情
- `PUT /api/strategies/<id>` - 更新策略
- `DELETE /api/strategies/<id>` - 删除策略
- `POST /api/strategies/<id>/start` - 启动策略
- `POST /api/strategies/<id>/stop` - 停止策略
- `GET /api/strategies/<id>/performance` - 获取策略性能
- `GET /api/strategies/<id>/logs` - 获取策略日志

### 交易API
- `POST /api/trade/order` - 下单
- `GET /api/positions` - 获取持仓
- `POST /api/positions/<ticket>/close` - 平仓
- `POST /api/positions/close_all` - 全部平仓

### 支付API（模拟实现）
- `GET /api/payment/plans` - 获取订阅计划
- `GET /api/payment/subscription` - 获取用户订阅
- `POST /api/payment/create-order` - 创建订单
- `GET /api/payment/orders` - 获取订单列表
- `GET /api/payment/order/<order_no>` - 获取订单详情
- `POST /api/payment/callback/alipay` - 支付宝回调（模拟）
- `POST /api/payment/callback/wechat` - 微信回调（模拟）
- `POST /api/payment/mock-payment/<order_no>` - 模拟支付（测试用）
- `POST /api/payment/cancel-subscription` - 取消订阅

**注意**：支付功能为模拟实现，支付链接为模拟数据，实际使用需接入真实支付接口。

### 管理员API
- `GET /api/admin/stats` - 系统统计
- `GET /api/admin/users` - 用户列表
- `GET /api/admin/users/<id>` - 用户详情
- `PUT /api/admin/users/<id>/status` - 更新用户状态
- `PUT /api/admin/users/<id>/membership` - 更新用户会员等级
- `GET /api/admin/strategy-templates` - 策略模板列表
- `POST /api/admin/strategy-templates` - 创建策略模板
- `PUT /api/admin/strategy-templates/<id>` - 更新策略模板
- `DELETE /api/admin/strategy-templates/<id>` - 删除策略模板
- `GET /api/admin/strategy-files` - 策略文件列表
- `POST /api/admin/strategy-files` - 上传策略文件
- `DELETE /api/admin/strategy-files/<id>` - 删除策略文件
- `POST /api/admin/strategy-files/<id>/restore` - 恢复策略文件
- `GET /api/admin/strategy-files/recycled` - 回收站策略列表
- `GET /api/admin/operations` - 操作日志

## 🔒 安全特性

### 数据安全
- **密码加密** - Bcrypt加密存储
- **JWT认证** - Token过期机制（24小时）
- **数据验证** - 邮箱格式验证、密码强度验证
- **SQL注入防护** - ORM参数化查询

### 网络安全
- **CORS配置** - 跨域请求控制
- **请求限流** - Redis实现的API请求频率限制
- **操作日志** - 记录用户操作行为

## 📈 性能优化

### 后端优化
- **Redis缓存** - 热点数据缓存、验证码存储
- **连接池** - 数据库连接池管理
- **异步处理** - 支持异步API调用
- **日志监控** - 详细的性能日志

### 前端优化
- **代码分割** - 按需加载组件
- **虚拟滚动** - 大数据列表优化
- **图表优化** - 高性能图表渲染
- **缓存策略** - 智能数据缓存

## 🐛 故障排除

### 常见问题

1. **后端启动失败**
   - 检查Python版本（需要3.8+）
   - 检查依赖是否安装完整：`pip install -r requirements.txt`
   - 检查Redis服务是否启动

2. **前端启动失败**
   - 检查Node.js版本（需要16+）
   - 清理npm缓存：`npm cache clean --force`
   - 重新安装依赖：`rm -rf node_modules && npm install`

3. **WebSocket连接失败**
   - 检查端口65534是否被占用
   - 检查防火墙设置
   - 确认WebSocket服务已启动

4. **MT5连接失败**
   - 检查MT5终端是否运行
   - 确认账户信息正确
   - 检查网络连接

5. **邮件发送失败**
   - 检查SMTP配置
   - 确认邮箱授权码正确
   - 检查网络连接

6. **验证码发送失败**
   - 检查Redis服务是否启动
   - 检查邮件服务配置
   - 查看后端日志错误信息

### 日志查看
```bash
# 后端日志
tail -f backend/app.log

# 前端日志
npm run dev
```

## 📦 部署说明

### 生产环境部署

1. **配置生产环境变量**
```env
FLASK_ENV=production
DEBUG=False
DATABASE_URL=postgresql://user:password@localhost:5432/forex_trading
SECRET_KEY=your-production-secret-key
```

2. **构建前端**
```bash
cd frontend
npm run build
```

3. **使用Gunicorn运行后端**
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

4. **配置Nginx反向代理**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/frontend/dist;
        try_files $uri /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass http://localhost:65534;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🤝 贡献指南

### 开发流程
1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交代码变更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

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

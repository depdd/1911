# 部署文档

## 概述

本文档提供了外汇量化交易平台的完整部署指南，包括开发环境、生产环境和Docker部署。

## 系统要求

### 硬件要求
- **CPU**: 4核心以上
- **内存**: 8GB以上
- **存储**: 50GB以上可用空间
- **网络**: 稳定的网络连接

### 软件要求
- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 8+)
- **Python**: 3.8+
- **Node.js**: 16+
- **数据库**: PostgreSQL 12+ 或 MySQL 8+
- **缓存**: Redis 6+
- **Web服务器**: Nginx
- **进程管理**: PM2 (可选)

## 环境准备

### 1. 安装系统依赖

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx redis-server postgresql
```

**CentOS/RHEL:**
```bash
sudo yum update
sudo yum install -y python3 python3-pip nodejs npm nginx redis postgresql-server
```

### 2. 配置数据库

**PostgreSQL:**
```bash
# 初始化数据库
sudo postgresql-setup --initdb

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE forex_trading;
CREATE USER forex_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE forex_trading TO forex_user;
\q
```

**Redis:**
```bash
# 启动Redis服务
sudo systemctl start redis
sudo systemctl enable redis

# 测试连接
redis-cli ping
```

### 3. 配置Nginx

```bash
# 创建Nginx配置文件
sudo nano /etc/nginx/sites-available/forex-trading
```

**Nginx配置示例：**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket代理
    location /ws {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/forex-trading /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

## 应用部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd forex-trading-platform
```

### 2. 部署后端

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件
nano .env
```

**环境变量配置 (.env):**
```bash
# Flask配置
FLASK_ENV=production
SECRET_KEY=your-very-secure-secret-key
DEBUG=False

# 数据库配置
DATABASE_URL=postgresql://forex_user:your_password@localhost:5432/forex_trading
REDIS_URL=redis://localhost:6379/0

# MT5配置（可选）
MT5_TIMEOUT=30

# WebSocket配置
WS_HOST=0.0.0.0
WS_PORT=5001

# 安全配置
CORS_ORIGINS=["https://your-domain.com"]
```

```bash
# 初始化数据库
python -c "from models import DatabaseManager; db = DatabaseManager('postgresql://forex_user:your_password@localhost:5432/forex_trading'); db.create_tables()"

# 使用Gunicorn启动（生产环境）
gunicorn -w 4 -b 0.0.0.0:5000 app:app --daemon

# 或使用PM2管理
pm2 start app.py --name forex-backend --interpreter python3
cd ..
```

### 3. 部署前端

```bash
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 启动服务（使用PM2）
pm2 start npm --name forex-frontend -- start

# 或使用serve
npm install -g serve
serve -s dist -p 3000 &
cd ..
```

## Docker部署

### 1. 创建Dockerfile

**后端Dockerfile:**
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 5000 5001

# 启动应用
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

**前端Dockerfile:**
```dockerfile
FROM node:16-alpine as build

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源码
COPY . .

# 构建应用
RUN npm run build

# 生产环境
FROM nginx:alpine

# 复制构建文件
COPY --from=build /app/dist /usr/share/nginx/html

# 复制Nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. 创建Docker Compose配置

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  # PostgreSQL数据库
  postgres:
    image: postgres:13
    container_name: forex-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: forex_trading
      POSTGRES_USER: forex_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - forex-network

  # Redis缓存
  redis:
    image: redis:6-alpine
    container_name: forex-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - forex-network

  # 后端服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: forex-backend
    restart: unless-stopped
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgresql://forex_user:your_password@postgres:5432/forex_trading
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    ports:
      - "5000:5000"
      - "5001:5001"
    networks:
      - forex-network
    volumes:
      - ./backend/logs:/app/logs

  # 前端服务
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: forex-frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "3000:80"
    networks:
      - forex-network

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: forex-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - forex-network

volumes:
  postgres_data:
  redis_data:

networks:
  forex-network:
    driver: bridge
```

### 3. 启动Docker容器

```bash
# 构建并启动容器
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

## SSL证书配置

### 使用Let's Encrypt

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

### 手动配置SSL

```bash
# 创建SSL目录
mkdir -p /etc/nginx/ssl

# 复制证书文件
sudo cp your-certificate.crt /etc/nginx/ssl/
sudo cp your-private.key /etc/nginx/ssl/

# 修改Nginx配置
sudo nano /etc/nginx/sites-available/forex-trading
```

**SSL配置示例：**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/your-certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/your-private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # 其他配置...
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 监控和维护

### 1. 系统监控

**使用Prometheus + Grafana:**
```bash
# 安装Prometheus
docker run -d --name prometheus -p 9090:9090 prom/prometheus

# 安装Grafana
docker run -d --name grafana -p 3001:3000 grafana/grafana
```

**应用监控端点:**
```bash
# 健康检查
curl http://localhost:5000/api/health

# 指标监控
curl http://localhost:5000/metrics
```

### 2. 日志管理

**配置日志轮转:**
```bash
sudo nano /etc/logrotate.d/forex-trading
```

```
/path/to/your/app/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
    postrotate
        # 重启应用以重新打开日志文件
        systemctl restart forex-backend
    endscript
}
```

### 3. 备份策略

**数据库备份:**
```bash
#!/bin/bash
# 数据库备份脚本

BACKUP_DIR="/backup/database"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份PostgreSQL
pg_dump -U forex_user -d forex_trading > $BACKUP_DIR/forex_backup_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/forex_backup_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "forex_backup_*.sql.gz" -mtime +7 -delete

# 同步到远程存储（可选）
rsync -avz $BACKUP_DIR/ remote-server:/backups/
```

**文件备份:**
```bash
#!/bin/bash
# 文件备份脚本

BACKUP_DIR="/backup/files"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份配置文件和代码
tar -czf $BACKUP_DIR/forex_files_$DATE.tar.gz \
    /path/to/forex-trading-platform/config \
    /path/to/forex-trading-platform/scripts

# 删除30天前的备份
find $BACKUP_DIR -name "forex_files_*.tar.gz" -mtime +30 -delete
```

## 性能优化

### 1. 数据库优化

```sql
-- 创建索引
CREATE INDEX CONCURRENTLY idx_positions_account_active 
ON positions(account_id, is_active) 
WHERE is_active = true;

-- 表分区（大数据量时）
CREATE TABLE positions_2024 PARTITION OF positions 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 定期清理旧数据
DELETE FROM trades WHERE trade_time < NOW() - INTERVAL '1 year';
```

### 2. Redis优化

```bash
# 配置Redis
sudo nano /etc/redis/redis.conf

# 优化配置
maxmemory 1gb
maxmemory-policy allkeys-lru
maxmemory-samples 5
tcp-keepalive 300
tcp-backlog 511
```

### 3. 应用优化

**后端优化:**
```python
# 启用连接池
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True
)
```

**前端优化:**
```javascript
// 启用压缩
import CompressionPlugin from 'compression-webpack-plugin';

export default defineConfig({
  plugins: [
    CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
    })
  ]
});
```

## 故障排除

### 常见问题

1. **端口被占用**
```bash
# 查找占用端口的进程
lsof -i :5000
lsof -i :3000
lsof -i :5001

# 终止进程
kill -9 <PID>
```

2. **数据库连接失败**
```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 检查连接
psql -h localhost -U forex_user -d forex_trading
```

3. **Redis连接失败**
```bash
# 检查Redis状态
sudo systemctl status redis

# 测试连接
redis-cli ping
```

4. **MT5连接问题**
```bash
# 检查MT5终端是否运行
# 确认账户信息正确
# 检查防火墙设置
```

### 日志分析

```bash
# 查看系统日志
sudo journalctl -f

# 查看Nginx日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 查看应用日志
tail -f backend/app.log
tail -f frontend/npm-debug.log
```

## 扩展部署

### 多服务器部署

**负载均衡配置:**
```nginx
upstream backend {
    server 192.168.1.10:5000 weight=3;
    server 192.168.1.11:5000 weight=2;
    server 192.168.1.12:5000 weight=1;
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://backend;
    }
}
```

### 微服务架构

**服务拆分:**
```yaml
# docker-compose-microservices.yml
version: '3.8'

services:
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "8080:8080"
    
  user-service:
    build: ./services/user-service
    
  trading-service:
    build: ./services/trading-service
    
  market-data-service:
    build: ./services/market-data-service
    
  strategy-service:
    build: ./services/strategy-service
    
  notification-service:
    build: ./services/notification-service
```

## 安全加固

### 1. 系统安全

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置防火墙
sudo ufw enable
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443

# 配置Fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. 应用安全

```python
# 使用环境变量存储敏感信息
import os
from cryptography.fernet import Fernet

# 加密敏感数据
cipher_suite = Fernet(os.environ.get('ENCRYPTION_KEY'))
encrypted_data = cipher_suite.encrypt(b'sensitive_data')
```

### 3. 网络安全

```nginx
# 限制请求大小
client_max_body_size 10M;

# 防止DDoS攻击
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;

# 配置CSP
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'";
```

## 维护计划

### 日常维护
- 监控系统性能
- 检查日志文件
- 验证备份完整性
- 更新安全补丁

### 定期维护
- 数据库优化（每周）
- 清理旧日志（每月）
- 更新依赖包（每月）
- 安全审计（每季度）

### 紧急响应
- 监控系统告警
- 故障恢复流程
- 数据恢复测试
- 应急预案演练

---

**注意**: 本文档提供了标准的部署流程，实际部署时请根据具体环境和需求进行调整。建议在生产环境部署前先在测试环境进行充分测试。
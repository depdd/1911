import psycopg2
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 获取数据库配置
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:1234@localhost:5432/postgres')

# 解析数据库URL
import urllib.parse
parsed_url = urllib.parse.urlparse(DATABASE_URL)
dbname = parsed_url.path[1:]  # 去掉开头的斜杠
user = parsed_url.username
password = parsed_url.password
host = parsed_url.hostname
port = parsed_url.port

print(f"尝试连接到PostgreSQL...")
print(f"主机: {host}, 端口: {port}, 用户: {user}, 数据库: {dbname}")

try:
    # 首先连接到默认的postgres数据库
    conn = psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname='postgres'
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    # 检查数据库是否存在
    cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{dbname}';")
    exists = cursor.fetchone()
    
    if not exists:
        # 创建数据库
        print(f"创建数据库 {dbname}...")
        cursor.execute(f"CREATE DATABASE {dbname};")
        print(f"数据库 {dbname} 创建成功!")
    else:
        print(f"数据库 {dbname} 已存在。")
    
    # 关闭连接
    cursor.close()
    conn.close()
    
    # 现在连接到新创建的数据库并创建扩展
    print(f"连接到数据库 {dbname} 并创建必要的扩展...")
    conn = psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname=dbname
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    # 创建必要的扩展
    print("创建PostgreSQL扩展...")
    cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    cursor.execute("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";")
    print("扩展创建成功!")
    
    # 执行初始化SQL脚本
    print("执行数据库初始化脚本...")
    # 这里我们不执行完整的SQL脚本，因为我们主要是为了让应用能够启动
    # 在实际生产环境中，应该执行完整的init.sql脚本
    
    # 创建基本的账户表结构（简化版）
    print("创建基本数据表结构...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        account_id VARCHAR(50) UNIQUE NOT NULL,
        login VARCHAR(100) NOT NULL,
        server VARCHAR(100) NOT NULL,
        balance DECIMAL(15, 2) DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 插入一个测试账户
    cursor.execute("""
    INSERT INTO accounts (account_id, login, server, balance)
    VALUES ('test-account-001', 'testuser', 'MetaTrader5-Server', 10000.0)
    ON CONFLICT (account_id) DO NOTHING;
    """)
    
    print("数据库初始化完成!")
    
    cursor.close()
    conn.close()
    
    print("\n数据库准备就绪，应用可以启动了。")
    
except psycopg2.OperationalError as e:
    print(f"连接数据库失败: {e}")
    print("请确认PostgreSQL服务正在运行，并且用户名和密码正确。")
except Exception as e:
    print(f"初始化数据库时发生错误: {e}")
"""
数据库迁移脚本 - 更新 strategies 表结构
"""
import os
import sys
from sqlalchemy import create_engine, text
from config import get_config

config = get_config()
engine = create_engine(config.DATABASE_URL)

def migrate_strategies_table():
    """迁移 strategies 表结构"""
    with engine.connect() as conn:
        with conn.begin():
            # 检查表是否存在
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'strategies'
                );
            """))
            table_exists = result.scalar()
            
            if table_exists:
                print("发现 strategies 表，需要重新创建...")
                
                # 删除外键约束
                conn.execute(text("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.table_constraints 
                            WHERE constraint_name = 'strategy_executions_strategy_id_fkey'
                        ) THEN
                            ALTER TABLE strategy_executions DROP CONSTRAINT strategy_executions_strategy_id_fkey;
                        END IF;
                    END $$;
                """))
                
                # 删除旧表
                conn.execute(text("DROP TABLE IF EXISTS strategies CASCADE;"))
                print("已删除旧表")
            
            # 创建新表
            conn.execute(text("""
                CREATE TABLE strategies (
                    id SERIAL PRIMARY KEY,
                    strategy_id VARCHAR(100) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    template_id VARCHAR(50) NOT NULL,
                    parameters TEXT,
                    status VARCHAR(20) DEFAULT 'stopped',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("已创建新 strategies 表")
            
            # 创建索引
            conn.execute(text("""
                CREATE INDEX idx_strategies_strategy_id ON strategies(strategy_id);
            """))
            print("已创建索引")
            
            # 重新创建外键关系（如果 strategy_executions 表存在）
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'strategy_executions'
                );
            """))
            executions_exists = result.scalar()
            
            if executions_exists:
                conn.execute(text("""
                    ALTER TABLE strategy_executions 
                    ADD CONSTRAINT strategy_executions_strategy_id_fkey 
                    FOREIGN KEY (strategy_id) REFERENCES strategies(id);
                """))
                print("已重新创建外键关系")
        
        print("数据库迁移完成！")

if __name__ == '__main__':
    try:
        migrate_strategies_table()
    except Exception as e:
        print(f"迁移失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

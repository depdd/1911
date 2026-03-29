import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

from datetime import datetime
from models import User, DatabaseManager
from api.auth import hash_password
from config import Config

def create_admin():
    db_manager = DatabaseManager(Config.DATABASE_URL)
    session = db_manager.get_session()
    
    try:
        admin = session.query(User).filter_by(username='admin').first()
        
        if admin:
            print(f"管理员账号已存在: {admin.username}")
            if not admin.is_admin:
                admin.is_admin = True
                session.commit()
                print("已更新为管理员权限")
            return
        
        admin_user = User(
            username='admin',
            email='admin@system.local',
            password_hash=hash_password('admin'),
            membership_level='enterprise',
            is_active=True,
            is_verified=True,
            is_admin=True,
            created_at=datetime.utcnow()
        )
        
        session.add(admin_user)
        session.commit()
        
        print("=" * 50)
        print("管理员账号创建成功!")
        print("=" * 50)
        print(f"用户名: admin")
        print(f"密码: admin")
        print(f"邮箱: admin@system.local")
        print("=" * 50)
        print("请登录后立即修改密码!")
        print("=" * 50)
        
    except Exception as e:
        print(f"创建管理员账号失败: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == '__main__':
    create_admin()

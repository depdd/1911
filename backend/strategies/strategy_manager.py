"""
策略管理器
负责动态加载、注册和管理策略
"""
import os
import sys
import importlib
import importlib.util
import logging
import shutil
from typing import Dict, List, Optional, Type, Any
from datetime import datetime
import json

from strategies.base_strategy import BaseStrategy, validate_strategy_class

logger = logging.getLogger(__name__)

STRATEGIES_DIR = os.path.dirname(os.path.abspath(__file__))


class StrategyManager:
    """策略管理器"""
    
    _instance = None
    _lock = __import__('threading').Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        self.registered_strategies: Dict[str, Type[BaseStrategy]] = {}
        self.strategy_info: Dict[str, dict] = {}
        self._deleted_builtin_strategies: set = set()
        self._recycled_strategies: Dict[str, dict] = {}
        
        self._load_builtin_strategies()
    
    def _load_builtin_strategies(self):
        """加载内置策略 - 自动发现strategies目录下的所有策略"""
        strategy_configs = {
            'linshu': {
                'name': '林舒策略',
                'description': '基于网格交易和马丁格尔策略的混合交易系统',
                'category': '网格交易',
                'risk_level': 'high',
                'class_name': 'LinShuStrategy'
            },
            'dual_grid_martin': {
                'name': '双向网格马丁',
                'description': '双向网格交易结合马丁格尔加仓策略',
                'category': '网格交易',
                'risk_level': 'high',
                'class_name': 'DualGridMartinStrategy'
            },
            'martin_grid': {
                'name': '马丁网格策略',
                'description': '马丁格尔加仓与网格交易结合',
                'category': '网格交易',
                'risk_level': 'high',
                'class_name': 'MartinGridStrategy'
            },
            'shuangxiang': {
                'name': '双向策略',
                'description': '双向交易策略',
                'category': '网格交易',
                'risk_level': 'high',
                'class_name': 'GridMartingaleStrategy'
            }
        }
        
        exclude_files = ['__init__', 'base_strategy', 'strategy_manager', 'strategy_logger', 'custom']
        
        for filename in os.listdir(STRATEGIES_DIR):
            if filename.endswith('.py') and not filename.startswith('_'):
                module_name = filename[:-3]
                
                if module_name in exclude_files:
                    continue
                
                if module_name in self._deleted_builtin_strategies:
                    continue
                
                strategy_id = module_name
                config = strategy_configs.get(strategy_id, {})
                
                try:
                    module = importlib.import_module(f'strategies.{module_name}')
                    
                    class_name = config.get('class_name')
                    strategy_class = None
                    
                    if class_name:
                        strategy_class = getattr(module, class_name, None)
                    
                    if not strategy_class:
                        for name in dir(module):
                            obj = getattr(module, name)
                            if (isinstance(obj, type) and 
                                issubclass(obj, BaseStrategy) and 
                                obj is not BaseStrategy):
                                strategy_class = obj
                                class_name = name
                                break
                    
                    if not strategy_class:
                        for name in dir(module):
                            if name.endswith('Strategy') and not name.startswith('_'):
                                obj = getattr(module, name)
                                if isinstance(obj, type):
                                    strategy_class = obj
                                    class_name = name
                                    break
                    
                    if strategy_class:
                        self.registered_strategies[strategy_id] = strategy_class
                        self.strategy_info[strategy_id] = {
                            'name': config.get('name', strategy_id),
                            'description': config.get('description', ''),
                            'category': config.get('category', '自定义'),
                            'risk_level': config.get('risk_level', 'medium'),
                            'file_path': os.path.join(STRATEGIES_DIR, filename),
                            'class_name': class_name,
                            'is_builtin': True,
                            'loaded_at': datetime.now().isoformat()
                        }
                        logger.info(f"加载内置策略: {strategy_id} ({class_name})")
                        
                except Exception as e:
                    logger.error(f"加载内置策略失败 {strategy_id}: {e}")
    
    def load_strategy_from_file(self, file_path: str, strategy_id: str, 
                                 class_name: str = None, info: dict = None) -> bool:
        """
        从文件加载策略
        
        Args:
            file_path: 策略文件路径
            strategy_id: 策略ID
            class_name: 策略类名（如果为None，自动检测）
            info: 策略信息
        
        Returns:
            是否加载成功
        """
        try:
            if not os.path.exists(file_path):
                logger.error(f"策略文件不存在: {file_path}")
                return False
            
            module_name = f"strategies.custom.{strategy_id}"
            
            spec = importlib.util.spec_from_file_location(module_name, file_path)
            if spec is None or spec.loader is None:
                logger.error(f"无法创建模块规范: {file_path}")
                return False
            
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            
            if class_name:
                strategy_class = getattr(module, class_name, None)
            else:
                strategy_class = None
                for name in dir(module):
                    obj = getattr(module, name)
                    if isinstance(obj, type) and issubclass(obj, BaseStrategy) and obj is not BaseStrategy:
                        strategy_class = obj
                        class_name = name
                        break
            
            if not strategy_class:
                logger.error(f"未找到有效的策略类: {file_path}")
                return False
            
            if not validate_strategy_class(strategy_class):
                logger.error(f"策略类验证失败: {class_name}")
                return False
            
            self.registered_strategies[strategy_id] = strategy_class
            self.strategy_info[strategy_id] = {
                'name': info.get('name', strategy_id) if info else strategy_id,
                'description': info.get('description', '') if info else '',
                'category': info.get('category', '自定义') if info else '自定义',
                'risk_level': info.get('risk_level', 'medium') if info else 'medium',
                'file_path': file_path,
                'class_name': class_name,
                'is_builtin': False,
                'loaded_at': datetime.now().isoformat()
            }
            
            logger.info(f"成功加载策略: {strategy_id} ({class_name})")
            return True
            
        except Exception as e:
            logger.error(f"加载策略文件失败: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def save_strategy_file(self, file_content: bytes, filename: str) -> str:
        """
        保存策略文件
        
        Args:
            file_content: 文件内容
            filename: 文件名
        
        Returns:
            保存后的文件路径
        """
        custom_dir = os.path.join(STRATEGIES_DIR, 'custom')
        os.makedirs(custom_dir, exist_ok=True)
        
        safe_filename = os.path.basename(filename)
        if not safe_filename.endswith('.py'):
            safe_filename += '.py'
        
        file_path = os.path.join(custom_dir, safe_filename)
        
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        logger.info(f"策略文件已保存: {file_path}")
        return file_path
    
    def register_strategy(self, strategy_id: str, file_path: str, 
                          name: str, description: str = '',
                          category: str = '自定义', risk_level: str = 'medium',
                          class_name: str = None,
                          default_parameters: dict = None,
                          parameters_schema: list = None) -> dict:
        """
        注册新策略
        
        Returns:
            注册结果
        """
        if strategy_id in self.registered_strategies:
            return {'success': False, 'error': '策略ID已存在'}
        
        success = self.load_strategy_from_file(
            file_path, strategy_id, class_name,
            info={
                'name': name,
                'description': description,
                'category': category,
                'risk_level': risk_level
            }
        )
        
        if success:
            return {
                'success': True,
                'message': '策略注册成功',
                'strategy_id': strategy_id
            }
        else:
            return {'success': False, 'error': '策略加载失败'}
    
    def unregister_strategy(self, strategy_id: str) -> bool:
        """
        注销策略（移到回收站）
        """
        if strategy_id not in self.registered_strategies:
            return False
        
        info = self.strategy_info.get(strategy_id, {}).copy()
        info['deleted_at'] = datetime.now().isoformat()
        
        self._recycled_strategies[strategy_id] = info
        
        if strategy_id in self.registered_strategies:
            del self.registered_strategies[strategy_id]
        
        if strategy_id in self.strategy_info:
            del self.strategy_info[strategy_id]
        
        module_name = f"strategies.custom.{strategy_id}"
        if module_name in sys.modules:
            del sys.modules[module_name]
        
        builtin_module_name = f"strategies.{strategy_id}"
        if builtin_module_name in sys.modules:
            del sys.modules[builtin_module_name]
        
        if strategy_id in self._deleted_builtin_strategies:
            self._deleted_builtin_strategies.discard(strategy_id)
        
        logger.info(f"策略已移至回收站: {strategy_id}")
        return True
    
    def restore_strategy(self, strategy_id: str) -> bool:
        """
        从回收站恢复策略
        """
        if strategy_id not in self._recycled_strategies:
            return False
        
        info = self._recycled_strategies[strategy_id]
        
        file_path = info.get('file_path', '')
        is_builtin = info.get('is_builtin', False)
        
        if is_builtin or (file_path and os.path.exists(file_path)):
            try:
                module_name = strategy_id
                if file_path and 'custom' in file_path:
                    module_name = f"custom.{strategy_id}"
                    module = importlib.import_module(f"strategies.{module_name}")
                else:
                    module = importlib.import_module(f"strategies.{strategy_id}")
                
                class_name = info.get('class_name')
                strategy_class = getattr(module, class_name, None)
                
                if strategy_class:
                    self.registered_strategies[strategy_id] = strategy_class
                    self.strategy_info[strategy_id] = info
                    del self._recycled_strategies[strategy_id]
                    logger.info(f"策略已恢复: {strategy_id}")
                    return True
            except Exception as e:
                logger.error(f"恢复策略失败: {e}")
                return False
        
        del self._recycled_strategies[strategy_id]
        return False
    
    def get_recycled_strategies(self) -> List[dict]:
        """
        获取回收站中的策略列表
        """
        result = []
        for strategy_id, info in self._recycled_strategies.items():
            result.append({
                'id': strategy_id,
                'name': info.get('name', strategy_id),
                'description': info.get('description', ''),
                'category': info.get('category', ''),
                'risk_level': info.get('risk_level', 'medium'),
                'is_builtin': info.get('is_builtin', False),
                'deleted_at': info.get('deleted_at', '')
            })
        return result
    
    def permanently_delete_strategy(self, strategy_id: str) -> bool:
        """
        永久删除策略
        """
        if strategy_id in self._recycled_strategies:
            info = self._recycled_strategies[strategy_id]
            file_path = info.get('file_path', '')
            custom_strategies_dir = os.path.join(STRATEGIES_DIR, 'custom')
            is_custom_file = file_path.startswith(custom_strategies_dir)
            
            if file_path and os.path.exists(file_path) and is_custom_file:
                try:
                    os.remove(file_path)
                    logger.info(f"已永久删除策略文件: {file_path}")
                except Exception as e:
                    logger.error(f"删除策略文件失败: {e}")
            
            del self._recycled_strategies[strategy_id]
            
            if info.get('is_builtin'):
                self._deleted_builtin_strategies.add(strategy_id)
            
            logger.info(f"策略已永久删除: {strategy_id}")
            return True
        return False
    
    def get_strategy_class(self, strategy_id: str) -> Optional[Type[BaseStrategy]]:
        """获取策略类"""
        return self.registered_strategies.get(strategy_id)
    
    def get_strategy_info(self, strategy_id: str) -> Optional[dict]:
        """获取策略信息"""
        return self.strategy_info.get(strategy_id)
    
    def list_strategies(self) -> List[dict]:
        """列出所有策略"""
        result = []
        for strategy_id, info in self.strategy_info.items():
            result.append({
                'id': strategy_id,
                'name': info.get('name', strategy_id),
                'description': info.get('description', ''),
                'category': info.get('category', ''),
                'risk_level': info.get('risk_level', 'medium'),
                'is_builtin': info.get('is_builtin', False),
                'loaded_at': info.get('loaded_at', ''),
                'file_path': info.get('file_path', '')
            })
        return result
    
    def create_strategy_instance(self, strategy_id: str, params: dict, 
                                  instance_id: str = None) -> Optional[BaseStrategy]:
        """
        创建策略实例
        
        Args:
            strategy_id: 策略ID
            params: 策略参数
            instance_id: 实例ID
        
        Returns:
            策略实例
        """
        strategy_class = self.get_strategy_class(strategy_id)
        if not strategy_class:
            logger.error(f"策略不存在: {strategy_id}")
            return None
        
        try:
            instance = strategy_class(params, strategy_id=instance_id or strategy_id)
            return instance
        except Exception as e:
            logger.error(f"创建策略实例失败: {e}")
            return None

    def reload_all(self):
        """重新加载所有策略"""
        self.registered_strategies.clear()
        self.strategy_info.clear()
        self._load_builtin_strategies()
        logger.info("已重新加载所有策略")
    
    def reload_strategy(self, strategy_id: str) -> bool:
        """重新加载单个策略"""
        try:
            builtin_module_name = f"strategies.{strategy_id}"
            if builtin_module_name in sys.modules:
                del sys.modules[builtin_module_name]
            
            custom_module_name = f"strategies.custom.{strategy_id}"
            if custom_module_name in sys.modules:
                del sys.modules[custom_module_name]
            
            builtin_path = os.path.join(STRATEGIES_DIR, f"{strategy_id}.py")
            if os.path.exists(builtin_path):
                module = importlib.import_module(f"strategies.{strategy_id}")
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if isinstance(attr, type) and issubclass(attr, BaseStrategy) and attr is not BaseStrategy:
                        self.registered_strategies[strategy_id] = attr
                        self.strategy_info[strategy_id] = {
                            'id': strategy_id,
                            'name': getattr(attr, 'strategy_name', strategy_id),
                            'description': getattr(attr, 'description', ''),
                            'category': getattr(attr, 'category', '内置'),
                            'risk_level': getattr(attr, 'risk_level', 'medium'),
                            'is_builtin': True
                        }
                        logger.info(f"已重新加载策略: {strategy_id}")
                        return True
            
            custom_path = os.path.join(STRATEGIES_DIR, 'custom', f"{strategy_id}.py")
            if os.path.exists(custom_path):
                module = importlib.import_module(f"strategies.custom.{strategy_id}")
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if isinstance(attr, type) and issubclass(attr, BaseStrategy) and attr is not BaseStrategy:
                        self.registered_strategies[strategy_id] = attr
                        self.strategy_info[strategy_id] = {
                            'id': strategy_id,
                            'name': getattr(attr, 'strategy_name', strategy_id),
                            'description': getattr(attr, 'description', ''),
                            'category': getattr(attr, 'category', '自定义'),
                            'risk_level': getattr(attr, 'risk_level', 'medium'),
                            'is_builtin': False,
                            'file_path': custom_path
                        }
                        logger.info(f"已重新加载策略: {strategy_id}")
                        return True
            
            logger.warning(f"策略文件不存在: {strategy_id}")
            return False
        except Exception as e:
            logger.error(f"重新加载策略失败: {e}")
            return False


strategy_manager = StrategyManager()

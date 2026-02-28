"""
策略日志管理器
用于存储和检索策略运行日志
"""
from datetime import datetime
from typing import Dict, List, Optional
from collections import deque
import threading


class StrategyLogger:
    """策略日志管理器"""
    
    _instance = None
    _lock = threading.Lock()
    
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
        self.logs: Dict[str, deque] = {}
        self.max_logs_per_strategy = 500
        self._logs_lock = threading.Lock()
    
    def add_log(self, strategy_id: str, level: str, message: str, details: Dict = None):
        """添加日志条目"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': level,
            'message': message,
            'details': details or {}
        }
        
        with self._logs_lock:
            if strategy_id not in self.logs:
                self.logs[strategy_id] = deque(maxlen=self.max_logs_per_strategy)
            self.logs[strategy_id].append(log_entry)
    
    def get_logs(self, strategy_id: str, limit: int = 100, level: str = None) -> List[Dict]:
        """获取策略日志"""
        with self._logs_lock:
            if strategy_id not in self.logs:
                return []
            
            logs = list(self.logs[strategy_id])
            
            if level:
                logs = [log for log in logs if log['level'] == level]
            
            return logs[-limit:] if limit else logs
    
    def clear_logs(self, strategy_id: str):
        """清除策略日志"""
        with self._logs_lock:
            if strategy_id in self.logs:
                self.logs[strategy_id].clear()
    
    def remove_strategy(self, strategy_id: str):
        """移除策略的所有日志"""
        with self._logs_lock:
            if strategy_id in self.logs:
                del self.logs[strategy_id]
    
    def get_all_strategy_ids(self) -> List[str]:
        """获取所有有日志的策略ID"""
        with self._logs_lock:
            return list(self.logs.keys())


strategy_logger = StrategyLogger()


def log_strategy(strategy_id: str, level: str, message: str, details: Dict = None):
    """便捷函数：记录策略日志"""
    strategy_logger.add_log(strategy_id, level, message, details)


def log_info(strategy_id: str, message: str, details: Dict = None):
    """便捷函数：记录INFO日志"""
    strategy_logger.add_log(strategy_id, 'INFO', message, details)


def log_warning(strategy_id: str, message: str, details: Dict = None):
    """便捷函数：记录WARNING日志"""
    strategy_logger.add_log(strategy_id, 'WARNING', message, details)


def log_error(strategy_id: str, message: str, details: Dict = None):
    """便捷函数：记录ERROR日志"""
    strategy_logger.add_log(strategy_id, 'ERROR', message, details)


def log_trade(strategy_id: str, message: str, details: Dict = None):
    """便捷函数：记录交易日志"""
    strategy_logger.add_log(strategy_id, 'TRADE', message, details)

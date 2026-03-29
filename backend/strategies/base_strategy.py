"""
策略基类
所有自定义策略必须继承此类
"""
import MetaTrader5 as mt5
import time
import threading
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime

from strategies.strategy_logger import (
    strategy_logger,
    log_info,
    log_warning,
    log_error,
    log_trade
)

logger = logging.getLogger(__name__)


class BaseStrategy(ABC):
    """
    策略基类
    所有自定义策略必须继承此类并实现以下方法:
    - on_tick(): 每个tick调用一次
    - get_performance(): 返回策略性能数据
    """
    
    def __init__(self, params: dict, strategy_id: str = None):
        self.params = params
        self.strategy_id = strategy_id or "unknown"
        self.symbol = params.get('symbol', 'EURUSD')
        self._running = False
        self._thread = None
        
        self.total_trades = 0
        self.win_trades = 0
        self.total_profit = 0.0
        self.max_drawdown = 0.0
        
        self._initialize()
    
    def _initialize(self) -> bool:
        """
        初始化策略，子类可以覆盖此方法
        """
        symbol_info = mt5.symbol_info(self.symbol)
        if symbol_info is None:
            log_error(self.strategy_id, f"无法获取品种信息: {self.symbol}")
            return False
        
        if not symbol_info.visible:
            if not mt5.symbol_select(self.symbol, True):
                log_error(self.strategy_id, f"无法选择品种: {self.symbol}")
                return False
        
        self.vDigits = symbol_info.digits
        self.vPoint = symbol_info.point
        self.Spread = symbol_info.spread
        
        log_info(self.strategy_id, f"策略初始化完成", {
            'symbol': self.symbol,
            'digits': self.vDigits,
            'point': self.vPoint
        })
        return True
    
    @abstractmethod
    def on_tick(self):
        """
        每个tick调用一次的核心逻辑
        子类必须实现此方法
        """
        pass
    
    def get_performance(self) -> dict:
        """
        获取策略性能数据
        子类可以覆盖此方法返回更多数据
        """
        win_rate = (self.win_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        return {
            'total_trades': self.total_trades,
            'win_rate': round(win_rate, 2),
            'total_profit': round(self.total_profit, 2),
            'max_drawdown': round(self.max_drawdown, 2)
        }
    
    def start(self):
        """启动策略"""
        self._running = True
        log_info(self.strategy_id, "策略启动", {
            'symbol': self.symbol,
            'params': self.params
        })
        
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
    
    def stop(self):
        """停止策略"""
        self._running = False
        log_info(self.strategy_id, "策略停止", {
            'total_trades': self.total_trades,
            'total_profit': self.total_profit
        })
    
    def _run_loop(self):
        """策略主循环"""
        while self._running:
            try:
                self.on_tick()
            except Exception as e:
                logger.error(f"策略循环异常: {e}")
                log_error(self.strategy_id, f"策略循环异常: {str(e)}")
            
            time.sleep(1)
    
    def is_running(self) -> bool:
        """检查策略是否正在运行"""
        return self._running
    
    def get_info(self) -> dict:
        """
        获取策略基本信息
        子类应该覆盖此方法提供更多信息
        """
        return {
            'strategy_id': self.strategy_id,
            'symbol': self.symbol,
            'running': self._running,
            'total_trades': self.total_trades,
            'total_profit': self.total_profit
        }


def validate_strategy_class(strategy_class) -> bool:
    """
    验证策略类是否符合要求
    """
    if not isinstance(strategy_class, type):
        return False
    
    if not issubclass(strategy_class, BaseStrategy):
        return False
    
    required_methods = ['on_tick', 'get_performance']
    for method in required_methods:
        if not hasattr(strategy_class, method):
            return False
    
    return True

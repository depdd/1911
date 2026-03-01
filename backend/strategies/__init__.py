# 策略包初始化文件

from strategies.ma_cross import ma_cross_manager, MACrossStrategy
from strategies.martin_grid import martin_grid_manager, MartinGridStrategy
from strategies.rsi_reversal import rsi_manager, RSIStrategy
from strategies.bollinger_bands import bollinger_bands_manager, BollingerBandsStrategy
from strategies.dual_grid_martin import dual_grid_martin_manager, DualGridMartinStrategy
from strategies.linshu import create_strategy as linshu_manager, LinShuStrategy

__all__ = [
    'ma_cross_manager',
    'MACrossStrategy',
    'martin_grid_manager',
    'MartinGridStrategy',
    'rsi_manager',
    'RSIStrategy',
    'bollinger_bands_manager',
    'BollingerBandsStrategy',
    'dual_grid_martin_manager',
    'DualGridMartinStrategy',
    'linshu_manager',
    'LinShuStrategy'
]

# 策略包初始化文件

try:
    from strategies.martin_grid import martin_grid_manager, MartinGridStrategy
except ImportError:
    martin_grid_manager = None
    MartinGridStrategy = None

try:
    from strategies.dual_grid_martin import dual_grid_martin_manager, DualGridMartinStrategy
except ImportError:
    dual_grid_martin_manager = None
    DualGridMartinStrategy = None

try:
    from strategies.linshu import create_strategy as linshu_manager, LinShuStrategy
except ImportError:
    linshu_manager = None
    LinShuStrategy = None

try:
    from strategies.shuangxiang import GridMartingaleStrategy
except ImportError:
    GridMartingaleStrategy = None

__all__ = [
    'martin_grid_manager',
    'MartinGridStrategy',
    'dual_grid_martin_manager',
    'DualGridMartinStrategy',
    'linshu_manager',
    'LinShuStrategy',
    'GridMartingaleStrategy'
]

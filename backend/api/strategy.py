from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
from loguru import logger
from typing import Dict, List
import uuid
import json

from strategies.strategy_logger import strategy_logger
from models import Strategy, StrategyExecution, StrategyTemplate

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

strategy_bp = Blueprint('strategy', __name__)

def get_db_session():
    from app import db_manager
    return db_manager.get_session()

STRATEGY_TEMPLATES = [
    {
        'id': 'linshu',
        'name': '林舒策略',
        'description': '基于网格交易和马丁格尔策略的混合交易系统，支持熵增步长计算，适合震荡行情。',
        'category': '网格交易',
        'risk_level': 'high',
        'default_parameters': {
            'symbol': 'EURUSD',
            'add_space': 100,
            'take_profit': 200,
            'fixed_lot': 0.02,
            'max_add_count': 25
        },
        'parameters_schema': [
            {
                'name': 'symbol',
                'label': '交易品种',
                'type': 'select',
                'options': ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
                'default': 'EURUSD',
                'required': True
            },
            {
                'name': 'add_space',
                'label': '加仓间距(点)',
                'type': 'number',
                'min': 10,
                'max': 500,
                'default': 100,
                'required': True
            },
            {
                'name': 'take_profit',
                'label': '止盈点数',
                'type': 'number',
                'min': 10,
                'max': 1000,
                'default': 200,
                'required': True
            },
            {
                'name': 'fixed_lot',
                'label': '固定手数',
                'type': 'number',
                'min': 0.01,
                'max': 10,
                'step': 0.01,
                'default': 0.02,
                'required': True
            },
            {
                'name': 'max_add_count',
                'label': '最大加仓次数',
                'type': 'number',
                'min': 1,
                'max': 50,
                'default': 25,
                'required': True
            }
        ],
        'performance': {
            'win_rate': 75.0,
            'profit_factor': 2.1,
            'max_drawdown': 25.0,
            'avg_trade': 35.0
        }
    },
    {
        'id': 'dual_grid_martin',
        'name': '双向网格马丁',
        'description': '双向网格交易结合马丁格尔加仓策略，在震荡行情中同时做多做空获取利润。',
        'category': '网格交易',
        'risk_level': 'high',
        'default_parameters': {
            'symbol': 'EURUSD',
            'grid_spacing': 50,
            'take_profit': 100,
            'base_lot': 0.01
        },
        'parameters_schema': [
            {
                'name': 'symbol',
                'label': '交易品种',
                'type': 'select',
                'options': ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
                'default': 'EURUSD',
                'required': True
            },
            {
                'name': 'grid_spacing',
                'label': '网格间距(点)',
                'type': 'number',
                'min': 10,
                'max': 200,
                'default': 50,
                'required': True
            },
            {
                'name': 'take_profit',
                'label': '止盈点数',
                'type': 'number',
                'min': 10,
                'max': 500,
                'default': 100,
                'required': True
            },
            {
                'name': 'base_lot',
                'label': '基础手数',
                'type': 'number',
                'min': 0.01,
                'max': 10,
                'step': 0.01,
                'default': 0.01,
                'required': True
            }
        ],
        'performance': {
            'win_rate': 70.0,
            'profit_factor': 1.8,
            'max_drawdown': 20.0,
            'avg_trade': 28.0
        }
    },
    {
        'id': 'ma_cross',
        'name': '移动平均线交叉策略',
        'description': '基于快慢移动平均线交叉信号的交易策略，适合趋势行情。当快速均线上穿慢速均线时买入，下穿时卖出。',
        'category': '趋势跟踪',
        'risk_level': 'medium',
        'default_parameters': {
            'symbol': 'EURUSD',
            'fast_period': 20,
            'slow_period': 50,
            'volume': 0.1,
            'sl_pips': 50,
            'tp_pips': 100,
            'timeframe': 'H1'
        },
        'parameters_schema': [
            {
                'name': 'symbol',
                'label': '交易品种',
                'type': 'select',
                'options': ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
                'default': 'EURUSD',
                'required': True
            },
            {
                'name': 'timeframe',
                'label': 'K线周期',
                'type': 'select',
                'options': ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
                'default': 'M1',
                'required': True
            },
            {
                'name': 'fast_period',
                'label': '快速均线周期',
                'type': 'number',
                'min': 5,
                'max': 100,
                'default': 20,
                'required': True
            },
            {
                'name': 'slow_period',
                'label': '慢速均线周期',
                'type': 'number',
                'min': 10,
                'max': 200,
                'default': 50,
                'required': True
            },
            {
                'name': 'volume',
                'label': '交易手数',
                'type': 'number',
                'min': 0.01,
                'max': 10,
                'step': 0.01,
                'default': 0.1,
                'required': True
            },
            {
                'name': 'sl_pips',
                'label': '止损点数',
                'type': 'number',
                'min': 10,
                'max': 500,
                'default': 50,
                'required': True
            },
            {
                'name': 'tp_pips',
                'label': '止盈点数',
                'type': 'number',
                'min': 10,
                'max': 1000,
                'default': 100,
                'required': True
            },
            {
                'name': 'timeframe',
                'label': '时间周期',
                'type': 'select',
                'options': ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
                'default': 'H1',
                'required': True
            }
        ],
        'performance': {
            'win_rate': 65.5,
            'profit_factor': 1.8,
            'max_drawdown': 15.2,
            'avg_trade': 25.6
        }
    },
    {
        'id': 'rsi_reversal',
        'name': 'RSI超买超卖策略',
        'description': '利用RSI指标识别超买超卖区域的反转交易机会。当RSI低于30时买入，高于70时卖出。',
        'category': '反转交易',
        'risk_level': 'high',
        'default_parameters': {
            'symbol': 'EURUSD',
            'rsi_period': 14,
            'oversold': 30,
            'overbought': 70,
            'volume': 0.1,
            'sl_pips': 30,
            'tp_pips': 60,
            'timeframe': 'H1'
        },
        'parameters_schema': [
            {
                'name': 'symbol',
                'label': '交易品种',
                'type': 'select',
                'options': ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
                'default': 'EURUSD',
                'required': True
            },
            {
                'name': 'rsi_period',
                'label': 'RSI周期',
                'type': 'number',
                'min': 5,
                'max': 50,
                'default': 14,
                'required': True
            },
            {
                'name': 'oversold',
                'label': '超卖阈值',
                'type': 'number',
                'min': 10,
                'max': 40,
                'default': 30,
                'required': True
            },
            {
                'name': 'overbought',
                'label': '超买阈值',
                'type': 'number',
                'min': 60,
                'max': 90,
                'default': 70,
                'required': True
            },
            {
                'name': 'volume',
                'label': '交易手数',
                'type': 'number',
                'min': 0.01,
                'max': 10,
                'step': 0.01,
                'default': 0.1,
                'required': True
            },
            {
                'name': 'timeframe',
                'label': '时间周期',
                'type': 'select',
                'options': ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
                'default': 'H1',
                'required': True
            }
        ],
        'performance': {
            'win_rate': 58.3,
            'profit_factor': 1.5,
            'max_drawdown': 22.5,
            'avg_trade': 18.2
        }
    },
    {
        'id': 'bollinger_bands',
        'name': '布林带突破策略',
        'description': '基于布林带上下轨突破的趋势跟踪策略。价格突破上轨时买入，突破下轨时卖出。',
        'category': '突破交易',
        'risk_level': 'medium',
        'default_parameters': {
            'symbol': 'EURUSD',
            'bb_period': 20,
            'bb_deviation': 2.0,
            'volume': 0.1,
            'sl_pips': 40,
            'tp_pips': 80,
            'timeframe': 'H1'
        },
        'parameters_schema': [
            {
                'name': 'symbol',
                'label': '交易品种',
                'type': 'select',
                'options': ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
                'default': 'EURUSD',
                'required': True
            },
            {
                'name': 'bb_period',
                'label': '布林带周期',
                'type': 'number',
                'min': 10,
                'max': 50,
                'default': 20,
                'required': True
            },
            {
                'name': 'bb_deviation',
                'label': '标准差倍数',
                'type': 'number',
                'min': 1.0,
                'max': 3.0,
                'step': 0.1,
                'default': 2.0,
                'required': True
            },
            {
                'name': 'volume',
                'label': '交易手数',
                'type': 'number',
                'min': 0.01,
                'max': 10,
                'step': 0.01,
                'default': 0.1,
                'required': True
            },
            {
                'name': 'timeframe',
                'label': '时间周期',
                'type': 'select',
                'options': ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
                'default': 'H1',
                'required': True
            }
        ],
        'performance': {
            'win_rate': 55.8,
            'profit_factor': 1.6,
            'max_drawdown': 18.7,
            'avg_trade': 32.4
        }
    },
    {
        'id': 'martin_grid',
        'name': '马丁双向网格策略',
        'description': '在价格上下方同时挂买单和卖单形成网格，当订单亏损时按马丁倍数加仓。适合震荡行情，风险较高。',
        'category': '网格交易',
        'risk_level': 'high',
        'default_parameters': {
            'symbol': 'EURUSD',
            'grid_spacing': 50,
            'base_volume': 0.01,
            'martin_multiplier': 2.0,
            'max_levels': 5,
            'take_profit_pips': 30,
            'grid_count': 3
        },
        'parameters_schema': [
            {
                'name': 'symbol',
                'label': '交易品种',
                'type': 'select',
                'options': ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
                'default': 'EURUSD',
                'required': True
            },
            {
                'name': 'grid_spacing',
                'label': '网格间距(点)',
                'type': 'number',
                'min': 10,
                'max': 200,
                'default': 50,
                'required': True
            },
            {
                'name': 'base_volume',
                'label': '基础手数',
                'type': 'number',
                'min': 0.01,
                'max': 1,
                'step': 0.01,
                'default': 0.01,
                'required': True
            },
            {
                'name': 'martin_multiplier',
                'label': '马丁倍数',
                'type': 'number',
                'min': 1.5,
                'max': 3.0,
                'step': 0.1,
                'default': 2.0,
                'required': True
            },
            {
                'name': 'max_levels',
                'label': '最大层数',
                'type': 'number',
                'min': 1,
                'max': 10,
                'default': 5,
                'required': True
            },
            {
                'name': 'take_profit_pips',
                'label': '止盈点数',
                'type': 'number',
                'min': 10,
                'max': 100,
                'default': 30,
                'required': True
            },
            {
                'name': 'grid_count',
                'label': '每侧网格数',
                'type': 'number',
                'min': 1,
                'max': 10,
                'default': 3,
                'required': True
            }
        ],
        'performance': {
            'win_rate': 72.5,
            'profit_factor': 2.1,
            'max_drawdown': 35.8,
            'avg_trade': 15.8
        }
    },
    {
        'id': 'dual_grid_martin',
        'name': '双向网格马丁策略',
        'description': '同时在多空两个方向开仓，使用马丁格尔加仓方式，支持分批止盈和风控平仓。适合震荡行情，风险较高。',
        'category': '网格交易',
        'risk_level': 'high',
        'default_parameters': {
            'symbol': 'EURUSD',
            'timeframe': 'M1',
            'fixed_lot': 0.02,
            'add_space': 100,
            'take_profit': 200,
            'use_entropy': False,
            'entropy_value': 0,
            'allow_buy': True,
            'allow_sell': True,
            'tp_percent': 10,
            'tp2_percent': 5,
            'use_loss_close': False,
            'loss_amount': 600
        },
        'parameters_schema': [
            {
                'name': 'symbol',
                'label': '交易品种',
                'type': 'select',
                'options': ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
                'default': 'EURUSD',
                'required': True
            },
            {
                'name': 'timeframe',
                'label': '时间周期',
                'type': 'select',
                'options': ['M1', 'M5', 'M15', 'M30', 'H1'],
                'default': 'M1',
                'required': True
            },
            {
                'name': 'fixed_lot',
                'label': '首单手数',
                'type': 'number',
                'min': 0.01,
                'max': 1,
                'step': 0.01,
                'default': 0.02,
                'required': True
            },
            {
                'name': 'add_space',
                'label': '加仓间距(价格差)',
                'type': 'number',
                'min': 1,
                'max': 100000,
                'default': 100,
                'required': True
            },
            {
                'name': 'take_profit',
                'label': '整体止盈(价格差)',
                'type': 'number',
                'min': 1,
                'max': 100000,
                'default': 200,
                'required': True
            },
            {
                'name': 'use_entropy',
                'label': '启用熵值调整',
                'type': 'boolean',
                'default': False,
                'required': False
            },
            {
                'name': 'entropy_value',
                'label': '熵值增量',
                'type': 'number',
                'min': 0,
                'max': 100000,
                'default': 0,
                'required': False
            },
            {
                'name': 'allow_buy',
                'label': '允许多单',
                'type': 'boolean',
                'default': True,
                'required': True
            },
            {
                'name': 'allow_sell',
                'label': '允许空单',
                'type': 'boolean',
                'default': True,
                'required': True
            },
            {
                'name': 'tp_percent',
                'label': '分批止盈比例(%)',
                'type': 'number',
                'min': 1,
                'max': 50,
                'default': 10,
                'required': True
            },
            {
                'name': 'use_loss_close',
                'label': '启用亏损平仓',
                'type': 'boolean',
                'default': False,
                'required': False
            },
            {
                'name': 'loss_amount',
                'label': '亏损平仓金额',
                'type': 'number',
                'min': 100,
                'max': 10000,
                'default': 600,
                'required': False
            }
        ],
        'performance': {
            'win_rate': 68.5,
            'profit_factor': 1.9,
            'max_drawdown': 45.2,
            'avg_trade': 22.3
        }
    },
    {
        'id': 'linshu',
        'name': '林书双向网格策略',
        'description': '完全复制MT4的双向网格马丁策略，支持熵值动态间距、分批止盈、风控平仓。基于第一单价格设置止盈。',
        'category': '网格交易',
        'risk_level': 'high',
        'default_parameters': {
            'symbol': 'EURUSD',
            'timeframe': 'M1',
            'fixed_lot': 0.02,
            'add_space': 100,
            'take_profit': 200,
            'use_entropy_step': True,
            'allow_buy': True,
            'allow_sell': True,
            'tp_percent': 10,
            'tp2_percent': 5,
            'use_loss_close': False,
            'loss_amount': 600
        },
        'parameters_schema': [
            {
                'name': 'symbol',
                'label': '交易品种',
                'type': 'select',
                'options': ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
                'default': 'EURUSD',
                'required': True
            },
            {
                'name': 'timeframe',
                'label': 'K线周期',
                'type': 'select',
                'options': ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
                'default': 'M1',
                'required': True
            },
            {
                'name': 'fixed_lot',
                'label': '首单手数',
                'type': 'number',
                'min': 0.01,
                'max': 1,
                'step': 0.01,
                'default': 0.02,
                'required': True
            },
            {
                'name': 'add_space',
                'label': '加仓间距(价格差)',
                'type': 'number',
                'min': 1,
                'max': 100000,
                'default': 100,
                'required': True
            },
            {
                'name': 'take_profit',
                'label': '整体止盈(价格差)',
                'type': 'number',
                'min': 1,
                'max': 100000,
                'default': 200,
                'required': True
            },
            {
                'name': 'use_entropy_step',
                'label': '启用熵值动态间距',
                'type': 'boolean',
                'default': True,
                'required': False
            },
            {
                'name': 'ent_max_mult',
                'label': '熵值最大倍数',
                'type': 'number',
                'min': 1,
                'max': 10,
                'default': 3.0,
                'required': False
            },
            {
                'name': 'allow_buy',
                'label': '允许多单',
                'type': 'boolean',
                'default': True,
                'required': True
            },
            {
                'name': 'allow_sell',
                'label': '允许空单',
                'type': 'boolean',
                'default': True,
                'required': True
            },
            {
                'name': 'tp_percent',
                'label': '分批止盈比例(%)',
                'type': 'number',
                'min': 1,
                'max': 50,
                'default': 10,
                'required': True
            },
            {
                'name': 'tp2_percent',
                'label': '第二止盈比例(%)',
                'type': 'number',
                'min': 1,
                'max': 50,
                'default': 5,
                'required': True
            },
            {
                'name': 'use_loss_close',
                'label': '启用亏损平仓',
                'type': 'boolean',
                'default': False,
                'required': False
            },
            {
                'name': 'loss_amount',
                'label': '亏损平仓金额',
                'type': 'number',
                'min': 100,
                'max': 10000,
                'default': 600,
                'required': False
            }
        ],
        'performance': {
            'win_rate': 72.0,
            'profit_factor': 2.1,
            'max_drawdown': 38.5,
            'avg_trade': 28.6
        }
    },
    {
        'id': 'shuangxiang',
        'name': '双向网格马丁策略',
        'description': '双向网格马丁格尔策略，支持多空双向开仓，自动加仓和止盈。',
        'category': '网格交易',
        'risk_level': 'high',
        'default_parameters': {
            'symbol': 'EURUSD',
            'buy_magic': 100001,
            'sell_magic': 100002,
            'fixed_lot': 0.02,
            'max_lot': 100,
            'use_auto_lot': False,
            'auto_lot_percent': 1.0,
            'grid_spacing': 100,
            'take_profit': 200,
            'lot_sequence': [0.03, 0.04, 0.05, 0.06, 0.07, 0.10, 0.13, 0.16, 0.21, 0.28, 0.36, 0.47, 0.61, 0.79, 1.02, 1.33, 1.73, 2.25, 2.92, 3.80, 4.94, 6.45, 7.96, 9.93, 11.85]
        },
        'parameters_schema': [
            {
                'name': 'symbol',
                'label': '交易品种',
                'type': 'select',
                'options': ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
                'default': 'EURUSD',
                'required': True
            },
            {
                'name': 'buy_magic',
                'label': '多单魔术号',
                'type': 'number',
                'min': 100000,
                'max': 999999,
                'default': 100001,
                'required': True
            },
            {
                'name': 'sell_magic',
                'label': '空单魔术号',
                'type': 'number',
                'min': 100000,
                'max': 999999,
                'default': 100002,
                'required': True
            },
            {
                'name': 'fixed_lot',
                'label': '首单手数',
                'type': 'number',
                'min': 0.01,
                'max': 10,
                'step': 0.01,
                'default': 0.02,
                'required': True
            },
            {
                'name': 'max_lot',
                'label': '最大手数',
                'type': 'number',
                'min': 0.01,
                'max': 100,
                'step': 0.01,
                'default': 100,
                'required': True
            },
            {
                'name': 'use_auto_lot',
                'label': '自动计算手数',
                'type': 'boolean',
                'default': False,
                'required': False
            },
            {
                'name': 'auto_lot_percent',
                'label': '自动手数比例(%)',
                'type': 'number',
                'min': 0.1,
                'max': 10,
                'step': 0.1,
                'default': 1.0,
                'required': False
            },
            {
                'name': 'grid_spacing',
                'label': '网格间距(点)',
                'type': 'number',
                'min': 10,
                'max': 1000,
                'default': 100,
                'required': True
            },
            {
                'name': 'take_profit',
                'label': '止盈点数',
                'type': 'number',
                'min': 10,
                'max': 2000,
                'default': 200,
                'required': True
            }
        ],
        'performance': {
            'win_rate': 70.0,
            'profit_factor': 2.0,
            'max_drawdown': 40.0,
            'avg_trade': 25.0
        }
    }
]


def get_db():
    return current_app.config.get('db_manager')


@strategy_bp.route('/api/strategies/templates', methods=['GET'])
def get_strategy_templates():
    try:
        from strategies.strategy_manager import strategy_manager
        
        session = get_db_session()
        db_templates = session.query(StrategyTemplate).filter_by(is_active=True, is_deleted=False).all()
        
        all_templates = session.query(StrategyTemplate).filter_by(is_active=True).all()
        deleted_ids = set(t.template_id for t in all_templates if t.is_deleted)
        inactive_ids = set(t.template_id for t in session.query(StrategyTemplate).filter_by(is_active=False).all())
        excluded_ids = deleted_ids | inactive_ids
        
        templates_data = []
        seen_ids = set()
        
        for t in db_templates:
            if t.template_id not in seen_ids:
                seen_ids.add(t.template_id)
                templates_data.append({
                    'id': t.template_id,
                    'name': t.name,
                    'description': t.description,
                    'category': t.category,
                    'risk_level': t.risk_level,
                    'default_parameters': json.loads(t.default_parameters) if t.default_parameters else {},
                    'parameters_schema': json.loads(t.parameters_schema) if t.parameters_schema else [],
                    'performance': json.loads(t.performance) if t.performance else {}
                })
        
        strategies = strategy_manager.list_strategies()
        for s in strategies:
            if s.get('id') not in seen_ids and s.get('id') not in excluded_ids:
                seen_ids.add(s.get('id'))
                template_info = next((t for t in STRATEGY_TEMPLATES if t['id'] == s.get('id')), {})
                templates_data.append({
                    'id': s.get('id'),
                    'name': s.get('name', s.get('id')),
                    'description': s.get('description', ''),
                    'category': s.get('category', '自定义'),
                    'risk_level': s.get('risk_level', 'medium'),
                    'default_parameters': template_info.get('default_parameters', {}),
                    'parameters_schema': template_info.get('parameters_schema', []),
                    'performance': template_info.get('performance', {})
                })
        
        return jsonify({
            'success': True,
            'data': templates_data
        })
    except Exception as e:
        logger.error(f"获取策略模板失败: {e}")
        return jsonify({
            'success': True,
            'data': []
        })


@strategy_bp.route('/api/strategies/templates/<template_id>', methods=['GET'])
def get_strategy_template(template_id):
    try:
        session = get_db_session()
        db_template = session.query(StrategyTemplate).filter_by(template_id=template_id, is_active=True).first()
        
        if db_template:
            template_data = {
                'id': db_template.template_id,
                'name': db_template.name,
                'description': db_template.description,
                'category': db_template.category,
                'risk_level': db_template.risk_level,
                'default_parameters': json.loads(db_template.default_parameters) if db_template.default_parameters else {},
                'parameters_schema': json.loads(db_template.parameters_schema) if db_template.parameters_schema else [],
                'performance': json.loads(db_template.performance) if db_template.performance else {}
            }
            return jsonify({
                'success': True,
                'data': template_data
            })
        
        template = next((t for t in STRATEGY_TEMPLATES if t['id'] == template_id), None)
        if not template:
            return jsonify({
                'success': False,
                'error': '策略模板不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'data': template
        })
    except Exception as e:
        logger.error(f"获取策略模板详情失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies', methods=['GET'])
def get_strategies():
    try:
        db_manager = get_db()
        session = db_manager.get_session()
        
        strategies = session.query(Strategy).order_by(Strategy.created_at.desc()).all()
        
        result = []
        for strategy in strategies:
            runtime_info = None
            if strategy.template_id == 'ma_cross':
                runtime_info = ma_cross_manager.get_strategy_performance(strategy.strategy_id)
            elif strategy.template_id == 'martin_grid':
                runtime_info = martin_grid_manager.get_strategy_performance(strategy.strategy_id)
            elif strategy.template_id == 'rsi_reversal':
                runtime_info = rsi_manager.get_performance(strategy.strategy_id)
            elif strategy.template_id == 'bollinger_bands':
                runtime_info = bollinger_bands_manager.get_performance(strategy.strategy_id)
            elif strategy.template_id == 'dual_grid_martin':
                runtime_info = dual_grid_martin_manager.get_performance(strategy.strategy_id)
            elif strategy.template_id == 'linshu':
                pass
            
            params = strategy.parameters
            if isinstance(params, str):
                params = json.loads(params)
            
            result.append({
                'id': strategy.id,
                'strategy_id': strategy.strategy_id,
                'name': strategy.name,
                'template_id': strategy.template_id,
                'parameters': params,
                'status': strategy.status,
                'created_at': strategy.created_at.isoformat() if strategy.created_at else None,
                'updated_at': strategy.updated_at.isoformat() if strategy.updated_at else None,
                'runtime': runtime_info
            })
        
        session.close()
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"获取策略列表失败: {e}")
        if 'session' in locals():
            session.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies', methods=['POST'])
def create_strategy():
    try:
        data = request.get_json()
        
        template_id = data.get('template_id')
        name = data.get('name')
        parameters = data.get('parameters', {})
        
        if not template_id or not name:
            return jsonify({
                'success': False,
                'error': '缺少必要参数'
            }), 400
        
        template = next((t for t in STRATEGY_TEMPLATES if t['id'] == template_id), None)
        if not template:
            return jsonify({
                'success': False,
                'error': '策略模板不存在'
            }), 404
        
        strategy_id = f"{template_id}_{uuid.uuid4().hex[:8]}"
        
        default_params = template['default_parameters'].copy()
        default_params.update(parameters)
        
        if template_id == 'ma_cross':
            ma_cross_manager.create_strategy(strategy_id, default_params)
        elif template_id == 'martin_grid':
            martin_grid_manager.create_strategy(strategy_id, default_params)
        elif template_id == 'rsi_reversal':
            rsi_manager.create_strategy(strategy_id, default_params)
        elif template_id == 'bollinger_bands':
            bollinger_bands_manager.create_strategy(strategy_id, default_params)
        elif template_id == 'dual_grid_martin':
            dual_grid_martin_manager.create_strategy(strategy_id, default_params)
        elif template_id == 'linshu':
            linshu_manager(default_params, strategy_id)
        
        db_manager = get_db()
        session = db_manager.get_session()
        
        db_strategy = Strategy(
            strategy_id=strategy_id,
            name=name,
            template_id=template_id,
            parameters=json.dumps(default_params),
            status='stopped'
        )
        session.add(db_strategy)
        session.commit()
        
        result = {
            'id': db_strategy.id,
            'strategy_id': strategy_id,
            'name': name,
            'template_id': template_id,
            'parameters': default_params,
            'status': 'stopped'
        }
        
        session.close()
        
        logger.info(f"创建策略成功: {strategy_id}")
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"创建策略失败: {e}")
        if 'session' in locals():
            session.rollback()
            session.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies/<strategy_id>', methods=['GET'])
def get_strategy(strategy_id):
    try:
        db_manager = get_db()
        session = db_manager.get_session()
        
        strategy = session.query(Strategy).filter_by(strategy_id=strategy_id).first()
        if not strategy:
            session.close()
            return jsonify({
                'success': False,
                'error': '策略不存在'
            }), 404
        
        runtime_info = ma_cross_manager.get_strategy_performance(strategy_id)
        template = next((t for t in STRATEGY_TEMPLATES if t['id'] == strategy.template_id), None)
        
        params = strategy.parameters
        if isinstance(params, str):
            params = json.loads(params)
        
        result = {
            'id': strategy.id,
            'strategy_id': strategy.strategy_id,
            'name': strategy.name,
            'template_id': strategy.template_id,
            'template': template,
            'parameters': params,
            'status': strategy.status,
            'created_at': strategy.created_at.isoformat() if strategy.created_at else None,
            'updated_at': strategy.updated_at.isoformat() if strategy.updated_at else None,
            'runtime': runtime_info
        }
        
        session.close()
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"获取策略详情失败: {e}")
        if 'session' in locals():
            session.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies/<strategy_id>', methods=['PUT'])
def update_strategy(strategy_id):
    try:
        db_manager = get_db()
        session = db_manager.get_session()
        
        strategy = session.query(Strategy).filter_by(strategy_id=strategy_id).first()
        if not strategy:
            session.close()
            return jsonify({
                'success': False,
                'error': '策略不存在'
            }), 404
        
        if strategy.status == 'running':
            session.close()
            return jsonify({
                'success': False,
                'error': '运行中的策略不能修改，请先停止策略'
            }), 400
        
        data = request.get_json()
        
        if 'name' in data:
            strategy.name = data['name']
        
        if 'parameters' in data:
            current_params = strategy.parameters
            if isinstance(current_params, str):
                current_params = json.loads(current_params)
            current_params.update(data['parameters'])
            strategy.parameters = json.dumps(current_params)
            
            if strategy.template_id == 'ma_cross':
                runtime_strategy = ma_cross_manager.get_strategy(strategy_id)
                if runtime_strategy:
                    runtime_strategy.set_parameters(current_params)
            elif strategy.template_id == 'martin_grid':
                runtime_strategy = martin_grid_manager.get_strategy(strategy_id)
                if runtime_strategy:
                    pass
        
        strategy.updated_at = datetime.utcnow()
        session.commit()
        
        params = strategy.parameters
        if isinstance(params, str):
            params = json.loads(params)
        
        result = {
            'strategy_id': strategy_id,
            'name': strategy.name,
            'parameters': params
        }
        
        session.close()
        
        logger.info(f"更新策略成功: {strategy_id}")
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"更新策略失败: {e}")
        if 'session' in locals():
            session.rollback()
            session.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies/<strategy_id>', methods=['DELETE'])
def delete_strategy(strategy_id):
    try:
        db_manager = get_db()
        session = db_manager.get_session()
        
        strategy = session.query(Strategy).filter_by(strategy_id=strategy_id).first()
        if not strategy:
            session.close()
            return jsonify({
                'success': False,
                'error': '策略不存在'
            }), 404
        
        if strategy.status == 'running':
            session.close()
            return jsonify({
                'success': False,
                'error': '运行中的策略不能删除，请先停止策略'
            }), 400
        
        if strategy.template_id == 'ma_cross':
            ma_cross_manager.remove_strategy(strategy_id)
        elif strategy.template_id == 'martin_grid':
            martin_grid_manager.remove_strategy(strategy_id)
        elif strategy.template_id == 'rsi_reversal':
            rsi_manager.remove_strategy(strategy_id)
        elif strategy.template_id == 'bollinger_bands':
            bollinger_bands_manager.remove_strategy(strategy_id)
        elif strategy.template_id == 'dual_grid_martin':
            dual_grid_martin_manager.remove_strategy(strategy_id)
        elif strategy.template_id == 'linshu':
            pass
        
        session.delete(strategy)
        session.commit()
        session.close()
        
        logger.info(f"删除策略成功: {strategy_id}")
        
        return jsonify({
            'success': True,
            'message': '策略已删除'
        })
    except Exception as e:
        logger.error(f"删除策略失败: {e}")
        if 'session' in locals():
            session.rollback()
            session.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies/<strategy_id>/start', methods=['POST'])
def start_strategy(strategy_id):
    try:
        db_manager = get_db()
        session = db_manager.get_session()
        
        strategy = session.query(Strategy).filter_by(strategy_id=strategy_id).first()
        if not strategy:
            session.close()
            return jsonify({
                'success': False,
                'error': '策略不存在'
            }), 404
        
        if strategy.status == 'running':
            session.close()
            return jsonify({
                'success': False,
                'error': '策略已在运行中'
            }), 400
        
        params = strategy.parameters
        if isinstance(params, str):
            params = json.loads(params)
        
        if strategy.template_id == 'ma_cross':
            runtime_strategy = ma_cross_manager.get_strategy(strategy_id)
            if not runtime_strategy:
                runtime_strategy = ma_cross_manager.create_strategy(strategy_id, params)
            ma_cross_manager.start_strategy(strategy_id)
        elif strategy.template_id == 'martin_grid':
            runtime_strategy = martin_grid_manager.get_strategy(strategy_id)
            if not runtime_strategy:
                runtime_strategy = martin_grid_manager.create_strategy(strategy_id, params)
            martin_grid_manager.start_strategy(strategy_id)
        elif strategy.template_id == 'rsi_reversal':
            runtime_strategy = rsi_manager.get_strategy(strategy_id)
            if not runtime_strategy:
                runtime_strategy = rsi_manager.create_strategy(strategy_id, params)
            rsi_manager.start_strategy(strategy_id)
        elif strategy.template_id == 'bollinger_bands':
            runtime_strategy = bollinger_bands_manager.get_strategy(strategy_id)
            if not runtime_strategy:
                runtime_strategy = bollinger_bands_manager.create_strategy(strategy_id, params)
            bollinger_bands_manager.start_strategy(strategy_id)
        elif strategy.template_id == 'dual_grid_martin':
            runtime_strategy = dual_grid_martin_manager.get_strategy(strategy_id)
            if not runtime_strategy:
                runtime_strategy = dual_grid_martin_manager.create_strategy(strategy_id, params)
            dual_grid_martin_manager.start_strategy(strategy_id)
        elif strategy.template_id == 'linshu':
            linshu_strategy = linshu_manager(params, strategy_id)
            linshu_strategy.start()
        
        strategy.status = 'running'
        strategy.updated_at = datetime.utcnow()
        session.commit()
        session.close()
        
        logger.info(f"启动策略成功: {strategy_id}")
        
        return jsonify({
            'success': True,
            'message': '策略已启动',
            'data': {
                'strategy_id': strategy_id,
                'status': 'running'
            }
        })
    except Exception as e:
        logger.error(f"启动策略失败: {e}")
        if 'session' in locals():
            session.rollback()
            session.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies/<strategy_id>/stop', methods=['POST'])
def stop_strategy(strategy_id):
    try:
        db_manager = get_db()
        session = db_manager.get_session()
        
        strategy = session.query(Strategy).filter_by(strategy_id=strategy_id).first()
        if not strategy:
            session.close()
            return jsonify({
                'success': False,
                'error': '策略不存在'
            }), 404
        
        if strategy.status != 'running':
            session.close()
            return jsonify({
                'success': False,
                'error': '策略未在运行'
            }), 400
        
        if strategy.template_id == 'ma_cross':
            ma_cross_manager.stop_strategy(strategy_id)
        elif strategy.template_id == 'martin_grid':
            martin_grid_manager.stop_strategy(strategy_id)
        elif strategy.template_id == 'rsi_reversal':
            rsi_manager.stop_strategy(strategy_id)
        elif strategy.template_id == 'bollinger_bands':
            bollinger_bands_manager.stop_strategy(strategy_id)
        elif strategy.template_id == 'dual_grid_martin':
            dual_grid_martin_manager.stop_strategy(strategy_id)
        elif strategy.template_id == 'linshu':
            pass
        
        strategy.status = 'stopped'
        strategy.updated_at = datetime.utcnow()
        session.commit()
        session.close()
        
        logger.info(f"停止策略成功: {strategy_id}")
        
        return jsonify({
            'success': True,
            'message': '策略已停止',
            'data': {
                'strategy_id': strategy_id,
                'status': 'stopped'
            }
        })
    except Exception as e:
        logger.error(f"停止策略失败: {e}")
        if 'session' in locals():
            session.rollback()
            session.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies/<strategy_id>/performance', methods=['GET'])
def get_strategy_performance(strategy_id):
    try:
        db_manager = get_db()
        session = db_manager.get_session()
        
        strategy = session.query(Strategy).filter_by(strategy_id=strategy_id).first()
        if not strategy:
            session.close()
            return jsonify({
                'success': False,
                'error': '策略不存在'
            }), 404
        
        session.close()
        
        performance = None
        if strategy.template_id == 'ma_cross':
            performance = ma_cross_manager.get_strategy_performance(strategy_id)
        elif strategy.template_id == 'martin_grid':
            performance = martin_grid_manager.get_strategy_performance(strategy_id)
        elif strategy.template_id == 'rsi_reversal':
            performance = rsi_manager.get_performance(strategy_id)
        elif strategy.template_id == 'bollinger_bands':
            performance = bollinger_bands_manager.get_performance(strategy_id)
        elif strategy.template_id == 'dual_grid_martin':
            performance = dual_grid_martin_manager.get_performance(strategy_id)
        
        return jsonify({
            'success': True,
            'data': performance or {}
        })
    except Exception as e:
        logger.error(f"获取策略表现失败: {e}")
        if 'session' in locals():
            session.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies/<strategy_id>/logs', methods=['GET'])
def get_strategy_logs(strategy_id):
    """获取策略日志"""
    try:
        limit = request.args.get('limit', 100, type=int)
        level = request.args.get('level', None)
        
        logs = strategy_logger.get_logs(strategy_id, limit=limit, level=level)
        
        return jsonify({
            'success': True,
            'data': logs
        })
    except Exception as e:
        logger.error(f"获取策略日志失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@strategy_bp.route('/api/strategies/<strategy_id>/logs/clear', methods=['POST'])
def clear_strategy_logs(strategy_id):
    """清除策略日志"""
    try:
        strategy_logger.clear_logs(strategy_id)
        
        return jsonify({
            'success': True,
            'message': '日志已清除'
        })
    except Exception as e:
        logger.error(f"清除策略日志失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

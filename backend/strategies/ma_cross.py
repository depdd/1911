import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from loguru import logger
import MetaTrader5 as mt5
from dataclasses import dataclass

@dataclass
class Signal:
    type: str  # 'buy' or 'sell'
    symbol: str
    price: float
    timestamp: datetime
    strategy: str
    confidence: float = 0.0
    sl: float = 0.0
    tp: float = 0.0

class MACrossStrategy:
    """移动平均线交叉策略"""
    
    def __init__(self, parameters: Dict):
        self.name = "MA_Cross"
        self.symbol = parameters.get('symbol', 'EURUSD')
        self.fast_period = parameters.get('fast_period', 20)
        self.slow_period = parameters.get('slow_period', 50)
        self.volume = parameters.get('volume', 0.1)
        self.sl_pips = parameters.get('sl_pips', 50)
        self.tp_pips = parameters.get('tp_pips', 100)
        self.timeframe = parameters.get('timeframe', 'H1')
        self.is_running = False
        self.position = None  # 当前持仓
        
        # 策略状态
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.total_profit = 0.0
        self.max_drawdown = 0.0
        
    def calculate_indicators(self, data: pd.DataFrame) -> pd.DataFrame:
        """计算技术指标"""
        try:
            # 计算移动平均线
            data[f'MA_{self.fast_period}'] = data['close'].rolling(window=self.fast_period).mean()
            data[f'MA_{self.slow_period}'] = data['close'].rolling(window=self.slow_period).mean()
            
            # 计算交叉信号
            data['ma_cross'] = 0
            data.loc[data[f'MA_{self.fast_period}'] > data[f'MA_{self.slow_period}'], 'ma_cross'] = 1
            data.loc[data[f'MA_{self.fast_period}'] < data[f'MA_{self.slow_period}'], 'ma_cross'] = -1
            
            # 计算信号变化（交叉点）
            data['cross_signal'] = data['ma_cross'].diff()
            
            return data
            
        except Exception as e:
            logger.error(f"计算指标失败: {e}")
            return data
    
    def generate_signals(self, data: pd.DataFrame, current_price: float) -> List[Signal]:
        """生成交易信号"""
        signals = []
        
        try:
            if len(data) < max(self.fast_period, self.slow_period) + 1:
                return signals
            
            # 获取最新的两根K线
            latest_data = data.tail(2)
            current_cross = latest_data.iloc[-1]['cross_signal']
            
            # 检查是否有交叉信号
            if current_cross != 0:
                # 金叉 - 买入信号
                if current_cross > 0 and self.position != 'long':
                    signal = Signal(
                        type='buy',
                        symbol=self.symbol,
                        price=current_price,
                        timestamp=datetime.now(),
                        strategy=self.name,
                        confidence=0.8,
                        sl=current_price - self.sl_pips * 0.0001,  # 简化计算
                        tp=current_price + self.tp_pips * 0.0001
                    )
                    signals.append(signal)
                    logger.info(f"生成买入信号: {self.symbol} @ {current_price}")
                
                # 死叉 - 卖出信号
                elif current_cross < 0 and self.position != 'short':
                    signal = Signal(
                        type='sell',
                        symbol=self.symbol,
                        price=current_price,
                        timestamp=datetime.now(),
                        strategy=self.name,
                        confidence=0.8,
                        sl=current_price + self.sl_pips * 0.0001,
                        tp=current_price - self.tp_pips * 0.0001
                    )
                    signals.append(signal)
                    logger.info(f"生成卖出信号: {self.symbol} @ {current_price}")
            
            return signals
            
        except Exception as e:
            logger.error(f"生成信号失败: {e}")
            return signals
    
    def check_exit_conditions(self, data: pd.DataFrame, current_price: float) -> Optional[str]:
        """检查退出条件"""
        try:
            if len(data) < max(self.fast_period, self.slow_period) + 1:
                return None
            
            # 检查反向交叉
            latest_data = data.tail(2)
            current_cross = latest_data.iloc[-1]['cross_signal']
            
            if self.position == 'long' and current_cross < 0:
                return 'sell'  # 多头遇到死叉，平仓
            elif self.position == 'short' and current_cross > 0:
                return 'buy'   # 空头遇到金叉，平仓
            
            return None
            
        except Exception as e:
            logger.error(f"检查退出条件失败: {e}")
            return None
    
    def update_performance(self, profit: float, is_win: bool):
        """更新策略表现"""
        self.total_trades += 1
        self.total_profit += profit
        
        if is_win:
            self.winning_trades += 1
        else:
            self.losing_trades += 1
        
        # 更新最大回撤（简化计算）
        if self.total_profit < self.max_drawdown:
            self.max_drawdown = self.total_profit
    
    def get_performance_metrics(self) -> Dict:
        """获取策略表现指标"""
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': round(win_rate, 2),
            'total_profit': round(self.total_profit, 2),
            'max_drawdown': round(self.max_drawdown, 2),
            'current_position': self.position
        }
    
    def get_parameters(self) -> Dict:
        """获取策略参数"""
        return {
            'symbol': self.symbol,
            'fast_period': self.fast_period,
            'slow_period': self.slow_period,
            'volume': self.volume,
            'sl_pips': self.sl_pips,
            'tp_pips': self.tp_pips,
            'timeframe': self.timeframe
        }
    
    def set_parameters(self, parameters: Dict):
        """设置策略参数"""
        self.symbol = parameters.get('symbol', self.symbol)
        self.fast_period = parameters.get('fast_period', self.fast_period)
        self.slow_period = parameters.get('slow_period', self.slow_period)
        self.volume = parameters.get('volume', self.volume)
        self.sl_pips = parameters.get('sl_pips', self.sl_pips)
        self.tp_pips = parameters.get('tp_pips', self.tp_pips)
        self.timeframe = parameters.get('timeframe', self.timeframe)
    
    def start(self):
        """启动策略"""
        self.is_running = True
        logger.info(f"策略 {self.name} 启动")
    
    def stop(self):
        """停止策略"""
        self.is_running = False
        logger.info(f"策略 {self.name} 停止")
    
    def is_strategy_running(self) -> bool:
        """检查策略是否在运行"""
        return self.is_running

class MACrossStrategyManager:
    """MA交叉策略管理器"""
    
    def __init__(self):
        self.strategies: Dict[str, MACrossStrategy] = {}
        self.mt5_client = None
    
    def set_mt5_client(self, mt5_client):
        """设置MT5客户端"""
        self.mt5_client = mt5_client
    
    def create_strategy(self, strategy_id: str, parameters: Dict) -> MACrossStrategy:
        """创建策略实例"""
        strategy = MACrossStrategy(parameters)
        self.strategies[strategy_id] = strategy
        logger.info(f"创建策略: {strategy_id}")
        return strategy
    
    def remove_strategy(self, strategy_id: str):
        """移除策略"""
        if strategy_id in self.strategies:
            strategy = self.strategies[strategy_id]
            strategy.stop()
            del self.strategies[strategy_id]
            logger.info(f"移除策略: {strategy_id}")
    
    def get_strategy(self, strategy_id: str) -> Optional[MACrossStrategy]:
        """获取策略实例"""
        return self.strategies.get(strategy_id)
    
    def get_all_strategies(self) -> Dict[str, MACrossStrategy]:
        """获取所有策略"""
        return self.strategies
    
    async def run_strategy(self, strategy_id: str):
        """运行策略"""
        if strategy_id not in self.strategies:
            logger.error(f"策略不存在: {strategy_id}")
            return
        
        strategy = self.strategies[strategy_id]
        
        if not strategy.is_strategy_running():
            logger.info(f"策略未运行: {strategy_id}")
            return
        
        try:
            # 获取历史数据
            from mt5_client import mt5_client
            
            # 获取足够的历史数据用于计算指标
            count = max(strategy.fast_period, strategy.slow_period) + 100
            df = await mt5_client.get_historical_data(strategy.symbol, strategy.timeframe, count)
            
            if df is None or len(df) < 50:
                logger.warning(f"数据不足，跳过本次执行: {strategy.symbol}")
                return
            
            # 计算指标
            df = strategy.calculate_indicators(df)
            
            # 获取当前价格
            tick_data = await mt5_client.get_tick_data(strategy.symbol)
            if tick_data is None:
                logger.warning(f"无法获取当前价格: {strategy.symbol}")
                return
            
            current_price = tick_data['ask']
            
            # 生成交易信号
            signals = strategy.generate_signals(df, current_price)
            
            # 检查退出条件
            exit_signal = strategy.check_exit_conditions(df, current_price)
            
            # 执行交易逻辑
            await self.execute_trading_logic(strategy, signals, exit_signal, current_price)
            
        except Exception as e:
            logger.error(f"运行策略异常: {e}")
    
    async def execute_trading_logic(self, strategy: MACrossStrategy, signals: List[Signal], 
                                   exit_signal: Optional[str], current_price: float):
        """执行交易逻辑"""
        try:
            # 处理退出信号
            if exit_signal and strategy.position:
                if (strategy.position == 'long' and exit_signal == 'sell') or \
                   (strategy.position == 'short' and exit_signal == 'buy'):
                    
                    # 平仓逻辑
                    result = await self.mt5_client.close_position(strategy.symbol)
                    if result['success']:
                        strategy.position = None
                        logger.info(f"策略 {strategy.name} 平仓: {strategy.symbol}")
            
            # 处理新信号
            for signal in signals:
                if signal.type == 'buy' and strategy.position != 'long':
                    # 开多单
                    result = await self.mt5_client.place_order(
                        symbol=signal.symbol,
                        order_type='buy',
                        volume=strategy.volume,
                        price=signal.price,
                        sl=signal.sl,
                        tp=signal.tp,
                        comment=f"MA Cross Strategy {strategy.name}"
                    )
                    
                    if result['success']:
                        strategy.position = 'long'
                        logger.info(f"策略 {strategy.name} 开多单: {signal.symbol} @ {signal.price}")
                
                elif signal.type == 'sell' and strategy.position != 'short':
                    # 开空单
                    result = await self.mt5_client.place_order(
                        symbol=signal.symbol,
                        order_type='sell',
                        volume=strategy.volume,
                        price=signal.price,
                        sl=signal.sl,
                        tp=signal.tp,
                        comment=f"MA Cross Strategy {strategy.name}"
                    )
                    
                    if result['success']:
                        strategy.position = 'short'
                        logger.info(f"策略 {strategy.name} 开空单: {signal.symbol} @ {signal.price}")
            
        except Exception as e:
            logger.error(f"执行交易逻辑异常: {e}")
    
    def start_strategy(self, strategy_id: str):
        """启动策略"""
        if strategy_id in self.strategies:
            self.strategies[strategy_id].start()
            logger.info(f"启动策略: {strategy_id}")
    
    def stop_strategy(self, strategy_id: str):
        """停止策略"""
        if strategy_id in self.strategies:
            self.strategies[strategy_id].stop()
            logger.info(f"停止策略: {strategy_id}")
    
    def get_strategy_performance(self, strategy_id: str) -> Optional[Dict]:
        """获取策略表现"""
        if strategy_id in self.strategies:
            return self.strategies[strategy_id].get_performance_metrics()
        return None

# 全局策略管理器实例
ma_cross_manager = MACrossStrategyManager()
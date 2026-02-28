"""
布林带突破策略
- 基于布林带上下轨突破的趋势跟踪策略
- 价格突破上轨时买入，突破下轨时卖出
- 支持外汇、黄金、BTC等多种品种
"""
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional
from loguru import logger
import MetaTrader5 as mt5
from dataclasses import dataclass
import threading
import time


@dataclass
class Signal:
    type: str
    symbol: str
    price: float
    timestamp: datetime
    strategy: str
    confidence: float = 0.0
    sl: float = 0.0
    tp: float = 0.0


class BollingerBandsStrategy:
    """布林带突破策略"""
    
    def __init__(self, parameters: Dict):
        self.name = "Bollinger_Bands"
        self.symbol = parameters.get('symbol', 'EURUSD')
        self.bb_period = parameters.get('bb_period', 20)
        self.bb_deviation = parameters.get('bb_deviation', 2.0)
        self.volume = parameters.get('volume', 0.1)
        self.sl_pips = parameters.get('sl_pips', 40)
        self.tp_pips = parameters.get('tp_pips', 80)
        self.timeframe = parameters.get('timeframe', 'H1')
        self.is_running = False
        self.position = None
        
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.total_profit = 0.0
        self.max_drawdown = 0.0
        
        self._thread = None
        self._stop_event = threading.Event()
        
    def get_pip_value(self, symbol: str) -> float:
        """获取点值 - 支持外汇、黄金、BTC"""
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info is None:
            logger.error(f"无法获取 {symbol} 的信息")
            return 0.0001
        
        digits = symbol_info.digits
        
        if 'BTC' in symbol or 'bitcoin' in symbol.lower():
            return 1.0
        elif 'XAU' in symbol or 'GOLD' in symbol.upper():
            return 0.1
        elif 'JPY' in symbol:
            return 0.01
        elif digits == 3 or digits == 5:
            return 0.00001
        else:
            return 0.0001
    
    def get_min_sl_distance(self, symbol: str) -> float:
        """获取最小止损距离（点数乘数）"""
        if 'BTC' in symbol or 'bitcoin' in symbol.lower():
            return 100
        elif 'XAU' in symbol or 'GOLD' in symbol.upper():
            return 50
        else:
            return 1
    
    def get_timeframe_minutes(self, timeframe: str) -> int:
        """获取时间周期对应的分钟数"""
        tf_map = {
            'M1': 1, 'M5': 5, 'M15': 15, 'M30': 30,
            'H1': 60, 'H4': 240, 'D1': 1440, 'W1': 10080
        }
        return tf_map.get(timeframe, 60)
    
    def get_mt5_timeframe(self, timeframe: str):
        """获取MT5时间周期常量"""
        tf_map = {
            'M1': mt5.TIMEFRAME_M1,
            'M5': mt5.TIMEFRAME_M5,
            'M15': mt5.TIMEFRAME_M15,
            'M30': mt5.TIMEFRAME_M30,
            'H1': mt5.TIMEFRAME_H1,
            'H4': mt5.TIMEFRAME_H4,
            'D1': mt5.TIMEFRAME_D1,
            'W1': mt5.TIMEFRAME_W1
        }
        return tf_map.get(timeframe, mt5.TIMEFRAME_H1)
    
    def calculate_bollinger_bands(self, data: pd.DataFrame, period: int, deviation: float) -> pd.DataFrame:
        """计算布林带指标"""
        try:
            close = data['close']
            
            sma = close.rolling(window=period).mean()
            std = close.rolling(window=period).std()
            
            data['bb_middle'] = sma
            data['bb_upper'] = sma + (std * deviation)
            data['bb_lower'] = sma - (std * deviation)
            data['bb_width'] = data['bb_upper'] - data['bb_lower']
            
            data['bb_position'] = (close - data['bb_lower']) / (data['bb_upper'] - data['bb_lower'])
            
            return data
            
        except Exception as e:
            logger.error(f"计算布林带失败: {e}")
            return data
    
    def get_historical_data(self, bars: int = 100) -> Optional[pd.DataFrame]:
        """获取历史数据"""
        try:
            tf = self.get_mt5_timeframe(self.timeframe)
            rates = mt5.copy_rates_from_pos(self.symbol, tf, 0, bars)
            
            if rates is None or len(rates) == 0:
                logger.error(f"无法获取 {self.symbol} 的历史数据")
                return None
            
            df = pd.DataFrame(rates)
            df['time'] = pd.to_datetime(df['time'], unit='s')
            
            return df
        except Exception as e:
            logger.error(f"获取历史数据失败: {e}")
            return None
    
    def get_current_price(self) -> Optional[float]:
        """获取当前价格"""
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            logger.error(f"无法获取 {self.symbol} 的价格")
            return None
        return (tick.bid + tick.ask) / 2
    
    def generate_signals(self, data: pd.DataFrame, current_price: float) -> List[Signal]:
        """生成交易信号"""
        signals = []
        
        try:
            if len(data) < self.bb_period + 1:
                return signals
            
            data = self.calculate_bollinger_bands(data, self.bb_period, self.bb_deviation)
            
            if 'bb_upper' not in data.columns or data['bb_upper'].isna().all():
                return signals
            
            current_close = data['close'].iloc[-1]
            prev_close = data['close'].iloc[-2]
            
            current_upper = data['bb_upper'].iloc[-1]
            current_lower = data['bb_lower'].iloc[-1]
            prev_upper = data['bb_upper'].iloc[-2]
            prev_lower = data['bb_lower'].iloc[-2]
            
            pip_value = self.get_pip_value(self.symbol)
            
            if prev_close <= prev_upper and current_close > current_upper:
                if self.position != 'long':
                    signal = Signal(
                        type='buy',
                        symbol=self.symbol,
                        price=current_price,
                        timestamp=datetime.now(),
                        strategy=self.name,
                        confidence=0.8,
                        sl=current_price - self.sl_pips * pip_value,
                        tp=current_price + self.tp_pips * pip_value
                    )
                    signals.append(signal)
                    logger.info(f"布林带上破买入信号: {self.symbol} @ {current_price}")
            
            elif prev_close >= prev_lower and current_close < current_lower:
                if self.position != 'short':
                    signal = Signal(
                        type='sell',
                        symbol=self.symbol,
                        price=current_price,
                        timestamp=datetime.now(),
                        strategy=self.name,
                        confidence=0.8,
                        sl=current_price + self.sl_pips * pip_value,
                        tp=current_price - self.tp_pips * pip_value
                    )
                    signals.append(signal)
                    logger.info(f"布林带下破卖出信号: {self.symbol} @ {current_price}")
            
            return signals
            
        except Exception as e:
            logger.error(f"生成信号失败: {e}")
            return signals
    
    def place_order(self, signal: Signal) -> Optional[int]:
        """下单"""
        try:
            tick = mt5.symbol_info_tick(self.symbol)
            if tick is None:
                logger.error(f"无法获取 {self.symbol} 的tick数据")
                return None
            
            symbol_info = mt5.symbol_info(self.symbol)
            if symbol_info is None:
                logger.error(f"无法获取 {self.symbol} 的信息")
                return None
            
            pip_value = self.get_pip_value(self.symbol)
            min_distance = self.get_min_sl_distance(self.symbol)
            
            sl_distance = max(self.sl_pips * min_distance, self.sl_pips) * pip_value
            tp_distance = max(self.tp_pips * min_distance, self.tp_pips) * pip_value
            
            if signal.type == 'buy':
                order_type = mt5.ORDER_TYPE_BUY
                price = tick.ask
                sl = price - sl_distance
                tp = price + tp_distance
            else:
                order_type = mt5.ORDER_TYPE_SELL
                price = tick.bid
                sl = price + sl_distance
                tp = price - tp_distance
            
            logger.info(f"下单参数: {signal.type} {self.symbol} @ {price}, SL={sl}, TP={tp}, 距离={sl_distance}")
            
            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": self.symbol,
                "volume": self.volume,
                "type": order_type,
                "price": price,
                "sl": sl,
                "tp": tp,
                "deviation": 20,
                "magic": 888890,
                "comment": f"BB_{signal.type}",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_IOC,
            }
            
            result = mt5.order_send(request)
            
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                logger.error(f"下单失败: {result.comment}")
                return None
            
            logger.info(f"下单成功: {signal.type} {self.symbol} @ {price}")
            self.total_trades += 1
            
            if signal.type == 'buy':
                self.position = 'long'
            else:
                self.position = 'short'
            
            return result.order
            
        except Exception as e:
            logger.error(f"下单异常: {e}")
            return None
    
    def check_positions(self):
        """检查持仓状态"""
        try:
            positions = mt5.positions_get(symbol=self.symbol)
            if positions is None or len(positions) == 0:
                self.position = None
                return
            
            for pos in positions:
                if pos.magic == 888890:
                    self.position = 'long' if pos.type == mt5.ORDER_TYPE_BUY else 'short'
                    break
        except Exception as e:
            logger.error(f"检查持仓失败: {e}")
    
    def update_performance_from_history(self):
        """从历史订单更新策略表现"""
        try:
            from datetime import datetime, timedelta
            
            from_date = datetime.now() - timedelta(days=1)
            to_date = datetime.now()
            
            deals = mt5.history_deals_get(from_date, to_date)
            if deals is None:
                return
            
            total_trades = 0
            winning_trades = 0
            losing_trades = 0
            total_profit = 0.0
            
            for deal in deals:
                if deal.magic == 888890:
                    total_trades += 1
                    profit = deal.profit
                    total_profit += profit
                    
                    if profit > 0:
                        winning_trades += 1
                    elif profit < 0:
                        losing_trades += 1
            
            if total_trades > self.total_trades:
                self.total_trades = total_trades
                self.winning_trades = winning_trades
                self.losing_trades = losing_trades
                self.total_profit = total_profit
                
        except Exception as e:
            logger.error(f"更新历史表现失败: {e}")
    
    def run_cycle(self):
        """执行一次策略循环"""
        try:
            if not mt5.initialize():
                logger.error("MT5初始化失败")
                return
            
            self.check_positions()
            self.update_performance_from_history()
            
            data = self.get_historical_data(100)
            if data is None:
                return
            
            current_price = self.get_current_price()
            if current_price is None:
                return
            
            signals = self.generate_signals(data, current_price)
            
            for signal in signals:
                self.place_order(signal)
                
        except Exception as e:
            logger.error(f"策略循环执行失败: {e}")
    
    def _run_loop(self):
        """策略主循环"""
        logger.info(f"布林带策略 {self.symbol} 开始运行")
        
        while not self._stop_event.is_set():
            try:
                self.run_cycle()
            except Exception as e:
                logger.error(f"策略循环异常: {e}")
            
            time.sleep(5)
        
        logger.info(f"布林带策略 {self.symbol} 已停止")
    
    def start(self):
        """启动策略"""
        if self.is_running:
            return
        
        self.is_running = True
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info(f"布林带策略 {self.symbol} 启动成功")
    
    def stop(self):
        """停止策略"""
        if not self.is_running:
            return
        
        self.is_running = False
        self._stop_event.set()
        
        if self._thread:
            self._thread.join(timeout=5)
        
        logger.info(f"布林带策略 {self.symbol} 已停止")
    
    def get_performance(self) -> Dict:
        """获取策略表现"""
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': win_rate,
            'total_profit': self.total_profit,
            'max_drawdown': self.max_drawdown
        }


class BollingerBandsManager:
    """布林带策略管理器"""
    
    def __init__(self):
        self.strategies: Dict[str, BollingerBandsStrategy] = {}
    
    def create_strategy(self, strategy_id: str, parameters: Dict) -> BollingerBandsStrategy:
        """创建策略实例"""
        strategy = BollingerBandsStrategy(parameters)
        self.strategies[strategy_id] = strategy
        return strategy
    
    def get_strategy(self, strategy_id: str) -> Optional[BollingerBandsStrategy]:
        """获取策略实例"""
        return self.strategies.get(strategy_id)
    
    def start_strategy(self, strategy_id: str) -> bool:
        """启动策略"""
        strategy = self.strategies.get(strategy_id)
        if strategy:
            strategy.start()
            return True
        return False
    
    def stop_strategy(self, strategy_id: str) -> bool:
        """停止策略"""
        strategy = self.strategies.get(strategy_id)
        if strategy:
            strategy.stop()
            return True
        return False
    
    def remove_strategy(self, strategy_id: str) -> bool:
        """移除策略"""
        strategy = self.strategies.get(strategy_id)
        if strategy:
            strategy.stop()
            del self.strategies[strategy_id]
            return True
        return False
    
    def get_performance(self, strategy_id: str) -> Optional[Dict]:
        """获取策略表现"""
        strategy = self.strategies.get(strategy_id)
        if strategy:
            return strategy.get_performance()
        return None


bollinger_bands_manager = BollingerBandsManager()

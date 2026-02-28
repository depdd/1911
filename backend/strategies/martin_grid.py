"""
马丁双向网格策略
- 在价格上下方同时挂买单和卖单
- 当订单亏损时，按马丁倍数加仓
- 网格间隔固定，适合震荡行情
"""
import asyncio
import threading
import time
import MetaTrader5 as mt5
from datetime import datetime
from typing import Dict, List, Optional
from loguru import logger
from dataclasses import dataclass


@dataclass
class GridOrder:
    symbol: str
    order_type: str  # 'buy' or 'sell'
    price: float
    volume: float
    ticket: int = 0
    profit: float = 0.0
    level: int = 0  # 网格层级


class MartinGridStrategy:
    """马丁双向网格策略"""
    
    def __init__(self, parameters: Dict):
        self.name = "Martin_Grid"
        self.symbol = parameters.get('symbol', 'EURUSD')
        self.grid_spacing = parameters.get('grid_spacing', 50)  # 网格间距（点）
        self.base_volume = parameters.get('base_volume', 0.01)  # 基础手数
        self.martin_multiplier = parameters.get('martin_multiplier', 2.0)  # 马丁倍数
        self.max_levels = parameters.get('max_levels', 5)  # 最大层数
        self.take_profit_pips = parameters.get('take_profit_pips', 30)  # 止盈点数
        self.grid_count = parameters.get('grid_count', 3)  # 每侧网格数量
        
        self.is_running = False
        self.grid_orders: List[GridOrder] = []
        self.center_price = 0.0
        
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.total_profit = 0.0
        self.max_drawdown = 0.0
        
    def calculate_pip_value(self, symbol: str) -> float:
        """计算点值 - 支持外汇、黄金、BTC"""
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
    
    def get_current_price(self) -> Optional[float]:
        """获取当前价格"""
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            logger.error(f"无法获取 {self.symbol} 的价格")
            return None
        return (tick.bid + tick.ask) / 2
    
    def place_order(self, order_type: str, price: float, volume: float, level: int) -> Optional[int]:
        """下单"""
        try:
            tick = mt5.symbol_info_tick(self.symbol)
            if tick is None:
                logger.error(f"无法获取 {self.symbol} 的tick数据")
                return None
            
            pip_value = self.calculate_pip_value(self.symbol)
            min_distance = self.get_min_sl_distance(self.symbol)
            
            sl_distance = max(self.take_profit_pips * min_distance, self.take_profit_pips) * 2 * pip_value
            tp_distance = max(self.take_profit_pips * min_distance, self.take_profit_pips) * pip_value
            
            if order_type == 'buy':
                request = {
                    "action": mt5.TRADE_ACTION_PENDING,
                    "symbol": self.symbol,
                    "volume": volume,
                    "type": mt5.ORDER_TYPE_BUY_LIMIT,
                    "price": price,
                    "sl": price - sl_distance,
                    "tp": price + tp_distance,
                    "deviation": 20,
                    "magic": 888888,
                    "comment": f"MG_Buy_L{level}",
                    "type_time": mt5.ORDER_TIME_GTC,
                    "type_filling": mt5.ORDER_FILLING_IOC,
                }
            else:
                request = {
                    "action": mt5.TRADE_ACTION_PENDING,
                    "symbol": self.symbol,
                    "volume": volume,
                    "type": mt5.ORDER_TYPE_SELL_LIMIT,
                    "price": price,
                    "sl": price + sl_distance,
                    "tp": price - tp_distance,
                    "deviation": 20,
                    "magic": 888888,
                    "comment": f"MG_Sell_L{level}",
                    "type_time": mt5.ORDER_TIME_GTC,
                    "type_filling": mt5.ORDER_FILLING_IOC,
                }
            
            result = mt5.order_send(request)
            
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                logger.error(f"下单失败: {result.comment}")
                return None
            
            logger.info(f"下单成功: {order_type} {self.symbol} @ {price}, 手数: {volume}, 层级: {level}")
            return result.order
            
        except Exception as e:
            logger.error(f"下单异常: {e}")
            return None
    
    def initialize_grid(self):
        """初始化网格"""
        current_price = self.get_current_price()
        if current_price is None:
            return False
        
        self.center_price = current_price
        pip_value = self.calculate_pip_value(self.symbol)
        spacing = self.grid_spacing * pip_value
        
        logger.info(f"初始化网格，中心价格: {current_price}, 间距: {spacing}")
        
        self.grid_orders = []
        
        for i in range(1, self.grid_count + 1):
            buy_price = current_price - i * spacing
            sell_price = current_price + i * spacing
            
            volume = self.base_volume
            
            buy_ticket = self.place_order('buy', buy_price, volume, i)
            if buy_ticket:
                self.grid_orders.append(GridOrder(
                    symbol=self.symbol,
                    order_type='buy',
                    price=buy_price,
                    volume=volume,
                    ticket=buy_ticket,
                    level=i
                ))
            
            sell_ticket = self.place_order('sell', sell_price, volume, i)
            if sell_ticket:
                self.grid_orders.append(GridOrder(
                    symbol=self.symbol,
                    order_type='sell',
                    price=sell_price,
                    volume=volume,
                    ticket=sell_ticket,
                    level=i
                ))
        
        logger.info(f"网格初始化完成，共 {len(self.grid_orders)} 个订单")
        return True
    
    def check_and_replenish_grid(self):
        """检查并补充网格订单"""
        current_price = self.get_current_price()
        if current_price is None:
            return
        
        pip_value = self.calculate_pip_value(self.symbol)
        spacing = self.grid_spacing * pip_value
        
        for order in self.grid_orders[:]:
            if order.ticket == 0:
                continue
            
            position = mt5.positions_get(ticket=order.ticket)
            if position is None or len(position) == 0:
                order_info = mt5.orders_get(ticket=order.ticket)
                if order_info is None or len(order_info) == 0:
                    if order.order_type == 'buy':
                        new_price = current_price - order.level * spacing
                    else:
                        new_price = current_price + order.level * spacing
                    
                    volume = order.volume * self.martin_multiplier
                    
                    if order.level < self.max_levels:
                        new_ticket = self.place_order(order.order_type, new_price, volume, order.level + 1)
                        if new_ticket:
                            order.ticket = new_ticket
                            order.price = new_price
                            order.volume = volume
                            order.level += 1
                            logger.info(f"补充网格订单: {order.order_type} L{order.level}")
    
    def check_positions(self):
        """检查持仓并更新统计"""
        positions = mt5.positions_get(symbol=self.symbol)
        if positions is None:
            return
        
        for pos in positions:
            if pos.magic == 888888:
                if pos.profit > 0:
                    self.winning_trades += 1
                    self.total_profit += pos.profit
                else:
                    self.losing_trades += 1
                
                self.total_trades += 1
                
                close_request = {
                    "action": mt5.TRADE_ACTION_DEAL,
                    "symbol": pos.symbol,
                    "volume": pos.volume,
                    "type": mt5.ORDER_TYPE_SELL if pos.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY,
                    "position": pos.ticket,
                    "price": mt5.symbol_info_tick(pos.symbol).bid if pos.type == mt5.POSITION_TYPE_BUY else mt5.symbol_info_tick(pos.symbol).ask,
                    "deviation": 20,
                    "magic": 888888,
                    "comment": "MG_Close",
                    "type_time": mt5.ORDER_TIME_GTC,
                    "type_filling": mt5.ORDER_FILLING_IOC,
                }
                
                result = mt5.order_send(close_request)
                if result.retcode == mt5.TRADE_RETCODE_DONE:
                    logger.info(f"平仓成功: {pos.ticket}, 盈亏: {pos.profit}")
    
    def run_cycle(self):
        """运行一个周期"""
        if not self.is_running:
            return
        
        try:
            self.check_positions()
            self.check_and_replenish_grid()
            self._update_real_time_stats()
        except Exception as e:
            logger.error(f"策略运行周期异常: {e}")
    
    def _update_real_time_stats(self):
        """更新实时统计"""
        positions = mt5.positions_get(symbol=self.symbol)
        if positions is None:
            return
        
        current_profit = 0.0
        for pos in positions:
            if pos.magic == 888888:
                current_profit += pos.profit
        
        if current_profit < 0 and abs(current_profit) > self.max_drawdown:
            self.max_drawdown = abs(current_profit)
    
    def _run_loop(self):
        """策略运行循环"""
        logger.info(f"马丁网格策略运行循环启动: {self.symbol}")
        while self.is_running:
            try:
                self.run_cycle()
            except Exception as e:
                logger.error(f"策略运行循环异常: {e}")
            time.sleep(5)
        logger.info(f"马丁网格策略运行循环结束: {self.symbol}")
    
    def start(self):
        """启动策略"""
        if self.is_running:
            return
        
        self.is_running = True
        logger.info(f"马丁网格策略启动: {self.symbol}")
        
        if not mt5.symbol_select(self.symbol, True):
            logger.error(f"无法选择交易品种: {self.symbol}")
            return
        
        self.initialize_grid()
        
        self._run_thread = threading.Thread(target=self._run_loop, daemon=True)
        self._run_thread.start()
    
    def stop(self):
        """停止策略"""
        self.is_running = False
        logger.info(f"马丁网格策略停止: {self.symbol}")
        
        for order in self.grid_orders:
            if order.ticket > 0:
                cancel_request = {
                    "action": mt5.TRADE_ACTION_REMOVE,
                    "order": order.ticket,
                }
                mt5.order_send(cancel_request)
        
        self.grid_orders = []
    
    def get_performance(self) -> Dict:
        """获取策略表现"""
        positions = mt5.positions_get(symbol=self.symbol)
        active_positions = 0
        floating_profit = 0.0
        
        if positions:
            for pos in positions:
                if pos.magic == 888888:
                    active_positions += 1
                    floating_profit += pos.profit
        
        pending_orders = mt5.orders_get(symbol=self.symbol)
        pending_count = 0
        if pending_orders:
            for order in pending_orders:
                if order.magic == 888888:
                    pending_count += 1
        
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0,
            'total_profit': self.total_profit + floating_profit,
            'max_drawdown': self.max_drawdown,
            'current_position': f"{active_positions} positions, {pending_count} pending",
            'floating_profit': floating_profit,
            'active_positions': active_positions,
            'pending_orders': pending_count
        }


class MartinGridManager:
    """马丁网格策略管理器"""
    
    def __init__(self):
        self.strategies: Dict[str, MartinGridStrategy] = {}
    
    def create_strategy(self, strategy_id: str, parameters: Dict) -> MartinGridStrategy:
        """创建策略实例"""
        strategy = MartinGridStrategy(parameters)
        self.strategies[strategy_id] = strategy
        logger.info(f"创建马丁网格策略: {strategy_id}")
        return strategy
    
    def remove_strategy(self, strategy_id: str):
        """移除策略"""
        if strategy_id in self.strategies:
            strategy = self.strategies[strategy_id]
            strategy.stop()
            del self.strategies[strategy_id]
            logger.info(f"移除策略: {strategy_id}")
    
    def get_strategy(self, strategy_id: str) -> Optional[MartinGridStrategy]:
        """获取策略实例"""
        return self.strategies.get(strategy_id)
    
    def start_strategy(self, strategy_id: str):
        """启动策略"""
        if strategy_id in self.strategies:
            self.strategies[strategy_id].start()
    
    def stop_strategy(self, strategy_id: str):
        """停止策略"""
        if strategy_id in self.strategies:
            self.strategies[strategy_id].stop()
    
    def get_strategy_performance(self, strategy_id: str) -> Optional[Dict]:
        """获取策略表现"""
        if strategy_id in self.strategies:
            return self.strategies[strategy_id].get_performance()
        return None


martin_grid_manager = MartinGridManager()

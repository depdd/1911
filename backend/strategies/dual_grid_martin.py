"""
双向网格马丁格尔策略
- 在价格上下方同时开多单和空单
- 使用马丁格尔加仓方式
- 支持分批止盈和风控平仓
- 支持外汇、黄金、BTC等多种品种
"""
import MetaTrader5 as mt5
import pandas as pd
import time
import threading
from datetime import datetime
from typing import Optional, List, Dict
from loguru import logger
from dataclasses import dataclass
from strategies.strategy_logger import log_info, log_warning, log_error, log_trade


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


class DualGridMartinStrategy:
    """双向网格马丁格尔策略"""
    
    def __init__(self, parameters: Dict, strategy_id: str = None):
        self.name = "Dual_Grid_Martin"
        self.strategy_id = strategy_id or "unknown"
        self.symbol = parameters.get('symbol', 'EURUSD')
        self.timeframe = parameters.get('timeframe', 'M1')
        
        self.buy_magic = 888881
        self.sell_magic = 888882
        
        self.lot_sequence = parameters.get('lot_sequence', [
            0.03, 0.04, 0.05, 0.06, 0.07, 0.10, 0.13, 0.16, 0.21, 0.28,
            0.36, 0.47, 0.61, 0.79, 1.02, 1.33, 1.73, 2.25, 2.92, 3.80
        ])
        self.max_add_positions = len(self.lot_sequence)
        
        self.add_space = parameters.get('add_space', 100)
        self.take_profit = parameters.get('take_profit', 200)
        self.fixed_lot = parameters.get('fixed_lot', 0.02)
        self.use_auto_lot = parameters.get('use_auto_lot', False)
        self.auto_lot_percent = parameters.get('auto_lot_percent', 1.0)
        self.max_lot = parameters.get('max_lot', 100)
        
        self.allow_buy = parameters.get('allow_buy', True)
        self.allow_sell = parameters.get('allow_sell', True)
        
        self.tp_percent = parameters.get('tp_percent', 10)
        self.tp2_percent = parameters.get('tp2_percent', 5)
        
        self.use_entropy = parameters.get('use_entropy', False)
        self.entropy_value = parameters.get('entropy_value', 0)
        
        self.use_loss_close = parameters.get('use_loss_close', False)
        self.loss_amount = parameters.get('loss_amount', 600)
        self.use_profit_close = parameters.get('use_profit_close', False)
        self.profit_amount = parameters.get('profit_amount', 0)
        self.use_equity_close = parameters.get('use_equity_close', False)
        self.equity_level = parameters.get('equity_level', 1000)
        
        self.deviation = parameters.get('deviation', 10)
        
        self.is_running = False
        self.is_max_level_reached = False
        self.last_bar_time = None
        self.first_order_placed = False
        
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.total_profit = 0.0
        self.max_drawdown = 0.0
        
        self._thread = None
        self._stop_event = threading.Event()
        
        self._init_symbol_info()
    
    def _init_symbol_info(self):
        """初始化品种信息"""
        symbol_info = mt5.symbol_info(self.symbol)
        if symbol_info is not None:
            self.point = symbol_info.point
            self.trade_contract_size = symbol_info.trade_contract_size
            self.min_volume = symbol_info.volume_min
            self.volume_step = symbol_info.volume_step
            self.max_volume = symbol_info.volume_max
        else:
            self.point = 0.00001
            self.trade_contract_size = 100000
            self.min_volume = 0.01
            self.volume_step = 0.01
            self.max_volume = 100
    
    def get_pip_value(self, symbol: str) -> float:
        """获取点值 - 统一为1，用户输入的点数直接作为价格差"""
        return 1.0
    
    def get_min_sl_distance(self, symbol: str) -> float:
        """获取最小止损距离乘数 - 不再需要，返回1"""
        return 1
    
    def normalize_volume(self, volume: float) -> float:
        """规范化手数"""
        volume = round(volume / self.volume_step) * self.volume_step
        volume = max(self.min_volume, min(volume, self.max_volume))
        return round(volume, 2)
    
    def get_start_lot(self) -> float:
        """获取首单手数"""
        if self.use_auto_lot:
            account_info = mt5.account_info()
            if account_info:
                equity = account_info.equity
                lot = equity * self.auto_lot_percent / 10000.0
            else:
                lot = self.fixed_lot
        else:
            lot = self.fixed_lot
        lot = max(self.min_volume, min(lot, self.max_lot))
        return self.normalize_volume(lot)
    
    def get_lot_for_step(self, current_count: int) -> float:
        """获取加仓手数"""
        idx = min(current_count, len(self.lot_sequence) - 1)
        lot = self.lot_sequence[idx]
        lot = max(self.min_volume, min(lot, self.max_lot))
        return self.normalize_volume(lot)
    
    def get_dynamic_add_space(self) -> float:
        """获取动态加仓间距，支持熵值调整"""
        base_space = self.add_space
        if self.use_entropy and self.entropy_value > 0:
            return base_space + self.entropy_value
        return base_space
    
    def get_dynamic_take_profit(self) -> float:
        """获取动态止盈间距，支持熵值调整"""
        base_tp = self.take_profit
        if self.use_entropy and self.entropy_value > 0:
            return base_tp + self.entropy_value
        return base_tp
    
    def get_positions(self, magic: int = None) -> List:
        """获取持仓"""
        positions = mt5.positions_get(symbol=self.symbol)
        if positions is None:
            return []
        result = []
        for pos in positions:
            if magic and pos.magic != magic:
                continue
            result.append(pos)
        return result
    
    def calculate_average_price(self, positions: List) -> Optional[float]:
        """计算持仓均价"""
        if not positions:
            return None
        total_value = sum(p.price_open * p.volume for p in positions)
        total_volume = sum(p.volume for p in positions)
        return total_value / total_volume if total_volume > 0 else None
    
    def find_last_position(self, positions: List):
        """找到最后开仓的订单"""
        if not positions:
            return None
        return max(positions, key=lambda p: p.ticket)
    
    def check_new_bar(self) -> bool:
        """检测新K线"""
        current_time = datetime.now()
        if self.timeframe == 'M1':
            bar_key = current_time.replace(second=0, microsecond=0)
        elif self.timeframe == 'M5':
            minute = current_time.minute // 5 * 5
            bar_key = current_time.replace(minute=minute, second=0, microsecond=0)
        elif self.timeframe == 'M15':
            minute = current_time.minute // 15 * 15
            bar_key = current_time.replace(minute=minute, second=0, microsecond=0)
        elif self.timeframe == 'H1':
            bar_key = current_time.replace(minute=0, second=0, microsecond=0)
        else:
            bar_key = current_time.replace(second=0, microsecond=0)
        
        if self.last_bar_time is None or bar_key > self.last_bar_time:
            self.last_bar_time = bar_key
            return True
        return False
    
    def send_market_order(self, order_type: int, volume: float, magic: int, comment: str = "") -> bool:
        """发送市价单"""
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            logger.error("获取报价失败")
            log_error(self.strategy_id, "获取报价失败")
            return False
        
        price = tick.ask if order_type == mt5.ORDER_TYPE_BUY else tick.bid
        order_type_name = "BUY" if order_type == mt5.ORDER_TYPE_BUY else "SELL"
        
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": self.symbol,
            "volume": volume,
            "type": order_type,
            "price": price,
            "deviation": self.deviation,
            "magic": magic,
            "comment": comment,
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request)
        if result is None:
            error_code = mt5.last_error()
            logger.error(f"订单发送失败: MT5返回None, 错误码: {error_code}")
            log_error(self.strategy_id, f"订单发送失败: MT5未返回结果", {
                'order_type': order_type_name,
                'volume': volume,
                'price': price,
                'error': f"MT5错误码: {error_code}"
            })
            return False
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"订单发送失败: {result.comment}")
            log_error(self.strategy_id, f"订单发送失败: {result.comment}", {
                'order_type': order_type_name,
                'volume': volume,
                'price': price,
                'error': result.comment,
                'retcode': result.retcode
            })
            return False
        
        logger.info(f"订单成功: {comment} {volume}手 @ {price}")
        log_trade(self.strategy_id, f"开仓成功: {order_type_name} {volume}手 @ {price}", {
            'order_type': order_type_name,
            'volume': volume,
            'price': price,
            'comment': comment
        })
        self.total_trades += 1
        return True
    
    def close_position(self, position) -> bool:
        """平仓"""
        tick = mt5.symbol_info_tick(position.symbol)
        if tick is None:
            log_error(self.strategy_id, f"平仓失败: 无法获取报价")
            return False
        
        order_type = mt5.ORDER_TYPE_SELL if position.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
        price = tick.bid if position.type == mt5.POSITION_TYPE_BUY else tick.ask
        pos_type = "BUY" if position.type == mt5.POSITION_TYPE_BUY else "SELL"
        
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": position.symbol,
            "volume": position.volume,
            "type": order_type,
            "position": position.ticket,
            "price": price,
            "deviation": self.deviation,
            "magic": position.magic,
            "comment": "close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request)
        if result is None:
            error_code = mt5.last_error()
            logger.error(f"平仓失败: MT5返回None, 错误码: {error_code}")
            log_error(self.strategy_id, f"平仓失败: MT5未返回结果", {
                'ticket': position.ticket,
                'type': pos_type,
                'volume': position.volume,
                'error': f"MT5错误码: {error_code}"
            })
            return False
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"平仓失败: {result.comment}")
            log_error(self.strategy_id, f"平仓失败: {result.comment}", {
                'ticket': position.ticket,
                'type': pos_type,
                'volume': position.volume,
                'error': result.comment,
                'retcode': result.retcode
            })
            return False
        
        logger.info(f"平仓成功: {position.ticket}")
        log_trade(self.strategy_id, f"平仓成功: {pos_type} {position.volume}手", {
            'ticket': position.ticket,
            'type': pos_type,
            'volume': position.volume,
            'profit': position.profit
        })
        return True
    
    def check_take_profit(self, bid: float, ask: float):
        """检查整体止盈"""
        tp_distance = self.get_dynamic_take_profit()
        
        buy_positions = self.get_positions(self.buy_magic)
        if buy_positions:
            avg_price = self.calculate_average_price(buy_positions)
            if avg_price and bid >= avg_price + tp_distance:
                for pos in buy_positions:
                    self.close_position(pos)
                logger.info(f"多单整体止盈，平仓 {len(buy_positions)} 单")
        
        sell_positions = self.get_positions(self.sell_magic)
        if sell_positions:
            avg_price = self.calculate_average_price(sell_positions)
            if avg_price and ask <= avg_price - tp_distance:
                for pos in sell_positions:
                    self.close_position(pos)
                logger.info(f"空单整体止盈，平仓 {len(sell_positions)} 单")
    
    def check_overlapping(self, bid: float, ask: float):
        """分批止盈"""
        buy_positions = self.get_positions(self.buy_magic)
        if len(buy_positions) >= 2:
            self._process_overlapping(buy_positions, bid, True)
        
        sell_positions = self.get_positions(self.sell_magic)
        if len(sell_positions) >= 2:
            self._process_overlapping(sell_positions, ask, False)
    
    def _process_overlapping(self, positions: List, price: float, is_buy: bool):
        """处理分批止盈"""
        profits = []
        for pos in positions:
            if is_buy:
                profit = (price - pos.price_open) * pos.volume * self.trade_contract_size
            else:
                profit = (pos.price_open - price) * pos.volume * self.trade_contract_size
            profits.append((pos, profit))
        
        pos_profits = [(p, pf) for p, pf in profits if pf > 0]
        if not pos_profits:
            return
        pos_profits.sort(key=lambda x: x[1], reverse=True)
        Lpos, Lprofit = pos_profits[0]
        Lpos1, Lprofit1 = (pos_profits[1] if len(pos_profits) > 1 else (None, 0))
        
        neg_profits = [(p, pf) for p, pf in profits if pf < 0]
        if not neg_profits:
            return
        neg_profits.sort(key=lambda x: x[1])
        Cpos, Cprofit = neg_profits[0]
        
        tp_percent = self.tp_percent / 100.0
        tp2_percent = self.tp2_percent / 100.0
        
        if Lpos1 is None:
            if Lprofit + Cprofit > 0 and (Lprofit + Cprofit) / Lprofit > tp_percent:
                orders_to_close = {Lpos.ticket, Cpos.ticket}
                for pos in positions:
                    if pos.ticket in orders_to_close:
                        self.close_position(pos)
                logger.info(f"分批止盈类型1平仓 {len(orders_to_close)} 单")
        else:
            if Lprofit + Lprofit1 + Cprofit > 0 and (Lprofit + Lprofit1 + Cprofit) / (Lprofit + Lprofit1) > tp2_percent:
                orders_to_close = {Lpos.ticket, Lpos1.ticket, Cpos.ticket}
                for pos in positions:
                    if pos.ticket in orders_to_close:
                        self.close_position(pos)
                logger.info(f"分批止盈类型2平仓 {len(orders_to_close)} 单")
    
    def check_risk_controls(self):
        """风控检查"""
        all_positions = self.get_positions()
        if not all_positions:
            return
        
        total_profit_val = sum(p.profit + getattr(p, 'swap', 0) + getattr(p, 'commission', 0) for p in all_positions)
        account_info = mt5.account_info()
        equity = account_info.equity if account_info else 0
        
        if self.use_loss_close and total_profit_val <= -self.loss_amount:
            for pos in all_positions:
                self.close_position(pos)
            logger.info(f"触发亏损平仓，总盈亏: {total_profit_val:.2f}")
        elif self.use_profit_close and total_profit_val >= self.profit_amount:
            for pos in all_positions:
                self.close_position(pos)
            logger.info(f"触发盈利平仓，总盈亏: {total_profit_val:.2f}")
        elif self.use_equity_close and equity <= self.equity_level:
            for pos in all_positions:
                self.close_position(pos)
            logger.info(f"触发净值低平仓，净值: {equity:.2f}")
    
    def update_performance_from_history(self):
        """从历史订单更新表现"""
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
                if deal.magic in [self.buy_magic, self.sell_magic]:
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
    
    def on_tick(self):
        """每个tick执行"""
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            return
        bid, ask = tick.bid, tick.ask
        
        if not self.first_order_placed:
            buy_positions = self.get_positions(self.buy_magic)
            if len(buy_positions) == 0 and self.allow_buy:
                lots = self.get_start_lot()
                comment = f"FirstBuy_{datetime.now().strftime('%H%M%S')}"
                if self.send_market_order(mt5.ORDER_TYPE_BUY, lots, self.buy_magic, comment):
                    logger.info(f"启动开多首单: {lots}手 @ {ask}")
            
            sell_positions = self.get_positions(self.sell_magic)
            if len(sell_positions) == 0 and self.allow_sell:
                lots = self.get_start_lot()
                comment = f"FirstSell_{datetime.now().strftime('%H%M%S')}"
                if self.send_market_order(mt5.ORDER_TYPE_SELL, lots, self.sell_magic, comment):
                    logger.info(f"启动开空首单: {lots}手 @ {bid}")
            
            self.first_order_placed = True
        
        if self.check_new_bar():
            buy_positions = self.get_positions(self.buy_magic)
            if len(buy_positions) == 0 and self.allow_buy:
                lots = self.get_start_lot()
                comment = f"NewBarBuy_{datetime.now().strftime('%H%M%S')}"
                self.send_market_order(mt5.ORDER_TYPE_BUY, lots, self.buy_magic, comment)
            
            sell_positions = self.get_positions(self.sell_magic)
            if len(sell_positions) == 0 and self.allow_sell:
                lots = self.get_start_lot()
                comment = f"NewBarSell_{datetime.now().strftime('%H%M%S')}"
                self.send_market_order(mt5.ORDER_TYPE_SELL, lots, self.sell_magic, comment)
        
        if not self.is_max_level_reached:
            step_distance = self.get_dynamic_add_space()
            
            buy_positions = self.get_positions(self.buy_magic)
            buy_count = len(buy_positions)
            if 0 < buy_count <= self.max_add_positions:
                last_buy = self.find_last_position(buy_positions)
                if last_buy and last_buy.price_open - ask >= step_distance:
                    lots = self.get_lot_for_step(buy_count)
                    comment = f"AddBuy_{buy_count+1}"
                    if self.send_market_order(mt5.ORDER_TYPE_BUY, lots, self.buy_magic, comment):
                        if buy_count + 1 >= self.max_add_positions:
                            self.is_max_level_reached = True
            
            sell_positions = self.get_positions(self.sell_magic)
            sell_count = len(sell_positions)
            if 0 < sell_count <= self.max_add_positions:
                last_sell = self.find_last_position(sell_positions)
                if last_sell and bid - last_sell.price_open >= step_distance:
                    lots = self.get_lot_for_step(sell_count)
                    comment = f"AddSell_{sell_count+1}"
                    if self.send_market_order(mt5.ORDER_TYPE_SELL, lots, self.sell_magic, comment):
                        if sell_count + 1 >= self.max_add_positions:
                            self.is_max_level_reached = True
        
        self.check_take_profit(bid, ask)
        self.check_overlapping(bid, ask)
        self.check_risk_controls()
        self.update_performance_from_history()
    
    def _run_loop(self):
        """策略主循环"""
        logger.info(f"双向网格策略 {self.symbol} 开始运行")
        log_info(self.strategy_id, f"策略启动", {
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'allow_buy': self.allow_buy,
            'allow_sell': self.allow_sell,
            'fixed_lot': self.fixed_lot,
            'add_space': self.add_space,
            'take_profit': self.take_profit
        })
        
        while not self._stop_event.is_set():
            try:
                self.on_tick()
            except Exception as e:
                logger.error(f"策略循环异常: {e}")
                log_error(self.strategy_id, f"策略循环异常: {e}")
            
            time.sleep(0.5)
        
        logger.info(f"双向网格策略 {self.symbol} 已停止")
        log_info(self.strategy_id, f"策略已停止")
    
    def start(self):
        """启动策略"""
        if self.is_running:
            return
        
        self.is_running = True
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info(f"双向网格策略 {self.symbol} 启动成功")
    
    def stop(self):
        """停止策略"""
        if not self.is_running:
            return
        
        self.is_running = False
        self._stop_event.set()
        
        if self._thread:
            self._thread.join(timeout=5)
        
        logger.info(f"双向网格策略 {self.symbol} 已停止")
        log_info(self.strategy_id, f"策略已停止")
    
    def get_performance(self) -> Dict:
        """获取策略表现"""
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        return {
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': round(win_rate, 2),
            'total_profit': round(self.total_profit, 2),
            'max_drawdown': round(self.max_drawdown, 2)
        }


class DualGridMartinManager:
    """双向网格策略管理器"""
    
    def __init__(self):
        self.strategies: Dict[str, DualGridMartinStrategy] = {}
    
    def create_strategy(self, strategy_id: str, parameters: Dict) -> DualGridMartinStrategy:
        """创建策略实例"""
        strategy = DualGridMartinStrategy(parameters, strategy_id)
        self.strategies[strategy_id] = strategy
        log_info(strategy_id, f"策略实例已创建")
        return strategy
    
    def get_strategy(self, strategy_id: str) -> Optional[DualGridMartinStrategy]:
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


dual_grid_martin_manager = DualGridMartinManager()

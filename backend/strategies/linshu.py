"""
MT4双向网格马丁策略 - Python版本
一比一复制自716工作.mq4
"""
import MetaTrader5 as mt5
import pandas as pd
import numpy as np
import time
import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

from strategies.strategy_logger import (
    strategy_logger, 
    log_info, 
    log_warning, 
    log_error, 
    log_trade
)

class LinShuStrategy:
    """
    双向网格马丁策略
    完全复制MT4策略逻辑
    """
    
    def __init__(self, params: dict, strategy_id: str = None):
        self.params = params
        self.strategy_id = strategy_id or "linshu"
        
        self.symbol = params.get('symbol', 'EURUSD')
        self.buy_magic = params.get('buy_magic', 888)
        self.sell_magic = params.get('sell_magic', 666)
        
        self.vDigits = 0
        self.vPoint = 0
        self.Spread = 0
        
        self.show_chart_info = params.get('show_chart_info', True)
        self.show_chart_time = params.get('show_chart_time', True)
        self.show_avg_price_line = params.get('show_avg_price_line', True)
        self.allow_trade = params.get('allow_trade', True)
        self.allow_buy = params.get('allow_buy', True)
        self.allow_sell = params.get('allow_sell', True)
        
        self.new_bar_filter = params.get('new_bar_filter', True)
        self.max_orders = params.get('max_orders', 100)
        self.add_space = params.get('add_space', 100)
        self.take_profit = params.get('take_profit', 200)
        
        self.tp_percent = params.get('tp_percent', 10)
        self.tp2_percent = params.get('tp2_percent', 5)
        
        self.fixed_lot = params.get('fixed_lot', 0.02)
        self.max_add_count = params.get('max_add_count', 25)
        
        self.lot_sequence = params.get('lot_sequence', [
            0.03, 0.04, 0.05, 0.06, 0.07, 0.10, 0.13, 0.16, 0.21, 0.28,
            0.36, 0.47, 0.61, 0.79, 1.02, 1.33, 1.73, 2.25, 2.92, 3.80,
            4.94, 6.45, 7.96, 9.93, 11.85
        ])
        
        self.add_multiplier = params.get('add_multiplier', 0.001)
        self.lot_increment = params.get('lot_increment', 0.1)
        self.max_lot = params.get('max_lot', 100)
        
        self.use_auto_lot = params.get('use_auto_lot', False)
        self.auto_lot_percent = params.get('auto_lot_percent', 1)
        
        self.use_profit_close = params.get('use_profit_close', False)
        self.profit_amount = params.get('profit_amount', 0)
        
        self.use_loss_close = params.get('use_loss_close', False)
        self.loss_amount = params.get('loss_amount', 600)
        
        self.use_equity_close = params.get('use_equity_close', False)
        self.equity_level = params.get('equity_level', 1000)
        self.equity_close_platform = params.get('equity_close_platform', False)
        
        self.deviation = params.get('deviation', 3)
        self.continue_after_close = params.get('continue_after_close', True)
        
        self.order_comment = params.get('order_comment', 'linshu')
        
        self.use_entropy_step = params.get('use_entropy_step', True)
        self.ent_vol_win = params.get('ent_vol_win', 17)
        self.ent_seq_len = params.get('ent_seq_len', 60)
        self.ent_z = params.get('ent_z', 1.5)
        self.ent_max_mult = params.get('ent_max_mult', 3.0)
        
        self.is_max_level_reached = False
        self.already_added_level = -1
        self.last_bar_time = None
        
        self.TimePrev = 0
        
        self.total_buy_orders = 0
        self.total_sell_orders = 0
        
        self.Lpos = 0
        self.Lpos1 = 0
        self.Cpos = 0
        
        self.Lprofit = 0.0
        self.Lprofit1 = 0.0
        self.Cprofit = 0.0
        
        self.PriceTarget = 0.0
        self.AveragePrice = 0.0
        self.LastBuyPrice = 0.0
        self.LastSellPrice = 0.0
        
        self.BuySummLot = 0.0
        self.SellSummLot = 0.0
        self.TotalProfitBuy = 0.0
        self.TotalProfitSell = 0.0
        
        self.BLot = 0.0
        self.SLot = 0.0
        
        self.LastOrderComment = ""
        
        self.min_volume = 0.01
        self.volume_step = 0.01
        self.max_volume = 100
        
        self.entropy_history = []
        
        self._running = False
        self._thread = None
        
        self.total_trades = 0
        self.win_trades = 0
        self.total_profit = 0.0
        
        self._initialize()
    
    def _initialize(self) -> bool:
        """初始化策略"""
        symbol_info = mt5.symbol_info(self.symbol)
        if symbol_info is None:
            logger.error(f"无法获取品种信息: {self.symbol}")
            log_error(self.strategy_id, f"无法获取品种信息: {self.symbol}")
            return False
        
        self.vPoint = symbol_info.point
        self.vDigits = symbol_info.digits
        
        tick = mt5.symbol_info_tick(self.symbol)
        if tick:
            self.Spread = (tick.ask - tick.bid) / self.vPoint
        
        self.min_volume = symbol_info.volume_min
        self.volume_step = symbol_info.volume_step
        self.max_volume = symbol_info.volume_max
        
        logger.info(f"策略初始化完成: {self.symbol}, 点值={self.vPoint}, 位数={self.vDigits}")
        log_info(self.strategy_id, f"策略初始化完成", {
            'symbol': self.symbol,
            'point': self.vPoint,
            'digits': self.vDigits,
            'add_space': self.add_space,
            'take_profit': self.take_profit
        })
        return True
    
    def normalize_price(self, price: float) -> float:
        """规范化价格"""
        return round(price, self.vDigits)
    
    def normalize_volume(self, volume: float) -> float:
        """规范化手数"""
        volume = round(volume / self.volume_step) * self.volume_step
        volume = max(self.min_volume, min(volume, self.max_volume))
        return round(volume, 2)
    
    def get_positions(self, magic: int = None) -> List:
        """获取持仓"""
        positions = mt5.positions_get(symbol=self.symbol)
        if positions is None:
            return []
        
        result = []
        for pos in positions:
            if magic is None or pos.magic == magic:
                result.append(pos)
        return result
    
    def count_of_orders(self, magic_number: int) -> int:
        """统计订单数量"""
        positions = self.get_positions(magic_number)
        return len(positions)
    
    def calculate_average_price(self, magic_number: int) -> float:
        """计算平均价格"""
        positions = self.get_positions(magic_number)
        if not positions:
            return 0.0
        
        total_value = 0.0
        total_lots = 0.0
        
        for pos in positions:
            total_value += pos.price_open * pos.volume
            total_lots += pos.volume
        
        if total_lots > 0:
            return self.normalize_price(total_value / total_lots)
        return 0.0
    
    def find_first_order_parameter(self, magic_number: int, param_name: str):
        """找到最早开仓的订单参数"""
        positions = self.get_positions(magic_number)
        if not positions:
            return 0
        
        first_pos = min(positions, key=lambda p: p.ticket)
        
        if param_name == "price":
            return first_pos.price_open
        elif param_name == "ticket":
            return first_pos.ticket
        elif param_name == "lot":
            return first_pos.volume
        elif param_name == "profit":
            return first_pos.profit + getattr(first_pos, 'swap', 0) + getattr(first_pos, 'commission', 0)
        
        return 0
    
    def find_last_order_parameter(self, magic_number: int, param_name: str):
        """找到最后开仓的订单参数"""
        positions = self.get_positions(magic_number)
        if not positions:
            return 0
        
        last_pos = max(positions, key=lambda p: p.ticket)
        self.LastOrderComment = last_pos.comment if last_pos.comment else ""
        
        if param_name == "price":
            return last_pos.price_open
        elif param_name == "ticket":
            return last_pos.ticket
        elif param_name == "lot":
            return last_pos.volume
        elif param_name == "profit":
            return last_pos.profit + getattr(last_pos, 'swap', 0) + getattr(last_pos, 'commission', 0)
        
        return 0
    
    def get_start_lot(self) -> float:
        """获取首单手数"""
        first_lot = 0.0
        
        if self.use_auto_lot:
            account_info = mt5.account_info()
            if account_info:
                first_lot = round(account_info.equity * self.auto_lot_percent / 10000, 2)
        else:
            first_lot = self.fixed_lot
        
        first_lot = min(first_lot, self.max_lot)
        first_lot = max(first_lot, self.fixed_lot)
        
        return self.normalize_volume(first_lot)
    
    def get_lot_for_step(self, magic_number: int, ord_count: int) -> float:
        """根据层级获取手数"""
        idx = min(ord_count, len(self.lot_sequence) - 1)
        target_lot = self.lot_sequence[idx]
        return self.normalize_volume(target_lot)
    
    def sample_entropy(self, x: np.ndarray, n: int, m: int, r: float) -> float:
        """计算样本熵"""
        C1 = 0
        C2 = 0
        
        for i in range(n - m):
            for j in range(i + 1, n - m):
                match = True
                for k in range(m):
                    if abs(x[i + k] - x[j + k]) > r:
                        match = False
                        break
                
                if not match:
                    continue
                
                C1 += 1
                match = True
                for k1 in range(m + 1):
                    if abs(x[i + k1] - x[j + k1]) > r:
                        match = False
                        break
                
                if match:
                    C2 += 1
        
        if C1 == 0 or C2 == 0:
            return 1.0
        
        return -math.log(C2 / C1)
    
    def entropy_current(self) -> float:
        """计算当前熵值"""
        vol = []
        for i in range(60):
            rates = mt5.copy_rates_from_pos(self.symbol, mt5.TIMEFRAME_M1, i, 1)
            if rates is not None and len(rates) > 0:
                close_prices = mt5.copy_rates_from_pos(self.symbol, mt5.TIMEFRAME_M1, i, 26)
                if close_prices is not None and len(close_prices) >= 25:
                    closes = np.array([r['close'] for r in close_prices])
                    sma = np.mean(closes[-25:])
                    std = np.std(closes[-25:])
                    vol.append(std)
        
        if len(vol) < 60:
            return 1.0
        
        vol_array = np.array(vol)
        return self.sample_entropy(vol_array, 60, 2, 0.2)
    
    def get_pipstep_for_step(self, curr_step: int) -> float:
        """获取动态加仓间距"""
        if not self.use_entropy_step:
            return self.add_space
        
        ent = self.entropy_current()
        
        self.entropy_history.append(ent)
        if len(self.entropy_history) > 120:
            self.entropy_history = self.entropy_history[-120:]
        
        if len(self.entropy_history) < 120:
            return self.add_space
        
        hist = np.array(self.entropy_history[-120:])
        mean = np.mean(hist)
        stdev = np.std(hist)
        
        if stdev < 1e-8:
            stdev = 1e-8
        
        ratio = (ent - mean) / stdev
        mult = 1.0 + max(ratio, 0)
        mult = min(mult, self.ent_max_mult)
        
        return self.add_space * mult
    
    def send_market_order(self, order_type: int, lots: float, tp: int, sl: int, magic: int, comment: str = "") -> int:
        """发送市价单"""
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            logger.error("获取报价失败")
            log_error(self.strategy_id, "获取报价失败")
            return 0
        
        order_type_name = "BUY" if order_type == mt5.ORDER_TYPE_BUY else "SELL"
        
        if order_type == mt5.ORDER_TYPE_BUY:
            price = tick.ask
            take = self.normalize_price(price + tp) if tp > 0 else None
            stop = self.normalize_price(price - sl) if sl > 0 else None
        else:
            price = tick.bid
            take = self.normalize_price(price - tp) if tp > 0 else None
            stop = self.normalize_price(price + sl) if sl > 0 else None
        
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": self.symbol,
            "volume": lots,
            "type": order_type,
            "price": price,
            "deviation": self.deviation * 10,
            "magic": magic,
            "comment": comment,
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        if take is not None:
            request["tp"] = take
        if stop is not None:
            request["sl"] = stop
        
        result = mt5.order_send(request)
        if result is None:
            error_code = mt5.last_error()
            logger.error(f"订单发送失败: MT5返回None, 错误码: {error_code}")
            log_error(self.strategy_id, f"订单发送失败: MT5返回None", {
                'order_type': order_type_name,
                'volume': lots,
                'price': price,
                'error': f"MT5错误码: {error_code}"
            })
            return 0
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"订单发送失败: {result.comment}")
            log_error(self.strategy_id, f"订单发送失败: {result.comment}", {
                'order_type': order_type_name,
                'volume': lots,
                'price': price,
                'error': result.comment
            })
            return 0
        
        logger.info(f"订单成功: {result.order}, 价格: {price}")
        log_trade(self.strategy_id, f"开{order_type_name}单成功", {
            'ticket': result.order,
            'order_type': order_type_name,
            'volume': lots,
            'price': price,
            'tp': take,
            'sl': stop,
            'magic': magic
        })
        
        if order_type == mt5.ORDER_TYPE_BUY:
            self.total_buy_orders += 1
        else:
            self.total_sell_orders += 1
        
        return result.order
    
    def modify_take_profit(self, position, take_profit: float) -> bool:
        """修改止盈"""
        request = {
            "action": mt5.TRADE_ACTION_SLTP,
            "position": position.ticket,
            "sl": position.sl,
            "tp": self.normalize_price(take_profit),
            "symbol": self.symbol,
        }
        
        result = mt5.order_send(request)
        if result is None:
            return False
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"修改止盈失败: {result.comment}")
            return False
        
        return True
    
    def close_position(self, position) -> bool:
        """平仓"""
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            log_error(self.strategy_id, "平仓失败: 获取报价失败")
            return False
        
        pos_type = "BUY" if position.type == mt5.POSITION_TYPE_BUY else "SELL"
        
        if position.type == mt5.POSITION_TYPE_BUY:
            order_type = mt5.ORDER_TYPE_SELL
            price = tick.bid
        else:
            order_type = mt5.ORDER_TYPE_BUY
            price = tick.ask
        
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": self.symbol,
            "volume": position.volume,
            "type": order_type,
            "position": position.ticket,
            "price": price,
            "deviation": self.deviation * 10,
            "magic": position.magic,
            "comment": "close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request)
        if result is None:
            error_code = mt5.last_error()
            log_error(self.strategy_id, f"平仓失败: MT5返回None", {
                'ticket': position.ticket,
                'error': f"MT5错误码: {error_code}"
            })
            return False
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"平仓失败: {result.comment}")
            log_error(self.strategy_id, f"平仓失败: {result.comment}", {
                'ticket': position.ticket,
                'error': result.comment
            })
            return False
        
        logger.info(f"平仓成功: {position.ticket}")
        log_trade(self.strategy_id, f"平{pos_type}仓成功", {
            'ticket': position.ticket,
            'volume': position.volume,
            'price': price,
            'profit': position.profit
        })
        return True
    
    def check_take_profit(self):
        """检查整体止盈 - 基于第一单价格"""
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            return
        
        bid, ask = tick.bid, tick.ask
        
        self.total_buy_orders = self.count_of_orders(self.buy_magic)
        
        self.PriceTarget = 0
        self.AveragePrice = 0
        
        if self.total_buy_orders > 0:
            self.PriceTarget = self.find_first_order_parameter(self.buy_magic, "price") + self.take_profit
            self.AveragePrice = self.calculate_average_price(self.buy_magic)
        
        buy_positions = self.get_positions(self.buy_magic)
        for pos in buy_positions:
            current_tp = pos.tp
            if abs(current_tp - self.PriceTarget) > self.vPoint:
                self.modify_take_profit(pos, self.PriceTarget)
        
        if self.total_buy_orders > 0 and self.AveragePrice > 0:
            if bid >= self.PriceTarget:
                for pos in buy_positions:
                    self.close_position(pos)
                logger.info(f"多单整体止盈，平仓 {len(buy_positions)} 单")
                log_trade(self.strategy_id, f"多单整体止盈", {
                    'count': len(buy_positions),
                    'avg_price': self.AveragePrice,
                    'target_price': self.PriceTarget,
                    'current_bid': bid
                })
        
        self.PriceTarget = 0
        self.AveragePrice = 0
        self.total_sell_orders = self.count_of_orders(self.sell_magic)
        
        if self.total_sell_orders > 0:
            self.PriceTarget = self.find_first_order_parameter(self.sell_magic, "price") - self.take_profit
            self.AveragePrice = self.calculate_average_price(self.sell_magic)
        
        sell_positions = self.get_positions(self.sell_magic)
        for pos in sell_positions:
            current_tp = pos.tp
            if abs(current_tp - self.PriceTarget) > self.vPoint:
                self.modify_take_profit(pos, self.PriceTarget)
        
        if self.total_sell_orders > 0 and self.AveragePrice > 0:
            if ask <= self.PriceTarget:
                for pos in sell_positions:
                    self.close_position(pos)
                logger.info(f"空单整体止盈，平仓 {len(sell_positions)} 单")
                log_trade(self.strategy_id, f"空单整体止盈", {
                    'count': len(sell_positions),
                    'avg_price': self.AveragePrice,
                    'target_price': self.PriceTarget,
                    'current_ask': ask
                })
    
    def liding_profit_order(self, magic_number: int) -> int:
        """找到最盈利的订单"""
        self.Lprofit1 = 0
        self.Lpos1 = 0
        
        positions = self.get_positions(magic_number)
        
        for pos in positions:
            profit = pos.profit + getattr(pos, 'swap', 0) + getattr(pos, 'commission', 0)
            
            if profit > 0 and profit > self.Lprofit:
                self.Lprofit1 = self.Lprofit
                self.Lpos1 = self.Lpos
                
                self.Lprofit = profit
                self.Lpos = pos.ticket
        
        return self.Lpos
    
    def close_profit_order(self, magic_number: int) -> int:
        """找到最亏损的订单"""
        self.Cprofit = 0
        self.Cpos = 0
        
        positions = self.get_positions(magic_number)
        
        for pos in positions:
            profit = pos.profit + getattr(pos, 'swap', 0) + getattr(pos, 'commission', 0)
            
            if profit < 0 and profit < self.Cprofit:
                self.Cprofit = profit
                self.Cpos = pos.ticket
        
        return self.Cpos
    
    def close_select_order(self, magic_number: int):
        """分批平仓"""
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            return
        
        bid, ask = tick.bid, tick.ask
        
        positions = self.get_positions(magic_number)
        pos_dict = {p.ticket: p for p in positions}
        
        if self.Lpos in pos_dict:
            pos = pos_dict[self.Lpos]
            self.close_position(pos)
        
        if self.Lpos1 != 0 and self.Lpos1 in pos_dict:
            pos = pos_dict[self.Lpos1]
            self.close_position(pos)
        
        if self.Cpos in pos_dict:
            pos = pos_dict[self.Cpos]
            self.close_position(pos)
    
    def check_overlapping(self):
        """分批止盈检查"""
        self.total_buy_orders = self.count_of_orders(self.buy_magic)
        
        if self.total_buy_orders >= 2:
            self.Lpos = 0
            self.Cpos = 0
            self.Lprofit = 0
            self.Lprofit1 = 0
            
            self.Lpos = self.liding_profit_order(self.buy_magic)
            self.Cpos = self.close_profit_order(self.buy_magic)
            
            if self.Lprofit > 0 and self.Lprofit1 <= 0:
                if self.Lprofit + self.Cprofit > 0 and (self.Lprofit + self.Cprofit) * 100 / self.Lprofit > self.tp_percent:
                    self.Lpos1 = 0
                    self.close_select_order(self.buy_magic)
            elif self.Lprofit > 0 and self.Lprofit1 > 0:
                if self.Lprofit + self.Lprofit1 + self.Cprofit > 0 and (self.Lprofit + self.Lprofit1 + self.Cprofit) * 100 / (self.Lprofit + self.Lprofit1) > self.tp2_percent:
                    self.close_select_order(self.buy_magic)
        
        self.total_sell_orders = self.count_of_orders(self.sell_magic)
        
        if self.total_sell_orders >= 2:
            self.Lpos = 0
            self.Cpos = 0
            self.Lprofit = 0
            self.Lprofit1 = 0
            
            self.Lpos = self.liding_profit_order(self.sell_magic)
            self.Cpos = self.close_profit_order(self.sell_magic)
            
            if self.Lprofit > 0 and self.Lprofit1 <= 0:
                if self.Lprofit + self.Cprofit > 0 and (self.Lprofit + self.Cprofit) * 100 / self.Lprofit > self.tp_percent:
                    self.Lpos1 = 0
                    self.close_select_order(self.sell_magic)
            
            if self.Lprofit > 0 and self.Lprofit1 > 0:
                if self.Lprofit + self.Lprofit1 + self.Cprofit > 0 and (self.Lprofit + self.Lprofit1 + self.Cprofit) * 100 / (self.Lprofit + self.Lprofit1) > self.tp2_percent:
                    self.close_select_order(self.sell_magic)
    
    def draw_info(self):
        """更新统计信息"""
        self.BuySummLot = 0
        self.TotalProfitBuy = 0
        
        buy_positions = self.get_positions(self.buy_magic)
        for pos in buy_positions:
            self.BuySummLot += pos.volume
            self.TotalProfitBuy += pos.profit + getattr(pos, 'swap', 0) + getattr(pos, 'commission', 0)
        
        self.SellSummLot = 0
        self.TotalProfitSell = 0
        
        sell_positions = self.get_positions(self.sell_magic)
        for pos in sell_positions:
            self.SellSummLot += pos.volume
            self.TotalProfitSell += pos.profit + getattr(pos, 'swap', 0) + getattr(pos, 'commission', 0)
    
    def check_new_bar(self) -> bool:
        """检查新K线"""
        rates = mt5.copy_rates_from_pos(self.symbol, mt5.TIMEFRAME_M1, 0, 1)
        if rates is None or len(rates) == 0:
            return False
        
        current_bar_time = rates[0]['time']
        
        if self.TimePrev == 0:
            self.TimePrev = current_bar_time
            return True
        
        if current_bar_time > self.TimePrev:
            self.TimePrev = current_bar_time
            return True
        
        return False
    
    def check_risk_controls(self):
        """风控检查"""
        total_profit = self.TotalProfitBuy + self.TotalProfitSell
        
        if self.use_loss_close and total_profit <= -self.loss_amount:
            all_positions = self.get_positions()
            for pos in all_positions:
                self.close_position(pos)
            logger.info("持仓浮亏达到设定的亏损额全部平仓")
            log_warning(self.strategy_id, "风控触发: 亏损平仓", {
                'total_profit': total_profit,
                'loss_amount': self.loss_amount,
                'positions_closed': len(all_positions)
            })
        
        if self.use_profit_close and total_profit >= self.profit_amount:
            all_positions = self.get_positions()
            for pos in all_positions:
                self.close_position(pos)
            logger.info("持仓浮盈达到设定的获利额全部平仓")
            log_trade(self.strategy_id, "风控触发: 获利平仓", {
                'total_profit': total_profit,
                'profit_amount': self.profit_amount,
                'positions_closed': len(all_positions)
            })
        
        if self.use_equity_close:
            account_info = mt5.account_info()
            if account_info and account_info.equity <= self.equity_level:
                all_positions = self.get_positions()
                for pos in all_positions:
                    self.close_position(pos)
                logger.info("持仓净值金额达到设定金额以下全部平仓")
                log_warning(self.strategy_id, "风控触发: 净值平仓", {
                    'equity': account_info.equity,
                    'equity_level': self.equity_level,
                    'positions_closed': len(all_positions)
                })
    
    def on_tick(self):
        """每个tick执行"""
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            log_error(self.strategy_id, "获取报价失败")
            return
        
        bid, ask = tick.bid, tick.ask
        
        self.draw_info()
        
        self.check_overlapping()
        
        self.total_buy_orders = self.count_of_orders(self.buy_magic)
        if self.total_buy_orders > 0 and self.total_buy_orders < self.max_orders and not self.is_max_level_reached:
            self.LastBuyPrice = self.find_last_order_parameter(self.buy_magic, "price")
            
            pipstep = self.get_pipstep_for_step(self.total_buy_orders + 1)
            step_distance = pipstep
            
            if self.LastBuyPrice - ask >= step_distance:
                self.BLot = self.get_lot_for_step(self.buy_magic, self.total_buy_orders)
                comment = self.order_comment + "_" + str(int(time.time()))
                
                log_info(self.strategy_id, f"多单加仓触发", {
                    'last_price': self.LastBuyPrice,
                    'current_ask': ask,
                    'step_distance': step_distance,
                    'lot': self.BLot,
                    'level': self.total_buy_orders + 1
                })
                
                ticket = self.send_market_order(mt5.ORDER_TYPE_BUY, self.BLot, 0, 0, self.buy_magic, comment)
                
                if ticket > 0:
                    if self.total_buy_orders + 1 >= self.max_add_count:
                        self.is_max_level_reached = True
                        logger.info("已达到最大加仓层级，停止加仓。")
                        log_warning(self.strategy_id, "已达到最大加仓层级，停止加仓")
        
        self.total_sell_orders = self.count_of_orders(self.sell_magic)
        if self.total_sell_orders > 0 and self.total_sell_orders < self.max_orders and not self.is_max_level_reached:
            self.LastSellPrice = self.find_last_order_parameter(self.sell_magic, "price")
            
            pipstep = self.get_pipstep_for_step(self.total_sell_orders + 1)
            step_distance = pipstep
            
            if bid - self.LastSellPrice >= step_distance:
                self.SLot = self.get_lot_for_step(self.sell_magic, self.total_sell_orders)
                comment = self.order_comment + "_" + str(int(time.time()))
                
                log_info(self.strategy_id, f"空单加仓触发", {
                    'last_price': self.LastSellPrice,
                    'current_bid': bid,
                    'step_distance': step_distance,
                    'lot': self.SLot,
                    'level': self.total_sell_orders + 1
                })
                
                ticket = self.send_market_order(mt5.ORDER_TYPE_SELL, self.SLot, 0, 0, self.sell_magic, comment)
                
                if ticket > 0:
                    if self.total_sell_orders + 1 >= self.max_add_count:
                        self.is_max_level_reached = True
                        logger.info("已达到最大加仓层级，停止加仓。")
                        log_warning(self.strategy_id, "已达到最大加仓层级，停止加仓")
        
        self.check_take_profit()
        
        if self.new_bar_filter:
            if not self.check_new_bar():
                return
        
        if self.total_buy_orders == 0 and self.allow_buy and (self.allow_trade or self.total_sell_orders == 0):
            lots = self.get_start_lot()
            comment = self.order_comment + "_" + str(int(time.time()))
            log_info(self.strategy_id, f"新K线开多首单", {
                'lot': lots,
                'price': ask
            })
            self.send_market_order(mt5.ORDER_TYPE_BUY, lots, self.take_profit, 0, self.buy_magic, comment)
        
        if self.total_sell_orders == 0 and self.allow_sell and (self.allow_trade or self.total_buy_orders == 0):
            lots = self.get_start_lot()
            comment = self.order_comment + "_" + str(int(time.time()))
            log_info(self.strategy_id, f"新K线开空首单", {
                'lot': lots,
                'price': bid
            })
            self.send_market_order(mt5.ORDER_TYPE_SELL, lots, self.take_profit, 0, self.sell_magic, comment)
        
        self.check_risk_controls()
        
        self.update_performance_from_history()
    
    def update_performance_from_history(self):
        """从历史订单更新性能统计"""
        try:
            from_date = datetime.now() - timedelta(days=30)
            to_date = datetime.now()
            
            history_deals = mt5.history_deals_get(from_date, to_date)
            
            if history_deals is None or len(history_deals) == 0:
                return
            
            deals = [d for d in history_deals if d.symbol == self.symbol and 
                    (d.magic == self.buy_magic or d.magic == self.sell_magic)]
            
            if not deals:
                return
            
            self.total_trades = len(deals)
            self.win_trades = sum(1 for d in deals if d.profit > 0)
            self.total_profit = sum(d.profit for d in deals)
            
        except Exception as e:
            logger.error(f"更新性能统计失败: {e}")
    
    def get_performance(self) -> dict:
        """获取性能统计"""
        win_rate = (self.win_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        return {
            'total_trades': self.total_trades,
            'win_rate': round(win_rate, 2),
            'total_profit': round(self.total_profit, 2),
            'buy_orders': self.total_buy_orders,
            'sell_orders': self.total_sell_orders,
            'buy_lots': round(self.BuySummLot, 2),
            'sell_lots': round(self.SellSummLot, 2),
            'buy_profit': round(self.TotalProfitBuy, 2),
            'sell_profit': round(self.TotalProfitSell, 2),
        }
    
    def start(self):
        """启动策略"""
        self._running = True
        logger.info(f"策略启动: {self.strategy_id}")
        log_info(self.strategy_id, "策略启动", {
            'symbol': self.symbol,
            'add_space': self.add_space,
            'take_profit': self.take_profit,
            'use_entropy_step': self.use_entropy_step
        })
        
        import threading
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
    
    def stop(self):
        """停止策略"""
        self._running = False
        logger.info(f"策略停止: {self.strategy_id}")
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


def create_strategy(params: dict, strategy_id: str = None) -> LinShuStrategy:
    """创建策略实例"""
    return LinShuStrategy(params, strategy_id)

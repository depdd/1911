import MetaTrader5 as mt5
import pandas as pd
import time
from datetime import datetime
from typing import Optional, List, Tuple
import math

# -------------------- 初始化MT5连接 --------------------
def initialize_mt5(login: int, password: str, server: str, path: str = None):
    """初始化MT5连接并登录"""
    if not mt5.initialize(path=path):
        print("MT5初始化失败")
        mt5.shutdown()
        return False
    print(f"MT5版本: {mt5.version()}")

    authorized = mt5.login(login, password=password, server=server)
    if not authorized:
        print(f"登录失败，错误码: {mt5.last_error()}")
        mt5.shutdown()
        return False
    print(f"登录成功，账户: {mt5.account_info().login}")
    return True

# -------------------- 订单管理辅助函数 --------------------
def get_positions(magic: int = None, symbol: str = None) -> List[mt5.TradePosition]:
    """获取当前持仓，可按魔术号和品种过滤"""
    positions = mt5.positions_get()
    if positions is None:
        return []
    result = []
    for pos in positions:
        if symbol and pos.symbol != symbol:
            continue
        if magic and pos.magic != magic:
            continue
        result.append(pos)
    return result

def get_position_count(magic: int, symbol: str) -> int:
    """获取指定魔术号的持仓数量"""
    positions = get_positions(magic, symbol)
    return len(positions)

def calculate_average_price(positions: List[mt5.TradePosition]) -> Optional[float]:
    """计算持仓平均价格（按手数加权）"""
    if not positions:
        return None
    total_value = sum(p.price_open * p.volume for p in positions)
    total_volume = sum(p.volume for p in positions)
    return total_value / total_volume

def total_profit(positions: List[mt5.TradePosition]) -> float:
    """计算持仓总浮动盈亏"""
    return sum(p.profit + p.swap + p.commission for p in positions)

def find_last_position(positions: List[mt5.TradePosition]) -> Optional[mt5.TradePosition]:
    """按时间找到最后开仓的订单（ticket最大）"""
    if not positions:
        return None
    return max(positions, key=lambda p: p.ticket)

def find_first_position(positions: List[mt5.TradePosition]) -> Optional[mt5.TradePosition]:
    """按时间找到最早开仓的订单（ticket最小）"""
    if not positions:
        return None
    return min(positions, key=lambda p: p.ticket)

# -------------------- 交易执行函数 --------------------
def send_market_order(symbol: str, order_type: int, volume: float, magic: int,
                      comment: str = "", deviation: int = 10, sl: float = 0, tp: float = 0) -> bool:
    """发送市价单，返回是否成功"""
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        print("获取报价失败")
        return False

    price = tick.ask if order_type == mt5.ORDER_TYPE_BUY else tick.bid
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": deviation,
        "magic": magic,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        print(f"订单发送失败，错误码: {result.retcode}, 说明: {result.comment}")
        return False
    print(f"订单成功: {result.order}，价格: {price}")
    return True

def close_position(position: mt5.TradePosition, deviation: int = 10) -> bool:
    """平掉指定持仓"""
    tick = mt5.symbol_info_tick(position.symbol)
    if tick is None:
        return False
    order_type = mt5.ORDER_TYPE_SELL if position.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
    price = tick.bid if position.type == mt5.POSITION_TYPE_BUY else tick.ask
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": position.symbol,
        "volume": position.volume,
        "type": order_type,
        "position": position.ticket,
        "price": price,
        "deviation": deviation,
        "magic": position.magic,
        "comment": "close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        print(f"平仓失败，订单: {position.ticket}，错误码: {result.retcode}")
        return False
    print(f"平仓成功: {position.ticket}，价格: {price}")
    return True

# -------------------- 策略主类 --------------------
class GridMartingaleStrategy:
    """
    网格马丁格尔策略（对应原MT4 EA）
    使用MT5接口执行实盘交易
    """
    def __init__(self, params: dict):
        self.params = params
        self.symbol = params['symbol']
        self.buy_magic = params['buy_magic']
        self.sell_magic = params['sell_magic']

        # 从市场信息获取点值等
        self.point = mt5.symbol_info(self.symbol).point
        self.trade_contract_size = mt5.symbol_info(self.symbol).trade_contract_size  # 合约大小

        # 手数序列
        self.lot_sequence = params.get('lot_sequence', [
            0.03, 0.04, 0.05, 0.06, 0.07, 0.10, 0.13, 0.16, 0.21, 0.28,
            0.36, 0.47, 0.61, 0.79, 1.02, 1.33, 1.73, 2.25, 2.92, 3.80,
            4.94, 6.45, 7.96, 9.93, 11.85
        ])
        self.max_add_positions = len(self.lot_sequence)  # 最大加仓次数（不含首单）

        # 状态变量
        self.is_max_level_reached = False   # 任一方向达上限后停止加仓
        self.last_bar_time = None           # 用于新K线触发首单

        # 获取交易品种的最小手数和步长
        self.min_volume = mt5.symbol_info(self.symbol).volume_min
        self.volume_step = mt5.symbol_info(self.symbol).volume_step
        self.max_volume = mt5.symbol_info(self.symbol).volume_max

    def normalize_volume(self, volume: float) -> float:
        """将手数规范化为符合经纪商要求的步长和最小手数"""
        volume = round(volume / self.volume_step) * self.volume_step
        volume = max(self.min_volume, min(volume, self.max_volume))
        return round(volume, 2)

    def get_start_lot(self) -> float:
        """获取首单手数"""
        if self.params.get('use_auto_lot', False):
            equity = mt5.account_info().equity
            lot = equity * self.params.get('auto_lot_percent', 1.0) / 10000.0
        else:
            lot = self.params.get('fixed_lot', 0.02)
        # 限制
        lot = max(self.min_volume, min(lot, self.params.get('max_lot', 100)))
        return self.normalize_volume(lot)

    def get_lot_for_step(self, current_count: int) -> float:
        """根据当前持仓数获取加仓手数"""
        idx = min(current_count, len(self.lot_sequence) - 1)
        lot = self.lot_sequence[idx]
        # 限制范围
        lot = max(self.min_volume, min(lot, self.params.get('max_lot', 100)))
        return self.normalize_volume(lot)

    def get_pipstep_for_step(self, step: int) -> int:
        """获取加仓间距（点数），可扩展动态逻辑"""
        # 目前固定，如需动态可在此添加
        return self.params.get('add_space', 100)

    def check_new_bar(self):
        """检测新K线（基于时间），返回True如果是新K线"""
        current_time = datetime.now()
        if self.params.get('timeframe') == 'M1':
            bar_key = current_time.replace(second=0, microsecond=0)
        elif self.params.get('timeframe') == 'M5':
            # 按5分钟对齐
            minute = current_time.minute // 5 * 5
            bar_key = current_time.replace(minute=minute, second=0, microsecond=0)
        else:
            bar_key = current_time.replace(second=0, microsecond=0)  # 默认M1
        if self.last_bar_time is None or bar_key > self.last_bar_time:
            self.last_bar_time = bar_key
            return True
        return False

    def on_tick(self):
        """每个tick调用（主循环）"""
        # 获取当前报价
        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            return
        bid, ask = tick.bid, tick.ask
        current_time = datetime.now()

        # ---------- 首单触发（新K线）----------
        if self.check_new_bar():
            # 多单首单
            buy_positions = get_positions(self.buy_magic, self.symbol)
            if len(buy_positions) == 0 and self.params.get('allow_buy', True):
                if self.params.get('allow_trade', True) or len(get_positions(self.sell_magic, self.symbol)) == 0:
                    lots = self.get_start_lot()
                    comment = f"FirstBuy_{current_time.strftime('%H%M%S')}"
                    tp = 0  # 由整体止盈管理
                    sl = 0
                    if send_market_order(self.symbol, mt5.ORDER_TYPE_BUY, lots, self.buy_magic, comment,
                                         deviation=self.params.get('deviation', 10), sl=sl, tp=tp):
                        print(f"新K线开多首单: {lots}手 @ {ask}")

            # 空单首单
            sell_positions = get_positions(self.sell_magic, self.symbol)
            if len(sell_positions) == 0 and self.params.get('allow_sell', True):
                if self.params.get('allow_trade', True) or len(get_positions(self.buy_magic, self.symbol)) == 0:
                    lots = self.get_start_lot()
                    comment = f"FirstSell_{current_time.strftime('%H%M%S')}"
                    tp = 0
                    sl = 0
                    if send_market_order(self.symbol, mt5.ORDER_TYPE_SELL, lots, self.sell_magic, comment,
                                         deviation=self.params.get('deviation', 10), sl=sl, tp=tp):
                        print(f"新K线开空首单: {lots}手 @ {bid}")

        # ---------- 加仓逻辑 ----------
        if not self.is_max_level_reached:
            # 多单加仓
            buy_positions = get_positions(self.buy_magic, self.symbol)
            buy_count = len(buy_positions)
            if 0 < buy_count <= self.max_add_positions:
                last_buy = find_last_position(buy_positions)
                if last_buy is not None:
                    step_pips = self.get_pipstep_for_step(buy_count + 1)  # 原EA传当前持仓数+1
                    step_distance = step_pips * self.point
                    if last_buy.price_open - ask >= step_distance:
                        lots = self.get_lot_for_step(buy_count)  # 当前持仓数作为索引
                        comment = f"AddBuy_{buy_count+1}"
                        if send_market_order(self.symbol, mt5.ORDER_TYPE_BUY, lots, self.buy_magic, comment,
                                             deviation=self.params.get('deviation', 10)):
                            print(f"多单加仓: {lots}手 @ {ask}")
                            if buy_count + 1 >= self.max_add_positions:
                                self.is_max_level_reached = True

            # 空单加仓
            sell_positions = get_positions(self.sell_magic, self.symbol)
            sell_count = len(sell_positions)
            if 0 < sell_count <= self.max_add_positions:
                last_sell = find_last_position(sell_positions)
                if last_sell is not None:
                    step_pips = self.get_pipstep_for_step(sell_count + 1)
                    step_distance = step_pips * self.point
                    if bid - last_sell.price_open >= step_distance:
                        lots = self.get_lot_for_step(sell_count)
                        comment = f"AddSell_{sell_count+1}"
                        if send_market_order(self.symbol, mt5.ORDER_TYPE_SELL, lots, self.sell_magic, comment,
                                             deviation=self.params.get('deviation', 10)):
                            print(f"空单加仓: {lots}手 @ {bid}")
                            if sell_count + 1 >= self.max_add_positions:
                                self.is_max_level_reached = True

        # ---------- 整体止盈 ----------
        self.check_take_profit(bid, ask)

        # ---------- 分批止盈（重叠平仓）----------
        self.check_overlapping(bid, ask)

        # ---------- 风控平仓 ----------
        self.check_risk_controls(bid, ask)

    def check_take_profit(self, bid: float, ask: float):
        """检查整体止盈条件并平仓"""
        tp_points = self.params.get('take_profit', 200)
        tp_distance = tp_points * self.point

        # 多单止盈
        buy_positions = get_positions(self.buy_magic, self.symbol)
        if buy_positions:
            avg_price = calculate_average_price(buy_positions)
            if avg_price is not None:
                tp_price = avg_price + tp_distance
                if bid >= tp_price:
                    for pos in buy_positions:
                        close_position(pos, deviation=self.params.get('deviation', 10))
                    print(f"多单整体止盈，平仓 {len(buy_positions)} 单 @ {bid}")

        # 空单止盈
        sell_positions = get_positions(self.sell_magic, self.symbol)
        if sell_positions:
            avg_price = calculate_average_price(sell_positions)
            if avg_price is not None:
                tp_price = avg_price - tp_distance
                if ask <= tp_price:
                    for pos in sell_positions:
                        close_position(pos, deviation=self.params.get('deviation', 10))
                    print(f"空单整体止盈，平仓 {len(sell_positions)} 单 @ {ask}")

    def check_overlapping(self, bid: float, ask: float):
        """分批止盈逻辑（原CheckOverlapping）"""
        # 多单
        buy_positions = get_positions(self.buy_magic, self.symbol)
        if len(buy_positions) >= 2:
            self._process_overlapping_for_magic(buy_positions, bid, is_buy=True)

        # 空单
        sell_positions = get_positions(self.sell_magic, self.symbol)
        if len(sell_positions) >= 2:
            self._process_overlapping_for_magic(sell_positions, ask, is_buy=False)

    def _process_overlapping_for_magic(self, positions: List[mt5.TradePosition], price: float, is_buy: bool):
        """对一组持仓执行分批止盈判断"""
        # 计算每个订单的浮动盈亏
        profits = []
        for pos in positions:
            if is_buy:
                profit = (price - pos.price_open) * pos.volume * self.trade_contract_size
            else:
                profit = (pos.price_open - price) * pos.volume * self.trade_contract_size
            profits.append((pos, profit))

        # 盈利订单
        pos_profits = [(p, pf) for p, pf in profits if pf > 0]
        if not pos_profits:
            return
        pos_profits.sort(key=lambda x: x[1], reverse=True)
        Lpos, Lprofit = pos_profits[0]
        Lpos1, Lprofit1 = (pos_profits[1] if len(pos_profits) > 1 else (None, 0))

        # 亏损订单
        neg_profits = [(p, pf) for p, pf in profits if pf < 0]
        if not neg_profits:
            return
        neg_profits.sort(key=lambda x: x[1])  # 最小（最亏）
        Cpos, Cprofit = neg_profits[0]

        tp_percent = self.params.get('tp_percent', 10) / 100.0
        tp2_percent = self.params.get('tp2_percent', 5) / 100.0

        if Lprofit1 <= 0:
            # 只有一个盈利订单
            if Lprofit + Cprofit > 0 and (Lprofit + Cprofit) / Lprofit > tp_percent:
                orders_to_close = {Lpos.ticket, Cpos.ticket}
                if Lpos1:
                    orders_to_close.add(Lpos1.ticket)
                for pos in positions:
                    if pos.ticket in orders_to_close:
                        close_position(pos, deviation=self.params.get('deviation', 10))
                print(f"分批止盈（类型1）平仓 {len(orders_to_close)} 单，方向: {'多' if is_buy else '空'}")
        else:
            if Lprofit + Lprofit1 + Cprofit > 0 and (Lprofit + Lprofit1 + Cprofit) / (Lprofit + Lprofit1) > tp2_percent:
                orders_to_close = {Lpos.ticket, Lpos1.ticket, Cpos.ticket}
                for pos in positions:
                    if pos.ticket in orders_to_close:
                        close_position(pos, deviation=self.params.get('deviation', 10))
                print(f"分批止盈（类型2）平仓 {len(orders_to_close)} 单，方向: {'多' if is_buy else '空'}")

    def check_risk_controls(self, bid: float, ask: float):
        """检查风险控制条件并执行平仓"""
        all_positions = get_positions(symbol=self.symbol)
        if not all_positions:
            return
        total_profit_val = total_profit(all_positions)
        equity = mt5.account_info().equity

        if self.params.get('use_loss_close', False) and total_profit_val <= -self.params.get('loss_amount', 600):
            for pos in all_positions:
                close_position(pos, deviation=self.params.get('deviation', 10))
            print(f"触发亏损平仓，总盈亏: {total_profit_val:.2f}")
        elif self.params.get('use_profit_close', False) and total_profit_val >= self.params.get('profit_amount', 0):
            for pos in all_positions:
                close_position(pos, deviation=self.params.get('deviation', 10))
            print(f"触发盈利平仓，总盈亏: {total_profit_val:.2f}")
        elif self.params.get('use_equity_close', False) and equity <= self.params.get('equity_level', 1000):
            for pos in all_positions:
                close_position(pos, deviation=self.params.get('deviation', 10))
            print(f"触发净值低平仓，净值: {equity:.2f}")
            if self.params.get('close_platform', False):
                mt5.shutdown()
                exit(0)

# -------------------- 主循环 --------------------
def main():
    # 配置参数（对应原EA的extern变量）
    params = {
        # MT5连接信息
        'login': 123456,          # 替换为您的账号
        'password': 'your_password',
        'server': 'BrokerServer',
        'path': None,             # MT5安装路径，默认自动查找

        # 交易品种
        'symbol': 'XAUUSD',
        'timeframe': 'M1',        # 用于新K线判断

        # 魔术号
        'buy_magic': 888,
        'sell_magic': 666,

        # 交易开关
        'allow_buy': True,
        'allow_sell': True,
        'allow_trade': True,

        # 手数设置
        'fixed_lot': 0.02,
        'use_auto_lot': False,
        'auto_lot_percent': 1.0,
        'max_lot': 100,

        # 网格参数
        'add_space': 100,          # 加仓间距（点数）
        'take_profit': 200,         # 止盈点数

        # 分批止盈百分比
        'tp_percent': 10,
        'tp2_percent': 5,

        # 风控参数
        'use_loss_close': True,
        'loss_amount': 600,
        'use_profit_close': False,
        'profit_amount': 0,
        'use_equity_close': False,
        'equity_level': 1000,
        'close_platform': False,    # 净值平仓后是否关闭终端

        # 其他
        'deviation': 10,             # 滑点（点数）
        'continue_trading': True,    # 一次交易结束后是否继续（未完全实现，策略将持续运行）
    }

    # 初始化MT5连接
    if not initialize_mt5(params['login'], params['password'], params['server'], params['path']):
        return

    # 创建策略实例
    strategy = GridMartingaleStrategy(params)

    print(f"策略开始运行，监控品种: {params['symbol']}")
    try:
        while True:
            strategy.on_tick()
            time.sleep(0.5)  # 控制循环频率，避免过度占用CPU
    except KeyboardInterrupt:
        print("用户中断，停止策略")
    finally:
        mt5.shutdown()

if __name__ == "__main__":
    main()
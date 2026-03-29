import redis
import json

r = redis.Redis(host='localhost', port=6379, db=0)

mt5_status = r.get('mt5_connection_status')
print(f'MT5连接状态: {mt5_status}')

account_login = r.get('current_account_login')
print(f'账户登录: {account_login}')

for symbol in ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD']:
    tick = r.get(f'tick:{symbol}')
    if tick:
        data = json.loads(tick)
        print(f'{symbol}: bid={data.get("bid")}, ask={data.get("ask")}, time={data.get("time")}')
    else:
        print(f'{symbol}: 无数据')

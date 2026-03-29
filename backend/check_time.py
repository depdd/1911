import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, db=0)

current_time = int(time.time())
print(f'当前时间戳: {current_time}')

tick = r.get('tick:BTCUSD')
if tick:
    data = json.loads(tick)
    print(f'Tick时间戳: {data.get("time")}')
    print(f'时间差: {current_time - data.get("time", 0)}秒')
else:
    print('无tick数据')

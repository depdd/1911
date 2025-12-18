import redis
import json
from datetime import datetime

# 连接Redis
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# 检查tick数据
symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD']

print("检查Redis中的tick数据:")
print("=" * 50)

for symbol in symbols:
    tick_data = redis_client.get(f'tick:{symbol}')
    if tick_data:
        data = json.loads(tick_data)
        last_update = data.get('time', 0)
        current_time = datetime.now().timestamp()
        age = current_time - last_update
        print(f"{symbol}: 存在数据 - 更新时间: {datetime.fromtimestamp(last_update)} ({'%.2f' % age}秒前)")
        print(f"  价格: {data.get('bid', 'N/A')} / {data.get('ask', 'N/A')}")
        print(f"  音量: {data.get('volume', 'N/A')}")
    else:
        print(f"{symbol}: 没有数据")
    print("-" * 50)

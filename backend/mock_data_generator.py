import asyncio
import json
import random
import time
import redis
from loguru import logger
from datetime import datetime
from config import get_config

class MockDataGenerator:
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
        self.running = False
        self.base_prices = {
            'EURUSD': {'bid': 1.0850, 'ask': 1.0852, 'spread': 0.0002},
            'GBPUSD': {'bid': 1.2650, 'ask': 1.2652, 'spread': 0.0002},
            'USDJPY': {'bid': 149.50, 'ask': 149.52, 'spread': 0.02},
            'XAUUSD': {'bid': 2320.50, 'ask': 2320.80, 'spread': 0.30},
            'BTCUSD': {'bid': 67250.00, 'ask': 67280.00, 'spread': 30.00}
        }
        self.current_prices = {symbol: prices.copy() for symbol, prices in self.base_prices.items()}
        
    def generate_tick(self, symbol: str) -> dict:
        base = self.current_prices[symbol]
        volatility = {
            'EURUSD': 0.00005,
            'GBPUSD': 0.00008,
            'USDJPY': 0.05,
            'XAUUSD': 1.0,
            'BTCUSD': 50.0
        }
        
        vol = volatility.get(symbol, 0.001)
        price_change = random.uniform(-vol, vol)
        
        base['bid'] = max(0.0001, base['bid'] + price_change)
        base['ask'] = base['bid'] + base['spread']
        
        current_time = int(time.time())
        volume_base = {
            'EURUSD': 1000000,
            'GBPUSD': 800000,
            'USDJPY': 1200000,
            'XAUUSD': 500000,
            'BTCUSD': 200000
        }
        
        volume = max(1, volume_base.get(symbol, 100000) + random.randint(-100000, 200000))
        volume_real = max(0.001, round(volume / 1000, 3))
        
        return {
            'symbol': symbol,
            'time': current_time,
            'bid': round(base['bid'], 5 if symbol in ['EURUSD', 'GBPUSD'] else 2),
            'ask': round(base['ask'], 5 if symbol in ['EURUSD', 'GBPUSD'] else 2),
            'last': round((base['bid'] + base['ask']) / 2, 5 if symbol in ['EURUSD', 'GBPUSD'] else 2),
            'volume': volume,
            'time_msc': current_time * 1000 + random.randint(0, 999),
            'flags': 6,
            'volume_real': volume_real
        }
    
    async def update_loop(self):
        symbols = list(self.base_prices.keys())
        update_interval = 0.1
        counter = 0
        
        logger.info(f"开始生成模拟tick数据，更新间隔: {update_interval}秒")
        print(f"[INFO] 开始生成模拟tick数据，更新间隔: {update_interval}秒")
        
        while self.running:
            try:
                counter += 1
                for symbol in symbols:
                    tick_data = self.generate_tick(symbol)
                    key = f'tick:{symbol}'
                    self.redis_client.setex(key, 60, json.dumps(tick_data))
                    
                    if counter % 50 == 0:
                        print(f"[DEBUG] {symbol}: bid={tick_data['bid']}, ask={tick_data['ask']}, time={tick_data['time']}")
                
                if counter % 50 == 0:
                    print(f"[DEBUG] 已生成 {counter} 轮tick数据")
                    
                await asyncio.sleep(update_interval)
                
            except Exception as e:
                logger.error(f"生成tick数据异常: {e}")
                print(f"[ERROR] 生成tick数据异常: {e}")
                await asyncio.sleep(1)
    
    def start(self):
        self.running = True
        
    def stop(self):
        self.running = False

async def main():
    config = get_config()
    
    redis_client = redis.from_url(config.REDIS_URL, decode_responses=False)
    
    generator = MockDataGenerator(redis_client)
    generator.start()
    
    logger.info("模拟数据生成器已启动")
    print("[INFO] 模拟数据生成器已启动，按Ctrl+C停止")
    
    try:
        await generator.update_loop()
    except KeyboardInterrupt:
        logger.info("用户中断")
    finally:
        generator.stop()
        logger.info("模拟数据生成器已停止")

if __name__ == "__main__":
    asyncio.run(main())

import redis
import json
from datetime import timedelta
from functools import wraps
from typing import Optional, Any, Callable
import hashlib

class CacheService:
    def __init__(self, redis_url: str = 'redis://localhost:6379/0'):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.default_ttl = 300
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        key_parts = [prefix]
        for arg in args:
            key_parts.append(str(arg))
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}:{v}")
        key_string = ":".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = None) -> bool:
        try:
            serialized = json.dumps(value, default=str)
            ttl = ttl or self.default_ttl
            return self.redis_client.setex(key, ttl, serialized)
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        try:
            return self.redis_client.delete(key) > 0
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Cache delete pattern error: {e}")
            return 0
    
    def cached(self, prefix: str, ttl: int = 300):
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                cache_key = f"{prefix}:{self._generate_key(func.__name__, *args, **kwargs)}"
                
                cached_result = self.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                result = func(*args, **kwargs)
                
                self.set(cache_key, result, ttl)
                
                return result
            return wrapper
        return decorator
    
    def invalidate_user_cache(self, user_id: int):
        patterns = [
            f"user:{user_id}:*",
            f"strategies:user:{user_id}:*",
            f"accounts:user:{user_id}:*"
        ]
        for pattern in patterns:
            self.delete_pattern(pattern)
    
    def cache_user_data(self, user_id: int, data: dict, ttl: int = 300):
        key = f"user:{user_id}:data"
        return self.set(key, data, ttl)
    
    def get_user_data(self, user_id: int) -> Optional[dict]:
        key = f"user:{user_id}:data"
        return self.get(key)
    
    def cache_strategies(self, user_id: int, strategies: list, ttl: int = 60):
        key = f"strategies:user:{user_id}:list"
        return self.set(key, strategies, ttl)
    
    def get_cached_strategies(self, user_id: int) -> Optional[list]:
        key = f"strategies:user:{user_id}:list"
        return self.get(key)
    
    def cache_accounts(self, user_id: int, accounts: list, ttl: int = 300):
        key = f"accounts:user:{user_id}:list"
        return self.set(key, accounts, ttl)
    
    def get_cached_accounts(self, user_id: int) -> Optional[list]:
        key = f"accounts:user:{user_id}:list"
        return self.get(key)
    
    def cache_market_data(self, symbol: str, data: dict, ttl: int = 5):
        key = f"market:{symbol}:tick"
        return self.set(key, data, ttl)
    
    def get_cached_market_data(self, symbol: str) -> Optional[dict]:
        key = f"market:{symbol}:tick"
        return self.get(key)
    
    def cache_positions(self, account_id: str, positions: list, ttl: int = 10):
        key = f"positions:{account_id}"
        return self.set(key, positions, ttl)
    
    def get_cached_positions(self, account_id: str) -> Optional[list]:
        key = f"positions:{account_id}"
        return self.get(key)
    
    def get_stats(self) -> dict:
        try:
            info = self.redis_client.info()
            return {
                'connected_clients': info.get('connected_clients', 0),
                'used_memory_human': info.get('used_memory_human', '0B'),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
            }
        except Exception as e:
            return {'error': str(e)}

cache_service = CacheService()

def cached_response(prefix: str, ttl: int = 300):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            return cache_service.cached(prefix, ttl)(func)(*args, **kwargs)
        return wrapper
    return decorator

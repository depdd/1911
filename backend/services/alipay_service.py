import hashlib
import json
import time
import urllib.parse
from datetime import datetime
from typing import Dict, Optional, Any
from urllib.parse import urlencode

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from loguru import logger

from config import Config


class AlipayService:
    def __init__(self):
        self.app_id = Config.ALIPAY_APP_ID
        self.private_key = Config.ALIPAY_PRIVATE_KEY
        self.alipay_public_key = Config.ALIPAY_PUBLIC_KEY
        self.notify_url = Config.ALIPAY_NOTIFY_URL
        self.return_url = Config.ALIPAY_RETURN_URL
        self.sandbox = Config.ALIPAY_SANDBOX
        
        if self.sandbox:
            self.gateway_url = "https://openapi.alipaydev.com/gateway.do"
        else:
            self.gateway_url = "https://openapi.alipay.com/gateway.do"
    
    def _load_private_key(self):
        try:
            private_key = serialization.load_pem_private_key(
                self.private_key.encode('utf-8'),
                password=None,
                backend=default_backend()
            )
            return private_key
        except Exception as e:
            logger.error(f"加载私钥失败: {e}")
            return None
    
    def _load_public_key(self):
        try:
            public_key = serialization.load_pem_public_key(
                self.alipay_public_key.encode('utf-8'),
                backend=default_backend()
            )
            return public_key
        except Exception as e:
            logger.error(f"加载公钥失败: {e}")
            return None
    
    def _sign(self, data: str) -> str:
        private_key = self._load_private_key()
        if not private_key:
            raise ValueError("私钥加载失败")
        
        signature = private_key.sign(
            data.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        
        import base64
        return base64.b64encode(signature).decode('utf-8')
    
    def _verify(self, data: str, sign: str) -> bool:
        public_key = self._load_public_key()
        if not public_key:
            logger.error("公钥加载失败")
            return False
        
        try:
            import base64
            public_key.verify(
                base64.b64decode(sign),
                data.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except Exception as e:
            logger.error(f"验签失败: {e}")
            return False
    
    def create_order(
        self,
        out_trade_no: str,
        total_amount: float,
        subject: str,
        body: str = ""
    ) -> Dict[str, Any]:
        biz_content = {
            "out_trade_no": out_trade_no,
            "total_amount": str(total_amount),
            "subject": subject,
            "product_code": "FAST_INSTANT_TRADE_PAY",
            "body": body
        }
        
        params = {
            "app_id": self.app_id,
            "method": "alipay.trade.page.pay",
            "format": "JSON",
            "return_url": self.return_url,
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "notify_url": self.notify_url,
            "biz_content": json.dumps(biz_content)
        }
        
        params_sorted = dict(sorted(params.items()))
        sign_data = "&".join([f"{k}={v}" for k, v in params_sorted.items() if v])
        sign = self._sign(sign_data)
        params["sign"] = sign
        
        pay_url = f"{self.gateway_url}?{urlencode(params)}"
        
        return {
            "success": True,
            "pay_url": pay_url,
            "order_no": out_trade_no
        }
    
    def create_wap_order(
        self,
        out_trade_no: str,
        total_amount: float,
        subject: str,
        body: str = ""
    ) -> Dict[str, Any]:
        biz_content = {
            "out_trade_no": out_trade_no,
            "total_amount": str(total_amount),
            "subject": subject,
            "product_code": "QUICK_WAP_WAY",
            "body": body
        }
        
        params = {
            "app_id": self.app_id,
            "method": "alipay.trade.wap.pay",
            "format": "JSON",
            "return_url": self.return_url,
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "notify_url": self.notify_url,
            "biz_content": json.dumps(biz_content)
        }
        
        params_sorted = dict(sorted(params.items()))
        sign_data = "&".join([f"{k}={v}" for k, v in params_sorted.items() if v])
        sign = self._sign(sign_data)
        params["sign"] = sign
        
        pay_url = f"{self.gateway_url}?{urlencode(params)}"
        
        return {
            "success": True,
            "pay_url": pay_url,
            "order_no": out_trade_no
        }
    
    def query_order(self, out_trade_no: str) -> Dict[str, Any]:
        biz_content = {
            "out_trade_no": out_trade_no
        }
        
        params = {
            "app_id": self.app_id,
            "method": "alipay.trade.query",
            "format": "JSON",
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "biz_content": json.dumps(biz_content)
        }
        
        params_sorted = dict(sorted(params.items()))
        sign_data = "&".join([f"{k}={v}" for k, v in params_sorted.items() if v])
        sign = self._sign(sign_data)
        params["sign"] = sign
        
        try:
            response = requests.post(self.gateway_url, data=params, timeout=10)
            result = response.json()
            
            response_key = "alipay_trade_query_response"
            if response_key in result:
                query_result = result[response_key]
                return {
                    "success": query_result.get("code") == "10000",
                    "trade_status": query_result.get("trade_status"),
                    "trade_no": query_result.get("trade_no"),
                    "out_trade_no": query_result.get("out_trade_no"),
                    "total_amount": query_result.get("total_amount"),
                    "buyer_logon_id": query_result.get("buyer_logon_id"),
                    "msg": query_result.get("msg", "")
                }
            
            return {"success": False, "msg": "查询失败"}
        except Exception as e:
            logger.error(f"查询订单失败: {e}")
            return {"success": False, "msg": str(e)}
    
    def verify_notify(self, data: Dict[str, Any]) -> bool:
        sign = data.pop("sign", None)
        sign_type = data.pop("sign_type", None)
        
        if not sign:
            logger.error("缺少签名")
            return False
        
        params_sorted = dict(sorted(data.items()))
        sign_data = "&".join([f"{k}={v}" for k, v in params_sorted.items() if v])
        
        return self._verify(sign_data, sign)
    
    def close_order(self, out_trade_no: str) -> Dict[str, Any]:
        biz_content = {
            "out_trade_no": out_trade_no
        }
        
        params = {
            "app_id": self.app_id,
            "method": "alipay.trade.close",
            "format": "JSON",
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "biz_content": json.dumps(biz_content)
        }
        
        params_sorted = dict(sorted(params.items()))
        sign_data = "&".join([f"{k}={v}" for k, v in params_sorted.items() if v])
        sign = self._sign(sign_data)
        params["sign"] = sign
        
        try:
            response = requests.post(self.gateway_url, data=params, timeout=10)
            result = response.json()
            
            response_key = "alipay_trade_close_response"
            if response_key in result:
                close_result = result[response_key]
                return {
                    "success": close_result.get("code") == "10000",
                    "msg": close_result.get("msg", "")
                }
            
            return {"success": False, "msg": "关闭订单失败"}
        except Exception as e:
            logger.error(f"关闭订单失败: {e}")
            return {"success": False, "msg": str(e)}


alipay_service = AlipayService()

import hashlib
import hmac
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Optional, Any
from xml.etree import ElementTree

import requests
from loguru import logger

from config import Config


class WechatPayService:
    def __init__(self):
        self.app_id = Config.WECHAT_APP_ID
        self.mch_id = Config.WECHAT_MCH_ID
        self.api_key = Config.WECHAT_API_KEY
        self.api_v3_key = Config.WECHAT_API_V3_KEY
        self.notify_url = Config.WECHAT_NOTIFY_URL
        self.cert_path = Config.WECHAT_CERT_PATH
        self.key_path = Config.WECHAT_KEY_PATH
        self.sandbox = Config.WECHAT_SANDBOX
        
        if self.sandbox:
            self.api_url = "https://api.mch.weixin.qq.com/sandboxnew"
        else:
            self.api_url = "https://api.mch.weixin.qq.com"
    
    def _generate_nonce_str(self, length: int = 32) -> str:
        chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return "".join(chars[ord(c) % len(chars)] for c in str(uuid.uuid4()).replace("-", ""))[:length]
    
    def _generate_sign(self, params: Dict[str, Any], api_key: str = None) -> str:
        key = api_key or self.api_key
        sorted_params = sorted(params.items(), key=lambda x: x[0])
        sign_str = "&".join([f"{k}={v}" for k, v in sorted_params if v])
        sign_str += f"&key={key}"
        return hashlib.md5(sign_str.encode("utf-8")).hexdigest().upper()
    
    def _generate_hmac_sha256_sign(self, params: Dict[str, Any], api_key: str = None) -> str:
        key = api_key or self.api_key
        sorted_params = sorted(params.items(), key=lambda x: x[0])
        sign_str = "&".join([f"{k}={v}" for k, v in sorted_params if v])
        return hmac.new(key.encode("utf-8"), sign_str.encode("utf-8"), hashlib.sha256).hexdigest().upper()
    
    def _dict_to_xml(self, data: Dict[str, Any]) -> str:
        xml = "<xml>"
        for k, v in data.items():
            if isinstance(v, str):
                xml += f"<{k}><![CDATA[{v}]]></{k}>"
            else:
                xml += f"<{k}>{v}</{k}>"
        xml += "</xml>"
        return xml
    
    def _xml_to_dict(self, xml_str: str) -> Dict[str, Any]:
        root = ElementTree.fromstring(xml_str)
        return {child.tag: child.text for child in root}
    
    def create_native_order(
        self,
        out_trade_no: str,
        total_amount: int,
        body: str,
        attach: str = ""
    ) -> Dict[str, Any]:
        params = {
            "appid": self.app_id,
            "mch_id": self.mch_id,
            "nonce_str": self._generate_nonce_str(),
            "body": body,
            "attach": attach,
            "out_trade_no": out_trade_no,
            "total_fee": total_amount,
            "spbill_create_ip": "127.0.0.1",
            "notify_url": self.notify_url,
            "trade_type": "NATIVE",
            "product_id": out_trade_no
        }
        
        params["sign"] = self._generate_sign(params)
        
        xml_data = self._dict_to_xml(params)
        
        try:
            url = f"{self.api_url}/pay/unifiedorder"
            response = requests.post(url, data=xml_data.encode("utf-8"), timeout=10)
            result = self._xml_to_dict(response.content.decode("utf-8"))
            
            if result.get("return_code") == "SUCCESS" and result.get("result_code") == "SUCCESS":
                return {
                    "success": True,
                    "code_url": result.get("code_url"),
                    "prepay_id": result.get("prepay_id"),
                    "order_no": out_trade_no
                }
            else:
                return {
                    "success": False,
                    "msg": result.get("return_msg") or result.get("err_code_des", "下单失败")
                }
        except Exception as e:
            logger.error(f"创建微信支付订单失败: {e}")
            return {"success": False, "msg": str(e)}
    
    def create_jsapi_order(
        self,
        out_trade_no: str,
        total_amount: int,
        body: str,
        openid: str,
        attach: str = ""
    ) -> Dict[str, Any]:
        params = {
            "appid": self.app_id,
            "mch_id": self.mch_id,
            "nonce_str": self._generate_nonce_str(),
            "body": body,
            "attach": attach,
            "out_trade_no": out_trade_no,
            "total_fee": total_amount,
            "spbill_create_ip": "127.0.0.1",
            "notify_url": self.notify_url,
            "trade_type": "JSAPI",
            "openid": openid
        }
        
        params["sign"] = self._generate_sign(params)
        
        xml_data = self._dict_to_xml(params)
        
        try:
            url = f"{self.api_url}/pay/unifiedorder"
            response = requests.post(url, data=xml_data.encode("utf-8"), timeout=10)
            result = self._xml_to_dict(response.content.decode("utf-8"))
            
            if result.get("return_code") == "SUCCESS" and result.get("result_code") == "SUCCESS":
                prepay_id = result.get("prepay_id")
                timestamp = str(int(time.time()))
                nonce_str = self._generate_nonce_str()
                
                jsapi_params = {
                    "appId": self.app_id,
                    "timeStamp": timestamp,
                    "nonceStr": nonce_str,
                    "package": f"prepay_id={prepay_id}",
                    "signType": "MD5"
                }
                
                pay_sign = self._generate_sign(jsapi_params)
                jsapi_params["paySign"] = pay_sign
                
                return {
                    "success": True,
                    "jsapi_params": jsapi_params,
                    "prepay_id": prepay_id,
                    "order_no": out_trade_no
                }
            else:
                return {
                    "success": False,
                    "msg": result.get("return_msg") or result.get("err_code_des", "下单失败")
                }
        except Exception as e:
            logger.error(f"创建微信JSAPI订单失败: {e}")
            return {"success": False, "msg": str(e)}
    
    def create_h5_order(
        self,
        out_trade_no: str,
        total_amount: int,
        body: str,
        client_ip: str = "127.0.0.1",
        attach: str = ""
    ) -> Dict[str, Any]:
        params = {
            "appid": self.app_id,
            "mch_id": self.mch_id,
            "nonce_str": self._generate_nonce_str(),
            "body": body,
            "attach": attach,
            "out_trade_no": out_trade_no,
            "total_fee": total_amount,
            "spbill_create_ip": client_ip,
            "notify_url": self.notify_url,
            "trade_type": "MWEB",
            "scene_info": json.dumps({
                "h5_info": {
                    "type": "Wap"
                }
            })
        }
        
        params["sign"] = self._generate_sign(params)
        
        xml_data = self._dict_to_xml(params)
        
        try:
            url = f"{self.api_url}/pay/unifiedorder"
            response = requests.post(url, data=xml_data.encode("utf-8"), timeout=10)
            result = self._xml_to_dict(response.content.decode("utf-8"))
            
            if result.get("return_code") == "SUCCESS" and result.get("result_code") == "SUCCESS":
                return {
                    "success": True,
                    "mweb_url": result.get("mweb_url"),
                    "prepay_id": result.get("prepay_id"),
                    "order_no": out_trade_no
                }
            else:
                return {
                    "success": False,
                    "msg": result.get("return_msg") or result.get("err_code_des", "下单失败")
                }
        except Exception as e:
            logger.error(f"创建微信H5订单失败: {e}")
            return {"success": False, "msg": str(e)}
    
    def query_order(self, out_trade_no: str) -> Dict[str, Any]:
        params = {
            "appid": self.app_id,
            "mch_id": self.mch_id,
            "out_trade_no": out_trade_no,
            "nonce_str": self._generate_nonce_str()
        }
        
        params["sign"] = self._generate_sign(params)
        
        xml_data = self._dict_to_xml(params)
        
        try:
            url = f"{self.api_url}/pay/orderquery"
            response = requests.post(url, data=xml_data.encode("utf-8"), timeout=10)
            result = self._xml_to_dict(response.content.decode("utf-8"))
            
            if result.get("return_code") == "SUCCESS" and result.get("result_code") == "SUCCESS":
                return {
                    "success": True,
                    "trade_state": result.get("trade_state"),
                    "trade_state_desc": result.get("trade_state_desc"),
                    "transaction_id": result.get("transaction_id"),
                    "out_trade_no": result.get("out_trade_no"),
                    "total_fee": result.get("total_fee"),
                    "time_end": result.get("time_end"),
                    "openid": result.get("openid")
                }
            else:
                return {
                    "success": False,
                    "msg": result.get("return_msg") or result.get("err_code_des", "查询失败")
                }
        except Exception as e:
            logger.error(f"查询微信订单失败: {e}")
            return {"success": False, "msg": str(e)}
    
    def verify_notify(self, xml_data: str) -> Dict[str, Any]:
        try:
            data = self._xml_to_dict(xml_data)
            
            if data.get("return_code") != "SUCCESS":
                return {"success": False, "msg": "通信失败"}
            
            sign = data.pop("sign", None)
            calculated_sign = self._generate_sign(data)
            
            if sign != calculated_sign:
                logger.error("微信支付回调验签失败")
                return {"success": False, "msg": "验签失败"}
            
            if data.get("result_code") == "SUCCESS":
                return {
                    "success": True,
                    "out_trade_no": data.get("out_trade_no"),
                    "transaction_id": data.get("transaction_id"),
                    "total_fee": data.get("total_fee"),
                    "time_end": data.get("time_end"),
                    "openid": data.get("openid"),
                    "trade_type": data.get("trade_type")
                }
            else:
                return {"success": False, "msg": data.get("err_code_des", "支付失败")}
        except Exception as e:
            logger.error(f"处理微信支付回调失败: {e}")
            return {"success": False, "msg": str(e)}
    
    def close_order(self, out_trade_no: str) -> Dict[str, Any]:
        params = {
            "appid": self.app_id,
            "mch_id": self.mch_id,
            "out_trade_no": out_trade_no,
            "nonce_str": self._generate_nonce_str()
        }
        
        params["sign"] = self._generate_sign(params)
        
        xml_data = self._dict_to_xml(params)
        
        try:
            url = f"{self.api_url}/pay/closeorder"
            response = requests.post(url, data=xml_data.encode("utf-8"), timeout=10)
            result = self._xml_to_dict(response.content.decode("utf-8"))
            
            if result.get("return_code") == "SUCCESS" and result.get("result_code") == "SUCCESS":
                return {"success": True, "msg": "关闭订单成功"}
            else:
                return {
                    "success": False,
                    "msg": result.get("return_msg") or result.get("err_code_des", "关闭订单失败")
                }
        except Exception as e:
            logger.error(f"关闭微信订单失败: {e}")
            return {"success": False, "msg": str(e)}
    
    def refund(
        self,
        out_trade_no: str,
        out_refund_no: str,
        total_fee: int,
        refund_fee: int,
        refund_desc: str = ""
    ) -> Dict[str, Any]:
        params = {
            "appid": self.app_id,
            "mch_id": self.mch_id,
            "nonce_str": self._generate_nonce_str(),
            "out_trade_no": out_trade_no,
            "out_refund_no": out_refund_no,
            "total_fee": total_fee,
            "refund_fee": refund_fee,
            "refund_desc": refund_desc,
            "notify_url": self.notify_url.replace("/notify", "/refund-notify")
        }
        
        params["sign"] = self._generate_sign(params)
        
        xml_data = self._dict_to_xml(params)
        
        try:
            url = f"{self.api_url}/secapi/pay/refund"
            
            cert = (self.cert_path, self.key_path) if self.cert_path and self.key_path else None
            response = requests.post(url, data=xml_data.encode("utf-8"), cert=cert, timeout=10)
            result = self._xml_to_dict(response.content.decode("utf-8"))
            
            if result.get("return_code") == "SUCCESS" and result.get("result_code") == "SUCCESS":
                return {
                    "success": True,
                    "refund_id": result.get("refund_id"),
                    "out_refund_no": out_refund_no
                }
            else:
                return {
                    "success": False,
                    "msg": result.get("return_msg") or result.get("err_code_des", "退款失败")
                }
        except Exception as e:
            logger.error(f"微信退款失败: {e}")
            return {"success": False, "msg": str(e)}


wechat_pay_service = WechatPayService()

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Optional
from loguru import logger
from config import get_config

config = get_config()


class EmailService:
    def __init__(self):
        self.host = config.SMTP_HOST
        self.port = config.SMTP_PORT
        self.user = config.SMTP_USER
        self.password = config.SMTP_PASSWORD
        self.from_addr = config.SMTP_FROM or config.SMTP_USER
        self.use_ssl = config.SMTP_USE_SSL
    
    def is_configured(self) -> bool:
        return bool(self.host and self.user and self.password)
    
    def send_verification_code(self, to_email: str, code: str, code_type: str = 'register') -> bool:
        if code_type == 'register':
            subject = '【量化交易平台】注册验证码'
            content = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0;">
            <h1 style="color: #2563eb; margin: 0;">量化交易平台</h1>
        </div>
        <div style="padding: 30px 0;">
            <p style="font-size: 16px;">您好！</p>
            <p style="font-size: 16px;">您正在注册量化交易平台账号，验证码如下：</p>
            <div style="background-color: #2563eb; color: white; font-size: 32px; font-weight: bold; 
                        text-align: center; padding: 20px; margin: 30px 0; border-radius: 8px; letter-spacing: 8px;">
                {code}
            </div>
            <p style="font-size: 14px; color: #666;">验证码有效期为 <strong>5分钟</strong>，请尽快完成验证。</p>
            <p style="font-size: 14px; color: #666;">如果您没有进行此操作，请忽略此邮件。</p>
        </div>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>此邮件由系统自动发送，请勿直接回复。</p>
            <p>© 2024 量化交易平台 版权所有</p>
        </div>
    </div>
</body>
</html>
'''
        else:
            subject = '【量化交易平台】登录验证码'
            content = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0;">
            <h1 style="color: #2563eb; margin: 0;">量化交易平台</h1>
        </div>
        <div style="padding: 30px 0;">
            <p style="font-size: 16px;">您好！</p>
            <p style="font-size: 16px;">您正在登录量化交易平台，验证码如下：</p>
            <div style="background-color: #2563eb; color: white; font-size: 32px; font-weight: bold; 
                        text-align: center; padding: 20px; margin: 30px 0; border-radius: 8px; letter-spacing: 8px;">
                {code}
            </div>
            <p style="font-size: 14px; color: #666;">验证码有效期为 <strong>5分钟</strong>，请尽快完成验证。</p>
            <p style="font-size: 14px; color: #666;">如果您没有进行此操作，请忽略此邮件，可能是他人误输入了您的邮箱。</p>
        </div>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>此邮件由系统自动发送，请勿直接回复。</p>
            <p>© 2024 量化交易平台 版权所有</p>
        </div>
    </div>
</body>
</html>
'''
        
        return self._send_email(to_email, subject, content)
    
    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        if not self.is_configured():
            logger.warning("邮件服务未配置，跳过发送邮件")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = formataddr(('量化交易平台', self.from_addr))
            msg['To'] = to_email
            
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            if self.use_ssl:
                with smtplib.SMTP_SSL(self.host, self.port) as server:
                    server.login(self.user, self.password)
                    server.sendmail(self.from_addr, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(self.host, self.port) as server:
                    server.starttls()
                    server.login(self.user, self.password)
                    server.sendmail(self.from_addr, [to_email], msg.as_string())
            
            logger.info(f"邮件发送成功: {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"邮件发送失败: {e}")
            return False


email_service = EmailService()

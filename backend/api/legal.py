from flask import Blueprint, request, jsonify
from datetime import datetime

legal_bp = Blueprint('legal', __name__)

DOCUMENTS = {
    'terms_of_service': {
        'title': 'Terms of Service',
        'title_zh': '用户服务协议',
        'version': '1.0.0',
        'updated_at': '2024-01-01',
        'content': '''
# Terms of Service

## 1. Acceptance of Terms

By accessing and using this trading platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement.

## 2. Description of Service

Our Service provides quantitative trading strategy management and execution tools. The Service includes but is not limited to:
- Strategy deployment and management
- Real-time market data analysis
- Trading signal generation
- Account management

## 3. User Responsibilities

You are responsible for:
- Maintaining the confidentiality of your account
- All activities that occur under your account
- Ensuring your use of the Service complies with all applicable laws
- The financial decisions made using our Service

## 4. Risk Disclosure

Trading in financial markets involves substantial risk. Past performance does not guarantee future results. You should:
- Understand the risks involved in trading
- Only trade with funds you can afford to lose
- Seek independent financial advice if necessary

## 5. Limitation of Liability

We shall not be liable for any:
- Trading losses
- System downtime
- Data inaccuracies
- Third-party actions

## 6. Intellectual Property

All content, features, and functionality of the Service are owned by us and are protected by international copyright, trademark, and other intellectual property laws.

## 7. Termination

We reserve the right to terminate or suspend your account at any time for any reason without notice.

## 8. Changes to Terms

We reserve the right to modify these terms at any time. Continued use of the Service constitutes acceptance of modified terms.

## 9. Governing Law

These terms shall be governed by and construed in accordance with applicable laws.

## 10. Contact Information

For questions about these Terms, please contact our support team.
''',
        'content_zh': '''
# 用户服务协议

## 1. 协议接受

通过访问和使用本交易平台（"服务"），您接受并同意受本协议条款的约束。

## 2. 服务描述

我们的服务提供量化交易策略管理和执行工具。服务包括但不限于：
- 策略部署和管理
- 实时市场数据分析
- 交易信号生成
- 账户管理

## 3. 用户责任

您有责任：
- 维护您账户的机密性
- 您账户下发生的所有活动
- 确保您对服务的使用符合所有适用法律
- 使用我们服务做出的财务决策

## 4. 风险披露

金融市场交易涉及重大风险。过往表现不保证未来结果。您应该：
- 了解交易涉及的风险
- 只使用您可以承受损失的资金进行交易
- 如有必要，寻求独立的财务建议

## 5. 责任限制

我们不对以下情况承担责任：
- 交易损失
- 系统停机
- 数据不准确
- 第三方行为

## 6. 知识产权

服务的所有内容、特性和功能均归我们所有，并受国际版权、商标和其他知识产权法的保护。

## 7. 终止

我们保留随时以任何理由终止或暂停您账户的权利，恕不另行通知。

## 8. 条款变更

我们保留随时修改这些条款的权利。继续使用服务即表示接受修改后的条款。

## 9. 适用法律

这些条款应受适用法律管辖并据其解释。

## 10. 联系信息

如有关于这些条款的问题，请联系我们的支持团队。
'''
    },
    'privacy_policy': {
        'title': 'Privacy Policy',
        'title_zh': '隐私政策',
        'version': '1.0.0',
        'updated_at': '2024-01-01',
        'content': '''
# Privacy Policy

## 1. Information We Collect

We collect information you provide directly:
- Account information (email, username)
- MT5 account credentials (encrypted)
- Trading preferences and settings
- Communication data

## 2. How We Use Your Information

We use your information to:
- Provide and maintain our Service
- Process transactions
- Send notifications
- Improve our Service
- Protect against fraud

## 3. Data Security

We implement industry-standard security measures:
- Encryption of sensitive data
- Secure server infrastructure
- Regular security audits
- Access controls

## 4. Data Retention

We retain your data for:
- As long as your account is active
- As required by law
- As necessary for business purposes

## 5. Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data
- Export your data
- Object to processing

## 6. Third-Party Services

We may use third-party services that collect and process data according to their own privacy policies.

## 7. Cookies

We use cookies to:
- Remember your preferences
- Analyze usage patterns
- Improve user experience

## 8. Children's Privacy

Our Service is not intended for users under 18 years of age.

## 9. Changes to Privacy Policy

We may update this policy periodically. Continued use constitutes acceptance.

## 10. Contact Us

For privacy-related inquiries, please contact our data protection officer.
''',
        'content_zh': '''
# 隐私政策

## 1. 我们收集的信息

我们收集您直接提供的信息：
- 账户信息（电子邮件、用户名）
- MT5账户凭据（加密）
- 交易偏好和设置
- 通信数据

## 2. 我们如何使用您的信息

我们使用您的信息来：
- 提供和维护我们的服务
- 处理交易
- 发送通知
- 改进我们的服务
- 防止欺诈

## 3. 数据安全

我们实施行业标准的安全措施：
- 敏感数据加密
- 安全的服务器基础设施
- 定期安全审计
- 访问控制

## 4. 数据保留

我们保留您的数据：
- 只要您的账户处于活动状态
- 法律要求的时间
- 业务需要的时间

## 5. 您的权利

您有权：
- 访问您的个人数据
- 更正不准确的数据
- 删除您的数据
- 导出您的数据
- 反对处理

## 6. 第三方服务

我们可能使用根据其自身隐私政策收集和处理数据的第三方服务。

## 7. Cookie

我们使用Cookie来：
- 记住您的偏好
- 分析使用模式
- 改善用户体验

## 8. 儿童隐私

我们的服务不适用于18岁以下的用户。

## 9. 隐私政策变更

我们可能会定期更新此政策。继续使用即表示接受。

## 10. 联系我们

如有隐私相关咨询，请联系我们的数据保护官。
'''
    },
    'risk_disclosure': {
        'title': 'Risk Disclosure',
        'title_zh': '风险披露声明',
        'version': '1.0.0',
        'updated_at': '2024-01-01',
        'content': '''
# Risk Disclosure Statement

## IMPORTANT - READ CAREFULLY

Trading in foreign exchange (Forex) and other financial markets carries a high level of risk and may not be suitable for all investors.

## 1. Market Risk

The value of investments can go down as well as up. You may lose some or all of your initial investment.

## 2. Leverage Risk

Trading on margin (using leverage) can dramatically increase both your profits and losses. A small market movement can result in a large loss.

## 3. Technology Risk

Our platform relies on technology which may fail:
- Internet connectivity issues
- Hardware failures
- Software bugs
- Third-party service disruptions

## 4. Strategy Risk

Trading strategies, including those provided on our platform:
- May not perform as expected
- Can result in significant losses
- Past performance does not guarantee future results

## 5. Liquidity Risk

In certain market conditions, you may not be able to close a position at a desired price.

## 6. Regulatory Risk

Changes in regulations may affect your ability to trade or the profitability of your trades.

## 7. Counterparty Risk

There is a risk that your broker or other counterparties may fail to meet their obligations.

## 8. No Guarantee

We make no guarantees regarding:
- Profitability of any strategy
- Accuracy of market data
- Availability of our service

## 9. Your Acknowledgment

By using our service, you acknowledge that:
- You understand these risks
- You are financially able to bear the risks
- You have sought independent advice if needed

## 10. Limitation of Liability

We are not liable for any losses incurred through use of our platform.
''',
        'content_zh': '''
# 风险披露声明

## 重要提示 - 请仔细阅读

外汇和其他金融市场交易具有高风险，可能不适合所有投资者。

## 1. 市场风险

投资价值可能上涨也可能下跌。您可能会损失部分或全部初始投资。

## 2. 杠杆风险

保证金交易（使用杠杆）可以大幅增加您的盈利和亏损。小的市场波动可能导致大的损失。

## 3. 技术风险

我们的平台依赖可能失败的技术：
- 互联网连接问题
- 硬件故障
- 软件错误
- 第三方服务中断

## 4. 策略风险

交易策略，包括我们平台上提供的策略：
- 可能无法按预期执行
- 可能导致重大损失
- 过往表现不保证未来结果

## 5. 流动性风险

在某些市场条件下，您可能无法以期望的价格平仓。

## 6. 监管风险

法规变化可能影响您的交易能力或交易的盈利能力。

## 7. 交易对手风险

存在您的经纪商或其他交易对手可能无法履行其义务的风险。

## 8. 不保证

我们不对以下情况做出保证：
- 任何策略的盈利能力
- 市场数据的准确性
- 我们服务的可用性

## 9. 您的确认

使用我们的服务，即表示您确认：
- 您了解这些风险
- 您有经济能力承担这些风险
- 如有需要，您已寻求独立建议

## 10. 责任限制

我们不对使用我们平台产生的任何损失承担责任。
'''
    },
    'disclaimer': {
        'title': 'Disclaimer',
        'title_zh': '免责声明',
        'version': '1.0.0',
        'updated_at': '2024-01-01',
        'content': '''
# Disclaimer

## NO FINANCIAL ADVICE

The information provided on this platform is for informational purposes only and should not be considered as financial advice.

## 1. Not Investment Advice

Our platform:
- Does not provide personalized investment advice
- Does not recommend specific trades
- Does not guarantee any returns

## 2. No Warranty

All information is provided "as is" without any warranty of any kind.

## 3. Accuracy of Information

While we strive for accuracy:
- Data may contain errors
- Information may be outdated
- Third-party data may be inaccurate

## 4. Third-Party Links

We are not responsible for:
- Content on third-party websites
- Privacy practices of third parties
- Actions of third-party services

## 5. Forward-Looking Statements

Any projections or forecasts:
- Are based on assumptions
- May not materialize
- Should not be relied upon

## 6. Limitation of Liability

To the fullest extent permitted by law:
- We are not liable for any losses
- We are not liable for any damages
- We are not liable for any claims

## 7. Indemnification

You agree to indemnify us against any claims arising from your use of our service.

## 8. Jurisdiction

This disclaimer shall be governed by applicable laws.

## 9. Severability

If any provision is found invalid, the remaining provisions remain in effect.

## 10. Contact

For questions about this disclaimer, please contact our support team.
''',
        'content_zh': '''
# 免责声明

## 非财务建议

本平台提供的信息仅供参考，不应被视为财务建议。

## 1. 非投资建议

我们的平台：
- 不提供个性化投资建议
- 不推荐特定交易
- 不保证任何回报

## 2. 不保证

所有信息按"原样"提供，不提供任何形式的保证。

## 3. 信息准确性

虽然我们力求准确：
- 数据可能包含错误
- 信息可能已过时
- 第三方数据可能不准确

## 4. 第三方链接

我们不对以下情况负责：
- 第三方网站的内容
- 第三方的隐私做法
- 第三方服务的行为

## 5. 前瞻性声明

任何预测或预报：
- 基于假设
- 可能无法实现
- 不应依赖

## 6. 责任限制

在法律允许的最大范围内：
- 我们不对任何损失承担责任
- 我们不对任何损害承担责任
- 我们不对任何索赔承担责任

## 7. 赔偿

您同意赔偿我们因您使用我们服务而产生的任何索赔。

## 8. 管辖权

本免责声明应受适用法律管辖。

## 9. 可分割性

如果任何条款被认定无效，其余条款仍然有效。

## 10. 联系

如有关于本免责声明的问题，请联系我们的支持团队。
'''
    }
}

def init_legal_blueprint(db_session_getter):
    return legal_bp

@legal_bp.route('/documents', methods=['GET'])
def get_documents():
    lang = request.args.get('lang', 'en')
    
    documents = []
    for doc_id, doc in DOCUMENTS.items():
        documents.append({
            'id': doc_id,
            'title': doc['title_zh'] if lang == 'zh' else doc['title'],
            'version': doc['version'],
            'updated_at': doc['updated_at']
        })
    
    return jsonify({'documents': documents}), 200

@legal_bp.route('/documents/<doc_id>', methods=['GET'])
def get_document(doc_id):
    lang = request.args.get('lang', 'en')
    
    if doc_id not in DOCUMENTS:
        return jsonify({'error': 'Document not found'}), 404
    
    doc = DOCUMENTS[doc_id]
    
    return jsonify({
        'id': doc_id,
        'title': doc['title_zh'] if lang == 'zh' else doc['title'],
        'version': doc['version'],
        'updated_at': doc['updated_at'],
        'content': doc['content_zh'] if lang == 'zh' else doc['content']
    }), 200

@legal_bp.route('/accept', methods=['POST'])
def accept_documents():
    from api.auth import jwt_required, g, get_db_session, log_operation
    
    @jwt_required
    def _accept():
        data = request.get_json()
        documents = data.get('documents', [])
        
        for doc_id in documents:
            if doc_id not in DOCUMENTS:
                return jsonify({'error': f'Invalid document: {doc_id}'}), 400
        
        log_operation(g.user_id, 'accept_documents', f'Accepted: {", ".join(documents)}')
        
        return jsonify({'message': 'Documents accepted'}), 200
    
    return _accept()

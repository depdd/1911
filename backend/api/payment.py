from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
import json
import hashlib
import secrets
from models import User, UserSubscription, Payment
from api.auth import jwt_required, log_operation, get_db_session, MEMBERSHIP_LIMITS

payment_bp = Blueprint('payment', __name__)

PRICING_PLANS = {
    'free': {
        'price': 0,
        'duration_months': 0,
        'en': {
            'name': 'Free',
            'features': ['1 Strategy', '1 Account', 'Basic Monitoring']
        },
        'zh': {
            'name': '免费版',
            'features': ['1个策略', '1个账户', '基础监控']
        }
    },
    'basic': {
        'price': 99,
        'duration_months': 1,
        'en': {
            'name': 'Basic',
            'features': ['3 Strategies', '3 Accounts', 'Advanced Analytics']
        },
        'zh': {
            'name': '基础版',
            'features': ['3个策略', '3个账户', '高级分析']
        }
    },
    'pro': {
        'price': 299,
        'duration_months': 1,
        'en': {
            'name': 'Professional',
            'features': ['10 Strategies', '10 Accounts', 'Real-time Alerts', 'API Access']
        },
        'zh': {
            'name': '专业版',
            'features': ['10个策略', '10个账户', '实时提醒', 'API访问']
        }
    },
    'enterprise': {
        'price': 999,
        'duration_months': 1,
        'en': {
            'name': 'Enterprise',
            'features': ['Unlimited Strategies', 'Unlimited Accounts', 'Priority Support', 'Custom Features']
        },
        'zh': {
            'name': '企业版',
            'features': ['无限策略', '无限账户', '优先支持', '定制功能']
        }
    }
}

def init_payment_blueprint(db_session_getter):
    global get_db_session
    get_db_session = db_session_getter
    return payment_bp

def generate_order_no() -> str:
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = secrets.token_hex(4)
    return f'ORD{timestamp}{random_str}'.upper()

@payment_bp.route('/plans', methods=['GET'])
def get_plans():
    lang = request.args.get('lang', 'en')
    return jsonify({
        'plans': [{
            'id': plan_id,
            'name': plan.get(lang, plan.get('en', {})).get('name', plan_id),
            'price': plan['price'],
            'duration_months': plan['duration_months'],
            'features': plan.get(lang, plan.get('en', {})).get('features', [])
        } for plan_id, plan in PRICING_PLANS.items()]
    }), 200

@payment_bp.route('/subscription', methods=['GET'])
@jwt_required
def get_subscription():
    user = g.current_user
    session = get_db_session()
    
    subscription = session.query(UserSubscription).filter_by(
        user_id=user.id,
        status='active'
    ).order_by(UserSubscription.created_at.desc()).first()
    
    if not subscription:
        return jsonify({
            'subscription': None,
            'current_plan': user.membership_level,
            'limits': MEMBERSHIP_LIMITS.get(user.membership_level, MEMBERSHIP_LIMITS['free'])
        }), 200
    
    return jsonify({
        'subscription': {
            'id': subscription.id,
            'plan': subscription.plan,
            'status': subscription.status,
            'start_at': subscription.start_at.isoformat(),
            'end_at': subscription.end_at.isoformat(),
            'auto_renew': subscription.auto_renew
        },
        'current_plan': user.membership_level,
        'limits': MEMBERSHIP_LIMITS.get(user.membership_level, MEMBERSHIP_LIMITS['free'])
    }), 200

@payment_bp.route('/create-order', methods=['POST'])
@jwt_required
def create_order():
    user = g.current_user
    data = request.get_json()
    
    plan = data.get('plan', '')
    payment_method = data.get('payment_method', 'alipay')
    
    if plan not in PRICING_PLANS:
        return jsonify({'error': 'Invalid plan'}), 400
    
    plan_info = PRICING_PLANS[plan]
    if plan_info['price'] == 0:
        return jsonify({'error': 'Cannot create order for free plan'}), 400
    
    session = get_db_session()
    
    order_no = generate_order_no()
    
    payment = Payment(
        user_id=user.id,
        order_no=order_no,
        payment_method=payment_method,
        amount=plan_info['price'],
        currency='CNY',
        status='pending',
        plan=plan,
        duration_months=plan_info['duration_months']
    )
    
    session.add(payment)
    session.commit()
    
    log_operation(user.id, 'create_order', f'Created order: {order_no} for plan: {plan}')
    
    payment_data = {}
    if payment_method == 'alipay':
        payment_data = {
            'qr_code': f'https://qr.alipay.com/mock_{order_no}',
            'pay_url': f'https://openapi.alipay.com/gateway.do?order={order_no}'
        }
    elif payment_method == 'wechat':
        payment_data = {
            'qr_code': f'weixin://wxpay/bizpayurl?pr=mock_{order_no}',
            'pay_url': f'https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?order={order_no}'
        }
    
    return jsonify({
        'message': 'Order created',
        'order': {
            'order_no': order_no,
            'amount': plan_info['price'],
            'currency': 'CNY',
            'plan': plan,
            'duration_months': plan_info['duration_months'],
            'status': 'pending',
            'payment_method': payment_method,
            'payment_data': payment_data,
            'created_at': payment.created_at.isoformat()
        }
    }), 201

@payment_bp.route('/orders', methods=['GET'])
@jwt_required
def get_orders():
    user = g.current_user
    session = get_db_session()
    
    payments = session.query(Payment).filter_by(user_id=user.id).order_by(Payment.created_at.desc()).all()
    
    return jsonify({
        'orders': [{
            'order_no': p.order_no,
            'amount': p.amount,
            'currency': p.currency,
            'plan': p.plan,
            'duration_months': p.duration_months,
            'status': p.status,
            'payment_method': p.payment_method,
            'paid_at': p.paid_at.isoformat() if p.paid_at else None,
            'created_at': p.created_at.isoformat()
        } for p in payments]
    }), 200

@payment_bp.route('/order/<order_no>', methods=['GET'])
@jwt_required
def get_order(order_no):
    user = g.current_user
    session = get_db_session()
    
    payment = session.query(Payment).filter_by(order_no=order_no, user_id=user.id).first()
    if not payment:
        return jsonify({'error': 'Order not found'}), 404
    
    return jsonify({
        'order': {
            'order_no': payment.order_no,
            'amount': payment.amount,
            'currency': payment.currency,
            'plan': payment.plan,
            'duration_months': payment.duration_months,
            'status': payment.status,
            'payment_method': payment.payment_method,
            'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
            'created_at': payment.created_at.isoformat()
        }
    }), 200

@payment_bp.route('/callback/alipay', methods=['POST'])
def alipay_callback():
    data = request.form.to_dict()
    
    order_no = data.get('out_trade_no', '')
    trade_status = data.get('trade_status', '')
    
    session = get_db_session()
    
    payment = session.query(Payment).filter_by(order_no=order_no).first()
    if not payment:
        return 'FAIL', 400
    
    if trade_status == 'TRADE_SUCCESS' or trade_status == 'TRADE_FINISHED':
        if payment.status == 'pending':
            payment.status = 'paid'
            payment.paid_at = datetime.utcnow()
            payment.payment_data = json.dumps(data)
            
            user = session.query(User).filter_by(id=payment.user_id).first()
            if user:
                user.membership_level = payment.plan
                user.membership_expire_at = datetime.utcnow() + timedelta(days=30 * payment.duration_months)
            
            subscription = UserSubscription(
                user_id=payment.user_id,
                plan=payment.plan,
                status='active',
                start_at=datetime.utcnow(),
                end_at=datetime.utcnow() + timedelta(days=30 * payment.duration_months),
                payment_id=payment.id
            )
            session.add(subscription)
            
            session.commit()
            
            log_operation(payment.user_id, 'payment_success', f'Payment successful: {order_no}')
    
    return 'SUCCESS', 200

@payment_bp.route('/callback/wechat', methods=['POST'])
def wechat_callback():
    data = request.get_json()
    
    order_no = data.get('out_trade_no', '')
    result_code = data.get('result_code', '')
    
    session = get_db_session()
    
    payment = session.query(Payment).filter_by(order_no=order_no).first()
    if not payment:
        return jsonify({'code': 'FAIL', 'message': 'Order not found'}), 400
    
    if result_code == 'SUCCESS':
        if payment.status == 'pending':
            payment.status = 'paid'
            payment.paid_at = datetime.utcnow()
            payment.payment_data = json.dumps(data)
            
            user = session.query(User).filter_by(id=payment.user_id).first()
            if user:
                user.membership_level = payment.plan
                user.membership_expire_at = datetime.utcnow() + timedelta(days=30 * payment.duration_months)
            
            subscription = UserSubscription(
                user_id=payment.user_id,
                plan=payment.plan,
                status='active',
                start_at=datetime.utcnow(),
                end_at=datetime.utcnow() + timedelta(days=30 * payment.duration_months),
                payment_id=payment.id
            )
            session.add(subscription)
            
            session.commit()
            
            log_operation(payment.user_id, 'payment_success', f'Payment successful: {order_no}')
    
    return jsonify({'code': 'SUCCESS', 'message': 'OK'}), 200

@payment_bp.route('/mock-payment/<order_no>', methods=['POST'])
@jwt_required
def mock_payment(order_no):
    user = g.current_user
    session = get_db_session()
    
    payment = session.query(Payment).filter_by(order_no=order_no, user_id=user.id).first()
    if not payment:
        return jsonify({'error': 'Order not found'}), 404
    
    if payment.status != 'pending':
        return jsonify({'error': 'Order is not pending'}), 400
    
    payment.status = 'paid'
    payment.paid_at = datetime.utcnow()
    
    db_user = session.query(User).filter_by(id=user.id).first()
    if db_user:
        db_user.membership_level = payment.plan
        db_user.membership_expire_at = datetime.utcnow() + timedelta(days=30 * payment.duration_months)
    
    subscription = UserSubscription(
        user_id=user.id,
        plan=payment.plan,
        status='active',
        start_at=datetime.utcnow(),
        end_at=datetime.utcnow() + timedelta(days=30 * payment.duration_months),
        payment_id=payment.id
    )
    session.add(subscription)
    
    session.commit()
    
    log_operation(user.id, 'mock_payment', f'Mock payment successful: {order_no}')
    
    return jsonify({
        'message': 'Payment successful (mock)',
        'subscription': {
            'plan': payment.plan,
            'end_at': db_user.membership_expire_at.isoformat() if db_user else None
        }
    }), 200

@payment_bp.route('/cancel-subscription', methods=['POST'])
@jwt_required
def cancel_subscription():
    user = g.current_user
    session = get_db_session()
    
    subscription = session.query(UserSubscription).filter_by(
        user_id=user.id,
        status='active'
    ).first()
    
    if not subscription:
        return jsonify({'error': 'No active subscription'}), 400
    
    subscription.auto_renew = False
    session.commit()
    
    log_operation(user.id, 'cancel_subscription', 'Cancelled auto-renew')
    
    return jsonify({'message': 'Auto-renew cancelled'}), 200

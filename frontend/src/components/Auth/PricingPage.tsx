import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { userAuthService } from '../../services/userAuthService'
import { useUser } from '../../contexts/UserContext'
import { useLanguage } from '../../contexts/LanguageContext'

const Container = styled.div`
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
`

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
`

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
  text-align: center;
  margin-bottom: 40px;
`

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
`

const PlanCard = styled.div<{ $featured?: boolean }>`
  background: ${props => props.$featured 
    ? `linear-gradient(135deg, ${props.theme.colors.primary}20, ${props.theme.colors.primary}10)`
    : props.theme.colors.backgroundLight};
  border: 2px solid ${props => props.$featured ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 16px;
  padding: 24px;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
`

const FeaturedBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.theme.colors.primary};
  color: white;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`

const PlanName = styled.h3`
  color: ${props => props.theme.colors.text};
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: center;
`

const PlanPrice = styled.div`
  text-align: center;
  margin-bottom: 20px;
`

const PriceAmount = styled.span`
  color: ${props => props.theme.colors.text};
  font-size: 36px;
  font-weight: 700;
`

const PricePeriod = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
`

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
`

const FeatureItem = styled.li`
  color: ${props => props.theme.colors.text};
  font-size: 13px;
  padding: 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:before {
    content: '✓';
    color: ${props => props.theme.colors.primary};
    font-weight: bold;
  }
`

const Button = styled.button<{ $primary?: boolean; $current?: boolean }>`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${props => props.$current ? 'default' : 'pointer'};
  transition: all 0.2s;
  
  ${props => props.$current ? `
    background: transparent;
    border: 1px solid ${props.theme.colors.border};
    color: ${props.theme.colors.textSecondary};
  ` : props.$primary ? `
    background: ${props.theme.colors.primary};
    border: none;
    color: white;
    
    &:hover {
      opacity: 0.9;
    }
  ` : `
    background: transparent;
    border: 1px solid ${props.theme.colors.border};
    color: ${props.theme.colors.text};
    
    &:hover {
      border-color: ${props.theme.colors.primary};
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CurrentPlanBadge = styled.span`
  color: ${props => props.theme.colors.primary};
  font-size: 12px;
  font-weight: 500;
`

const OrderHistory = styled.div`
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: 12px;
  padding: 24px;
`

const OrderTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
`

const OrderTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const OrderTh = styled.th`
  text-align: left;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 500;
  padding: 12px 8px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`

const OrderTd = styled.td`
  color: ${props => props.theme.colors.text};
  font-size: 13px;
  padding: 12px 8px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`

const StatusBadge = styled.span<{ $status: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'paid': return '#22c55e20'
      case 'pending': return '#f59e0b20'
      default: return '#6b728020'
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'paid': return '#22c55e'
      case 'pending': return '#f59e0b'
      default: return '#6b7280'
    }
  }};
`

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const ModalContent = styled.div`
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
`

const ModalTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  font-size: 18px;
  margin-bottom: 20px;
`

const FormGroup = styled.div`
  margin-bottom: 16px;
`

const Label = styled.label`
  display: block;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  margin-bottom: 8px;
`

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`

const QRCode = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  margin: 20px 0;
  
  p {
    color: ${props => props.theme.colors.textSecondary};
    font-size: 12px;
    margin-top: 12px;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`

interface Plan {
  id: string
  name: string
  price: number
  duration_months: number
  features: string[]
}

interface Order {
  order_no: string
  amount: number
  currency: string
  plan: string
  duration_months: number
  status: string
  payment_method: string
  paid_at: string | null
  created_at: string
}

const PricingPage: React.FC = () => {
  const { user, refreshUser, refreshSubscription } = useUser()
  const { t } = useLanguage()
  const [plans, setPlans] = useState<Plan[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('alipay')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [plansData, ordersData] = await Promise.all([
      userAuthService.getPlans(),
      userAuthService.getOrders(),
    ])
    setPlans(plansData)
    setOrders(ordersData)
  }

  const handleSelectPlan = (plan: Plan) => {
    if (plan.id === user?.membership_level) return
    if (plan.price === 0) return
    
    setSelectedPlan(plan)
    setShowPaymentModal(true)
  }

  const handleCreateOrder = async () => {
    if (!selectedPlan) return
    
    setPaymentLoading(true)
    const result = await userAuthService.createOrder(selectedPlan.id, paymentMethod)
    
    if (result.success && result.data) {
      setCurrentOrder(result.data)
    }
    
    setPaymentLoading(false)
  }

  const handleMockPayment = async () => {
    if (!currentOrder) return
    
    setPaymentLoading(true)
    const result = await userAuthService.mockPayment(currentOrder.order_no)
    
    if (result.success) {
      setShowPaymentModal(false)
      setCurrentOrder(null)
      await refreshUser()
      await refreshSubscription()
      loadData()
      alert('Payment successful! Your membership has been upgraded.')
    }
    
    setPaymentLoading(false)
  }

  const getPlanName = (planId: string) => {
    const planNames: Record<string, string> = {
      free: t('pricing.planFree'),
      basic: t('pricing.planBasic'),
      pro: t('pricing.planPro'),
      enterprise: t('pricing.planEnterprise'),
    }
    return planNames[planId] || planId
  }

  return (
    <Container>
      <Title>{t('pricing.title')}</Title>
      <Subtitle>{t('pricing.subtitle')}</Subtitle>
      
      <PlansGrid>
        {plans.map((plan) => {
          const isCurrent = user?.membership_level === plan.id
          const isFeatured = plan.id === 'pro'
          
          return (
            <PlanCard key={plan.id} $featured={isFeatured}>
              {isFeatured && <FeaturedBadge>{t('pricing.mostPopular')}</FeaturedBadge>}
              <PlanName>{plan.name}</PlanName>
              <PlanPrice>
                <PriceAmount>¥{plan.price}</PriceAmount>
                {plan.price > 0 && <PricePeriod>{t('pricing.perMonth')}</PricePeriod>}
              </PlanPrice>
              <FeatureList>
                {plan.features.map((feature, index) => (
                  <FeatureItem key={index}>{feature}</FeatureItem>
                ))}
              </FeatureList>
              <Button
                $primary={!isCurrent && plan.price > 0}
                $current={isCurrent}
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrent || plan.price === 0}
              >
                {isCurrent ? (
                  <CurrentPlanBadge>{t('pricing.currentPlan')}</CurrentPlanBadge>
                ) : plan.price === 0 ? (
                  t('pricing.free')
                ) : (
                  t('pricing.upgrade')
                )}
              </Button>
            </PlanCard>
          )
        })}
      </PlansGrid>
      
      <OrderHistory>
        <OrderTitle>{t('pricing.orderHistory')}</OrderTitle>
        {orders.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>
            {t('pricing.noOrders')}
          </div>
        ) : (
          <OrderTable>
            <thead>
              <tr>
                <OrderTh>{t('pricing.orderNo')}</OrderTh>
                <OrderTh>{t('pricing.plan')}</OrderTh>
                <OrderTh>{t('pricing.amount')}</OrderTh>
                <OrderTh>{t('pricing.status')}</OrderTh>
                <OrderTh>{t('pricing.date')}</OrderTh>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.order_no}>
                  <OrderTd>{order.order_no}</OrderTd>
                  <OrderTd>{getPlanName(order.plan)}</OrderTd>
                  <OrderTd>¥{order.amount}</OrderTd>
                  <OrderTd>
                    <StatusBadge $status={order.status}>
                      {order.status.toUpperCase()}
                    </StatusBadge>
                  </OrderTd>
                  <OrderTd>{new Date(order.created_at).toLocaleDateString()}</OrderTd>
                </tr>
              ))}
            </tbody>
          </OrderTable>
        )}
      </OrderHistory>
      
      {showPaymentModal && selectedPlan && (
        <Modal onClick={() => !currentOrder && setShowPaymentModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              {currentOrder ? t('pricing.completePayment') : t('pricing.upgradeTo').replace('{{plan}}', selectedPlan.name)}
            </ModalTitle>
            
            {!currentOrder ? (
              <>
                <FormGroup>
                  <Label>{t('pricing.paymentMethod')}</Label>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="alipay">{t('pricing.alipay')}</option>
                    <option value="wechat">{t('pricing.wechatPay')}</option>
                  </Select>
                </FormGroup>
                
                <div style={{ 
                  background: '#f5f7fa', 
                  borderRadius: 8, 
                  padding: 16, 
                  marginBottom: 16 
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: 8 
                  }}>
                    <span style={{ color: '#6b7280' }}>{t('pricing.plan')}</span>
                    <span style={{ color: '#1f2937' }}>{selectedPlan.name}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: 8 
                  }}>
                    <span style={{ color: '#6b7280' }}>{t('pricing.duration')}</span>
                    <span style={{ color: '#1f2937' }}>{selectedPlan.duration_months} {t('pricing.months')}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontWeight: 600,
                    fontSize: 16
                  }}>
                    <span style={{ color: '#1f2937' }}>{t('pricing.total')}</span>
                    <span style={{ color: '#0066cc' }}>¥{selectedPlan.price}</span>
                  </div>
                </div>
                
                <ButtonGroup>
                  <Button 
                    style={{ flex: 1 }} 
                    onClick={() => setShowPaymentModal(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    $primary 
                    style={{ flex: 1 }} 
                    onClick={handleCreateOrder}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? t('pricing.processing') : t('pricing.payNow')}
                  </Button>
                </ButtonGroup>
              </>
            ) : (
              <>
                <QRCode>
                  <div style={{ fontSize: 48 }}>📱</div>
                  <p>{t('pricing.scanQRCode')}</p>
                  <p style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>
                    {t('pricing.order')}: {currentOrder.order_no}
                  </p>
                </QRCode>
                
                <div style={{ 
                  background: '#f59e0b20', 
                  borderRadius: 8, 
                  padding: 12, 
                  marginBottom: 16,
                  color: '#f59e0b',
                  fontSize: 12
                }}>
                  {t('pricing.demoNote')}
                </div>
                
                <ButtonGroup>
                  <Button 
                    style={{ flex: 1 }} 
                    onClick={() => {
                      setShowPaymentModal(false)
                      setCurrentOrder(null)
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    $primary 
                    style={{ flex: 1 }} 
                    onClick={handleMockPayment}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? t('pricing.processing') : t('pricing.mockPayment')}
                  </Button>
                </ButtonGroup>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </Container>
  )
}

export default PricingPage

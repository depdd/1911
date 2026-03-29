import React, { useState, useEffect, useCallback } from 'react'
import { Card, Alert, Badge, Spin, Empty, Space, Typography, Button, Tag, Switch, App } from 'antd'
import { 
  ExclamationCircleOutlined, 
  InfoCircleOutlined,
  CloseCircleOutlined,
  BellOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons'
import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { apiClient } from '../../services/userAuthService'
import { useUser } from '../../contexts/UserContext'

const { Title, Text } = Typography

interface RiskAlert {
  id: string
  type: string
  level: 'critical' | 'warning' | 'info'
  message: string
  value?: number
  threshold?: number
  timestamp: string
  account_id?: number
  account_name?: string
  strategy_id?: number
}

interface AlertSettings {
  daily_loss_warning: boolean
  daily_loss_critical: boolean
  drawdown_warning: boolean
  drawdown_critical: boolean
  trade_frequency: boolean
  strategy_drawdown: boolean
}

const AlertsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const AlertCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  
  .ant-card-head {
    background: transparent;
    border-bottom: 1px solid ${theme.colors.border};
    
    .ant-card-head-title {
      color: ${theme.colors.text};
      font-weight: ${theme.typography.fontWeight.semibold};
    }
  }
  
  .ant-card-body {
    padding: 16px;
  }
`

const AlertItem = styled.div<{ $level: string }>`
  padding: 16px;
  border-radius: 8px;
  background: ${props => {
    switch (props.$level) {
      case 'critical': return 'rgba(239, 68, 68, 0.15)'
      case 'warning': return 'rgba(245, 158, 11, 0.15)'
      default: return 'rgba(59, 130, 246, 0.15)'
    }
  }};
  border-left: 4px solid ${props => {
    switch (props.$level) {
      case 'critical': return theme.colors.error
      case 'warning': return '#f59e0b'
      default: return theme.colors.primary
    }
  }};
  margin-bottom: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(4px);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`

const AlertHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

const AlertLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const AlertIcon = styled.span<{ $level: string }>`
  font-size: 20px;
  color: ${props => {
    switch (props.$level) {
      case 'critical': return theme.colors.error
      case 'warning': return '#f59e0b'
      default: return theme.colors.primary
    }
  }};
`

const AlertTitle = styled.span`
  color: ${theme.colors.text};
  font-weight: ${theme.typography.fontWeight.semibold};
  font-size: 15px;
`

const AlertMessage = styled.div`
  color: ${theme.colors.textSecondary};
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 12px;
`

const AlertMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
`

const AlertValue = styled.span`
  color: ${theme.colors.text};
  font-size: 13px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
`

const AlertTime = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: 12px;
  margin-left: auto;
`

const SettingsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`

const SettingLabel = styled.div`
  color: ${theme.colors.text};
  font-size: 14px;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`

const StatsRow = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
`

const StatCard = styled.div`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  padding: 16px 24px;
  flex: 1;
`

const StatValue = styled.div<{ $color?: string }>`
  font-size: 28px;
  font-weight: 600;
  color: ${props => props.$color || theme.colors.text};
`

const StatLabel = styled.div`
  color: ${theme.colors.textSecondary};
  font-size: 13px;
  margin-top: 4px;
`

const AlertsPage: React.FC = () => {
  const { isAuthenticated } = useUser()
  const { message } = App.useApp()
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<AlertSettings>({
    daily_loss_warning: true,
    daily_loss_critical: true,
    drawdown_warning: true,
    drawdown_critical: true,
    trade_frequency: true,
    strategy_drawdown: true
  })

  const loadAlerts = useCallback(async () => {
    if (!isAuthenticated) {
      setError('请先登录')
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get('/api/risk/alerts')
      const alertData = response.data.alerts || []
      
      const alertsWithTimestamp = alertData.map((alert: any, index: number) => ({
        ...alert,
        id: alert.id || `alert-${index}-${Date.now()}`,
        timestamp: alert.timestamp || new Date().toISOString()
      }))
      
      setAlerts(alertsWithTimestamp)
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('实时告警功能需要专业版或企业版会员')
      } else if (err.response?.status === 401) {
        setError('请先登录')
      } else {
        setError('加载告警信息失败')
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [loadAlerts])

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <CloseCircleOutlined />
      case 'warning':
        return <ExclamationCircleOutlined />
      default:
        return <InfoCircleOutlined />
    }
  }

  const getAlertTitle = (type: string) => {
    switch (type) {
      case 'daily_loss':
        return '每日亏损告警'
      case 'drawdown':
        return '回撤告警'
      case 'position_risk':
        return '持仓风险告警'
      case 'trade_frequency':
        return '交易频率告警'
      case 'strategy_drawdown':
        return '策略回撤告警'
      default:
        return '风险告警'
    }
  }

  const getAlertTag = (level: string) => {
    switch (level) {
      case 'critical':
        return <Tag color="error">严重</Tag>
      case 'warning':
        return <Tag color="warning">警告</Tag>
      default:
        return <Tag color="processing">提示</Tag>
    }
  }

  const handleSettingChange = (key: keyof AlertSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    message.success('设置已更新')
  }

  const criticalCount = alerts.filter(a => a.level === 'critical').length
  const warningCount = alerts.filter(a => a.level === 'warning').length
  const infoCount = alerts.filter(a => a.level === 'info').length

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Alert
          message="请先登录"
          description="登录后即可查看实时告警信息"
          type="info"
          showIcon
          action={
            <Button type="primary" onClick={() => window.location.href = '/login'}>
              去登录
            </Button>
          }
        />
      </div>
    )
  }

  if (loading && alerts.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Alert
          message="功能不可用"
          description={error}
          type="warning"
          showIcon
          action={
            <Space>
              <Button onClick={loadAlerts}>
                重试
              </Button>
              {error.includes('专业版') && (
                <Button 
                  type="primary"
                  onClick={() => window.location.href = '/pricing'}
                >
                  升级会员
                </Button>
              )}
            </Space>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <HeaderRow>
        <div>
          <Title level={2} style={{ color: theme.colors.text, margin: 0 }}>
            <BellOutlined style={{ marginRight: 12 }} />
            实时告警
          </Title>
          <Text style={{ color: theme.colors.textSecondary }}>
            监控账户风险，及时预警
          </Text>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadAlerts}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </HeaderRow>

      <StatsRow>
        <StatCard>
          <StatValue $color={criticalCount > 0 ? theme.colors.error : theme.colors.text}>
            {criticalCount}
          </StatValue>
          <StatLabel>严重告警</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue $color={warningCount > 0 ? '#f59e0b' : theme.colors.text}>
            {warningCount}
          </StatValue>
          <StatLabel>警告</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{infoCount}</StatValue>
          <StatLabel>提示</StatLabel>
        </StatCard>
      </StatsRow>

      <AlertsContainer>
        {alerts.length === 0 ? (
          <AlertCard>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ color: theme.colors.textSecondary }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: theme.colors.text }}>
                    暂无风险告警
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '8px' }}>
                    系统运行正常，未检测到风险
                  </div>
                </div>
              }
            />
          </AlertCard>
        ) : (
          <AlertCard 
            title={
              <Space>
                <span>风险告警列表</span>
                {criticalCount > 0 && (
                  <Badge count={criticalCount} style={{ backgroundColor: theme.colors.error }} />
                )}
              </Space>
            }
          >
            {alerts.map((alert) => (
              <AlertItem key={alert.id} $level={alert.level}>
                <AlertHeader>
                  <AlertLeft>
                    <AlertIcon $level={alert.level}>
                      {getAlertIcon(alert.level)}
                    </AlertIcon>
                    <AlertTitle>{getAlertTitle(alert.type)}</AlertTitle>
                  </AlertLeft>
                  {getAlertTag(alert.level)}
                </AlertHeader>
                <AlertMessage>{alert.message}</AlertMessage>
                <AlertMeta>
                  {alert.value !== undefined && (
                    <AlertValue>当前值: {alert.value.toFixed(2)}%</AlertValue>
                  )}
                  {alert.threshold !== undefined && (
                    <AlertValue>阈值: {alert.threshold}%</AlertValue>
                  )}
                  {alert.account_name && (
                    <AlertValue>账户: {alert.account_name}</AlertValue>
                  )}
                  <AlertTime>
                    {new Date(alert.timestamp).toLocaleString('zh-CN')}
                  </AlertTime>
                </AlertMeta>
              </AlertItem>
            ))}
          </AlertCard>
        )}

        <AlertCard title={<Space><SettingOutlined /> 告警设置</Space>}>
          <SettingsRow>
            <SettingLabel>每日亏损警告（5%）</SettingLabel>
            <Switch 
              checked={settings.daily_loss_warning}
              onChange={(v) => handleSettingChange('daily_loss_warning', v)}
            />
          </SettingsRow>
          <SettingsRow>
            <SettingLabel>每日亏损严重告警（8%）</SettingLabel>
            <Switch 
              checked={settings.daily_loss_critical}
              onChange={(v) => handleSettingChange('daily_loss_critical', v)}
            />
          </SettingsRow>
          <SettingsRow>
            <SettingLabel>回撤警告（10%）</SettingLabel>
            <Switch 
              checked={settings.drawdown_warning}
              onChange={(v) => handleSettingChange('drawdown_warning', v)}
            />
          </SettingsRow>
          <SettingsRow>
            <SettingLabel>回撤严重告警（15%）</SettingLabel>
            <Switch 
              checked={settings.drawdown_critical}
              onChange={(v) => handleSettingChange('drawdown_critical', v)}
            />
          </SettingsRow>
          <SettingsRow>
            <SettingLabel>交易频率告警</SettingLabel>
            <Switch 
              checked={settings.trade_frequency}
              onChange={(v) => handleSettingChange('trade_frequency', v)}
            />
          </SettingsRow>
          <SettingsRow>
            <SettingLabel>策略回撤告警</SettingLabel>
            <Switch 
              checked={settings.strategy_drawdown}
              onChange={(v) => handleSettingChange('strategy_drawdown', v)}
            />
          </SettingsRow>
        </AlertCard>
      </AlertsContainer>
    </div>
  )
}

export default AlertsPage

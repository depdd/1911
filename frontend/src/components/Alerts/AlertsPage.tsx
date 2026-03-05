import React, { useState, useEffect } from 'react'
import { Card, Alert, Badge, Spin, Empty, Space, Typography } from 'antd'
import { 
  ExclamationCircleOutlined, 
  InfoCircleOutlined,
  CloseCircleOutlined 
} from '@ant-design/icons'
import styled from 'styled-components'
import axios from 'axios'
import { theme } from '../../styles/theme'

const { Title } = Typography

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000,
})

interface RiskAlert {
  id: string
  type: string
  level: 'critical' | 'warning' | 'info'
  message: string
  value?: number
  threshold?: number
  timestamp: string
}

const AlertsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  padding: 12px 16px;
  border-radius: 8px;
  background: ${props => {
    switch (props.$level) {
      case 'critical': return 'rgba(239, 68, 68, 0.1)'
      case 'warning': return 'rgba(245, 158, 11, 0.1)'
      default: return 'rgba(59, 130, 246, 0.1)'
    }
  }};
  border-left: 4px solid ${props => {
    switch (props.$level) {
      case 'critical': return theme.colors.error
      case 'warning': return '#f59e0b'
      default: return theme.colors.primary
    }
  }};
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`

const AlertHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const AlertIcon = styled.span<{ $level: string }>`
  font-size: 18px;
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
  font-size: 14px;
`

const AlertMessage = styled.div`
  color: ${theme.colors.textSecondary};
  font-size: 13px;
  line-height: 1.5;
`

const AlertMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`

const AlertValue = styled.span`
  color: ${theme.colors.text};
  font-size: 12px;
`

const AlertThreshold = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: 12px;
`

const AlertTime = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: 12px;
  margin-left: auto;
`

const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAlerts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get('/api/risk/alerts')
      setAlerts(response.data.alerts || [])
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('实时告警功能需要专业版或企业版会员')
      } else {
        setError('加载告警信息失败')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

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
      default:
        return '风险告警'
    }
  }

  if (loading) {
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
              <button 
                onClick={() => window.location.href = '/pricing'}
                style={{
                  background: theme.colors.primary,
                  color: 'white',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                升级会员
              </button>
            </Space>
          }
        />
      </div>
    )
  }

  const hasCritical = alerts.some(a => a.level === 'critical')

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ color: theme.colors.text, margin: 0 }}>
          实时告警
        </Title>
        {hasCritical && (
          <Badge 
            count={alerts.filter(a => a.level === 'critical').length}
            style={{ marginLeft: '12px', backgroundColor: theme.colors.error }}
          >
            <span style={{ color: theme.colors.textSecondary, fontSize: '14px' }}>
              {alerts.length} 条告警
            </span>
          </Badge>
        )}
      </div>

      <AlertsContainer>
        {alerts.length === 0 ? (
          <AlertCard>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ color: theme.colors.textSecondary }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                  <div>暂无风险告警</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    系统运行正常，未检测到风险
                  </div>
                </div>
              }
            />
          </AlertCard>
        ) : (
          <AlertCard title="风险告警列表">
            {alerts.map((alert, index) => (
              <AlertItem key={index} $level={alert.level}>
                <AlertHeader>
                  <AlertIcon $level={alert.level}>
                    {getAlertIcon(alert.level)}
                  </AlertIcon>
                  <AlertTitle>{getAlertTitle(alert.type)}</AlertTitle>
                </AlertHeader>
                <AlertMessage>{alert.message}</AlertMessage>
                {alert.value !== undefined && alert.threshold !== undefined && (
                  <AlertMeta>
                    <AlertValue>
                      当前值: {alert.value.toFixed(2)}%
                    </AlertValue>
                    <AlertThreshold>
                      阈值: {alert.threshold}%
                    </AlertThreshold>
                    <AlertTime>
                      {new Date(alert.timestamp).toLocaleString('zh-CN')}
                    </AlertTime>
                  </AlertMeta>
                )}
              </AlertItem>
            ))}
          </AlertCard>
        )}
      </AlertsContainer>
    </div>
  )
}

export default AlertsPage

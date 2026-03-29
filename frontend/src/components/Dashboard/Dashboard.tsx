import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Row, Col, Card, Statistic, Typography, Space, Button, Table, Tag } from 'antd'
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  PieChartOutlined,
  BarChartOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import styled from 'styled-components'

import { useUser } from '../../contexts/UserContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { Position, Account } from '../../types'
import { accountService } from '../../services/accountService'
import EquityChart from './EquityChart'
import QuickTradePanel from './QuickTradePanel'

const { Title, Text } = Typography

const DashboardContainer = styled.div`
  padding: 0;
  animation: fadeIn 0.5s ease-out;
`

const DashboardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`

const StatCard = styled(Card)<{ $border: string; $bgColor: string }>`
  background: ${props => props.$bgColor};
  border: 1px solid ${props => props.$border};
  backdrop-filter: blur(10px);
  border-radius: 12px;
  height: 100%;
  
  .ant-card-body {
    padding: 20px;
  }
  
  .ant-statistic-title {
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .ant-statistic-content {
    font-size: 24px;
    font-weight: 600;
  }
`

const PositionsCard = styled(Card)<{ $border: string; $bgColor: string }>`
  background: ${props => props.$bgColor};
  border: 1px solid ${props => props.$border};
  backdrop-filter: blur(10px);
  border-radius: 12px;
  
  .ant-card-head {
    background: transparent;
    border-bottom: 1px solid ${props => props.$border};
  }
`

const Dashboard: React.FC = () => {
  const { mt5Accounts, user } = useUser()
  const { isConnected, messages, subscribe, unsubscribe } = useWebSocket()
  const { theme } = useTheme()
  const { t } = useLanguage()
  const [positions, setPositions] = useState<Position[]>([])
  const [accountData, setAccountData] = useState<Account | null>(null)

  useEffect(() => {
    console.log('Dashboard - mt5Accounts:', mt5Accounts)
    console.log('Dashboard - user:', user)
  }, [mt5Accounts, user])

  useEffect(() => {
    if (isConnected && mt5Accounts.length > 0) {
      console.log('Dashboard - WebSocket已连接，准备订阅账户和持仓频道')
      subscribe('account')
      subscribe('positions')
      console.log('Dashboard - 已订阅账户和持仓更新')
    } else {
      console.log('Dashboard - 等待连接:', { isConnected, mt5AccountsCount: mt5Accounts.length })
    }
    return () => {
      if (isConnected) {
        unsubscribe('account')
        unsubscribe('positions')
      }
    }
  }, [isConnected, mt5Accounts, subscribe, unsubscribe])

  useEffect(() => {
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage) return

    if (latestMessage.type === 'account_update') {
      console.log('Dashboard - 收到账户更新:', latestMessage.data)
      if (latestMessage.data) {
        setAccountData({
          balance: latestMessage.data.balance || 0,
          equity: latestMessage.data.equity || 0,
          margin: latestMessage.data.margin || 0,
          freeMargin: latestMessage.data.free_margin || 0,
          marginLevel: latestMessage.data.margin_level || 0,
        } as Account)
      }
    }

    if (latestMessage.type === 'position_update') {
      console.log('Dashboard - 收到持仓更新:', latestMessage.data)
      if (latestMessage.data?.positions) {
        setPositions(latestMessage.data.positions)
      }
    }
  }, [messages])

  const loadAccountData = useCallback(async () => {
    if (mt5Accounts.length === 0) return

    try {
      const positionsResponse = await accountService.getPositions()
      const positionsData = positionsResponse.data?.positions || []
      setPositions(positionsData)
      
      const summaryResponse = await accountService.getAccountSummary()

      if (summaryResponse.success && summaryResponse.data) {
        setAccountData({
          balance: summaryResponse.data.balance || 0,
          equity: summaryResponse.data.equity || 0,
          margin: summaryResponse.data.margin || 0,
          freeMargin: summaryResponse.data.freeMargin || 0,
          marginLevel: summaryResponse.data.marginLevel || 0,
        } as Account)
      }
    } catch (error) {
      console.error('Failed to load account data:', error)
    }
  }, [mt5Accounts])

  const processingTimerRef = useRef<number | null>(null)
  
  useEffect(() => {
    if (mt5Accounts.length > 0) {
      loadAccountData()
    }
    
    return () => {
      if (processingTimerRef.current) {
        window.clearTimeout(processingTimerRef.current)
      }
    }
  }, [mt5Accounts, loadAccountData])

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return theme.colors.success
    if (profit < 0) return theme.colors.error
    return theme.colors.textSecondary
  }

  const columns = [
    {
      title: t('dashboard.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      render: (symbol: string) => (
        <Text strong style={{ color: theme.colors.primary }}>
          {symbol}
        </Text>
      ),
    },
    {
      title: t('trading.orderType'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'buy' ? 'green' : 'red'}>
          {type === 'buy' ? t('trading.buy') : t('trading.sell')}
        </Tag>
      ),
    },
    {
      title: t('dashboard.lots'),
      dataIndex: 'volume',
      key: 'volume',
      render: (volume: number) => (volume !== undefined && volume !== null ? volume.toFixed(2) : '0.00'),
    },
    {
      title: t('dashboard.openPrice'),
      dataIndex: 'openPrice',
      key: 'openPrice',
      render: (price: number) => (price !== undefined && price !== null ? price.toFixed(5) : '0.00000'),
    },
    {
      title: t('dashboard.currentPrice'),
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      render: (price: number) => (price !== undefined && price !== null ? price.toFixed(5) : '0.00000'),
    },
    {
      title: t('common.profit'),
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number) => (
        <Text strong style={{ color: getProfitColor(profit || 0) }}>
          {(profit || 0) >= 0 ? '+' : ''}{formatCurrency(profit || 0, accountData?.currency)}
        </Text>
      ),
    },
  ]

  const totalProfit = positions.reduce((sum, pos) => sum + (pos.profit || 0), 0)
  const totalVolume = positions.reduce((sum, pos) => sum + (pos.volume || 0), 0)

  if (mt5Accounts.length === 0) {
    return (
      <DashboardContainer>
        <DashboardHeader>
          <Title level={2} style={{ color: theme.colors.text, margin: 0 }}>
            {t('dashboard.title')}
          </Title>
        </DashboardHeader>
        
        <Card style={{ 
          textAlign: 'center', 
          padding: '60px 40px',
          background: `${theme.colors.backgroundLight}cc`,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔗</div>
          <Title level={3} style={{ color: theme.colors.text, marginBottom: '16px' }}>
            连接您的MT5账户
          </Title>
          <Text style={{ color: theme.colors.textSecondary, fontSize: '16px', display: 'block', marginBottom: '24px' }}>
            要查看交易数据和账户信息，请先连接您的MetaTrader 5账户。
          </Text>
          <Button 
            type="primary" 
            size="large"
            onClick={() => window.location.href = '/user-center'}
            style={{ background: theme.colors.primary, borderColor: theme.colors.primary }}
          >
            前往添加MT5账户
          </Button>
        </Card>
      </DashboardContainer>
    )
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title level={2} style={{ color: theme.colors.text, margin: 0 }}>
          {t('dashboard.title')}
        </Title>
        <Space>
          <Button
            icon={<SyncOutlined />}
            onClick={loadAccountData}
            style={{ color: theme.colors.textSecondary }}
          >
            {t('common.loading')}
          </Button>
        </Space>
      </DashboardHeader>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard $border={theme.colors.border} $bgColor={`${theme.colors.backgroundLight}cc`}>
            <Statistic
              title={t('dashboard.balance')}
              value={accountData?.balance || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<DollarOutlined style={{ color: theme.colors.primary }} />}
              suffix={accountData?.currency}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard $border={theme.colors.border} $bgColor={`${theme.colors.backgroundLight}cc`}>
            <Statistic
              title={t('dashboard.equity')}
              value={accountData?.equity || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<RiseOutlined style={{ color: theme.colors.success }} />}
              suffix={accountData?.currency}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard $border={theme.colors.border} $bgColor={`${theme.colors.backgroundLight}cc`}>
            <Statistic
              title={t('dashboard.freeMargin')}
              value={accountData?.freeMargin || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<PieChartOutlined style={{ color: theme.colors.warning }} />}
              suffix={accountData?.currency}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard $border={theme.colors.border} $bgColor={`${theme.colors.backgroundLight}cc`}>
            <Statistic
              title={t('dashboard.marginLevel')}
              value={accountData?.marginLevel || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<BarChartOutlined style={{ color: theme.colors.info }} />}
              suffix="%"
            />
          </StatCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <StatCard $border={theme.colors.border} $bgColor={`${theme.colors.backgroundLight}cc`}>
            <Statistic
              title={t('dashboard.positions')}
              value={positions.length}
              valueStyle={{ color: theme.colors.text }}
              prefix={<RiseOutlined style={{ color: theme.colors.primary }} />}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <StatCard $border={theme.colors.border} $bgColor={`${theme.colors.backgroundLight}cc`}>
            <Statistic
              title={t('dashboard.lots')}
              value={totalVolume}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<PieChartOutlined style={{ color: theme.colors.secondary }} />}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <StatCard $border={theme.colors.border} $bgColor={`${theme.colors.backgroundLight}cc`}>
            <Statistic
              title={t('dashboard.profit')}
              value={totalProfit}
              precision={2}
              valueStyle={{ color: getProfitColor(totalProfit) }}
              prefix={
                totalProfit >= 0 ? (
                  <RiseOutlined style={{ color: theme.colors.success }} />
                ) : (
                  <FallOutlined style={{ color: theme.colors.error }} />
                )
              }
              suffix={accountData?.currency}
            />
          </StatCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={t('dashboard.equityCurve')}
            style={{
              background: `${theme.colors.backgroundLight}cc`,
              border: `1px solid ${theme.colors.border}`,
              backdropFilter: 'blur(10px)',
              borderRadius: 12,
            }}
            headStyle={{ color: theme.colors.text }}
          >
            <EquityChart />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <QuickTradePanel />
        </Col>
      </Row>

      <PositionsCard 
        title={`${t('dashboard.positions')} (${positions.length})`}
        $border={theme.colors.border}
        $bgColor={`${theme.colors.backgroundLight}cc`}
        headStyle={{ color: theme.colors.text }}
      >
        <Table
          columns={columns}
          dataSource={positions}
          rowKey="ticket"
          pagination={false}
          scroll={{ x: 'max-content' }}
          style={{ background: 'transparent' }}
        />
      </PositionsCard>
    </DashboardContainer>
  )
}

export default Dashboard

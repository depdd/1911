import React, { useState, useEffect } from 'react'
import { Typography, Card, Row, Col, Statistic, DatePicker, Space } from 'antd'
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import styled from 'styled-components'

import { accountService } from '../../services/accountService'
import { theme } from '../../styles/theme'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const Container = styled.div`
  padding: 24px;
`

const AnalyticsCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  height: 100%;
  
  .ant-card-head {
    background: transparent;
    border-bottom: 1px solid ${theme.colors.border};
    
    .ant-card-head-title {
      color: ${theme.colors.text};
      font-weight: ${theme.typography.fontWeight.semibold};
    }
  }
`

const StatCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  height: 100%;
  
  .ant-statistic-title {
    color: ${theme.colors.textSecondary};
    font-size: ${theme.typography.fontSize.sm};
  }
  
  .ant-statistic-content {
    color: ${theme.colors.text};
    font-size: ${theme.typography.fontSize.lg};
    font-weight: ${theme.typography.fontWeight.semibold};
  }
`

const Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[any, any] | null>(null)

  const loadAnalytics = async (days: number = 30) => {
    setIsLoading(true)
    try {
      const response = await accountService.getTradingStats(days)
      if (response.success) {
        setAnalyticsData(response.data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates)
    if (dates && dates[0] && dates[1]) {
      const days = Math.ceil((dates[1].valueOf() - dates[0].valueOf()) / (1000 * 60 * 60 * 24))
      loadAnalytics(Number(days))
    }
  }

  return (
    <Container>
      <Title level={2} style={{ color: theme.colors.text, marginBottom: 24 }}>
        数据分析
      </Title>

      <Space style={{ marginBottom: 24 }}>
        <Text style={{ color: theme.colors.textSecondary }}>时间范围:</Text>
        <RangePicker
          onChange={handleDateRangeChange}
          value={dateRange}
          style={{ background: 'rgba(26, 31, 58, 0.8)', borderColor: theme.colors.border }}
        />
      </Space>

      {/* 核心指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard loading={isLoading}>
            <Statistic
              title="总盈亏"
              value={analyticsData?.total_profit || 0}
              precision={2}
              valueStyle={{
                color: (analyticsData?.total_profit || 0) >= 0 
                  ? theme.colors.success 
                  : theme.colors.error
              }}
              prefix={<DollarOutlined />}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard loading={isLoading}>
            <Statistic
              title="胜率"
              value={analyticsData?.win_rate || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<RiseOutlined />}
              suffix="%"
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard loading={isLoading}>
            <Statistic
              title="盈亏比"
              value={analyticsData?.profit_factor || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<PieChartOutlined />}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard loading={isLoading}>
            <Statistic
              title="最大回撤"
              value={analyticsData?.max_drawdown || 0}
              precision={2}
              valueStyle={{ color: theme.colors.error }}
              prefix={<FallOutlined />}
              suffix="%"
            />
          </StatCard>
        </Col>
      </Row>

      {/* 交易统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard loading={isLoading}>
            <Statistic
              title="总交易次数"
              value={analyticsData?.total_trades || 0}
              precision={0}
              valueStyle={{ color: theme.colors.text }}
              prefix={<BarChartOutlined />}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard loading={isLoading}>
            <Statistic
              title="盈利交易"
              value={analyticsData?.winning_trades || 0}
              precision={0}
              valueStyle={{ color: theme.colors.success }}
              prefix={<RiseOutlined />}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard loading={isLoading}>
            <Statistic
              title="亏损交易"
              value={analyticsData?.losing_trades || 0}
              precision={0}
              valueStyle={{ color: theme.colors.error }}
              prefix={<FallOutlined />}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard loading={isLoading}>
            <Statistic
              title="夏普比率"
              value={analyticsData?.sharpe_ratio || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<LineChartOutlined />}
            />
          </StatCard>
        </Col>
      </Row>

      {/* 图表分析 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <AnalyticsCard title="盈亏分析">
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                盈亏分析图表开发中...
              </Text>
            </div>
          </AnalyticsCard>
        </Col>
        <Col xs={24} lg={12}>
          <AnalyticsCard title="交易分布">
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                交易分布图表开发中...
              </Text>
            </div>
          </AnalyticsCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <AnalyticsCard title="资金曲线">
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                资金曲线图表开发中...
              </Text>
            </div>
          </AnalyticsCard>
        </Col>
        <Col xs={24} lg={12}>
          <AnalyticsCard title="风险评估">
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                风险评估图表开发中...
              </Text>
            </div>
          </AnalyticsCard>
        </Col>
      </Row>
    </Container>
  )
}

export default Analytics
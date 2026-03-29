import React, { useState, useEffect } from 'react'
import { Typography, Card, Row, Col, Statistic, Space, Spin, DatePicker, Button } from 'antd'
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import styled from 'styled-components'
import dayjs, { Dayjs } from 'dayjs'

import { useUser } from '../../contexts/UserContext'
import { theme } from '../../styles/theme'
import { apiClient } from '../../services/userAuthService'

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

const StatCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  
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

const ChartWrapper = styled.div`
  width: 100%;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ChartInner = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const SVGChart = styled.svg`
  max-width: 100%;
  height: auto;
`

const LegendContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 12px;
  flex-wrap: wrap;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${theme.colors.textSecondary};
  font-size: 12px;
`

const LegendDot = styled.div<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.color};
`

interface AnalyticsData {
  total_profit: number
  win_rate: number
  profit_factor: number
  max_drawdown: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  sharpe_ratio: number
  avg_profit: number
  avg_loss: number
  largest_win: number
  largest_loss: number
  best_symbol: string | null
  worst_symbol: string | null
}

interface ProfitBySymbol {
  symbol: string
  profit: number
  trades: number
  win_rate: number
}

interface TradeDistribution {
  by_symbol: Record<string, number>
  by_type: { buy: number; sell: number }
  by_hour: Record<string, number>
  by_profit_range: Record<string, number>
}

interface RiskMetrics {
  max_drawdown: number
  max_drawdown_percent: number
  volatility: number
  var_95: number
  var_99: number
  expected_shortfall: number
  max_consecutive_losses: number
  max_consecutive_wins: number
  risk_reward_ratio: number
}

interface EquityPoint {
  time: string
  equity: number
  profit: number
  cumulative_profit: number
}

const Analytics: React.FC = () => {
  const { mt5Accounts, isAuthenticated } = useUser()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [profitBySymbol, setProfitBySymbol] = useState<ProfitBySymbol[]>([])
  const [tradeDistribution, setTradeDistribution] = useState<TradeDistribution | null>(null)
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ])

  useEffect(() => {
    console.log('Analytics - mt5Accounts:', mt5Accounts)
  }, [mt5Accounts])

  useEffect(() => {
    if (!isAuthenticated || mt5Accounts.length === 0) {
      return
    }
    const startDate = dateRange[0].format('YYYY-MM-DD')
    const endDate = dateRange[1].format('YYYY-MM-DD')
    
    const loadAllData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [summaryRes, symbolRes, distRes, riskRes, equityRes] = await Promise.all([
          apiClient.get(`/analytics/summary?start_date=${startDate}&end_date=${endDate}`),
          apiClient.get(`/analytics/profit-by-symbol?start_date=${startDate}&end_date=${endDate}`),
          apiClient.get(`/analytics/trade-distribution?start_date=${startDate}&end_date=${endDate}`),
          apiClient.get(`/analytics/risk-metrics?start_date=${startDate}&end_date=${endDate}`),
          apiClient.get(`/analytics/equity-curve?start_date=${startDate}&end_date=${endDate}`),
        ])

        setAnalyticsData(summaryRes.data)
        setProfitBySymbol(symbolRes.data.data || [])
        setTradeDistribution(distRes.data.data || null)
        setRiskMetrics(riskRes.data.data || null)
        setEquityCurve(equityRes.data.data?.equity_curve || [])
      } catch (error: any) {
        console.error('Failed to load analytics:', error)
        if (error.response?.status === 403) {
          setError(error.response.data?.error || 'Feature not available in your current plan')
        } else {
          setError('Failed to load analytics data')
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    loadAllData()
  }, [dateRange, mt5Accounts.length, isAuthenticated])

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]])
    }
  }

  if (!isAuthenticated || mt5Accounts.length === 0) {
    return (
      <Container>
        <AnalyticsCard>
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 40px',
            color: theme.colors.textSecondary 
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📊</div>
            <Title level={3} style={{ color: theme.colors.text, marginBottom: '16px' }}>
              连接您的MT5账户
            </Title>
            <p style={{ color: theme.colors.textSecondary, fontSize: '16px', marginBottom: '24px' }}>
              要查看交易分析数据，请先连接您的MetaTrader 5账户。
            </p>
            <Button 
              type="primary" 
              size="large"
              onClick={() => window.location.href = '/user-center'}
              style={{ background: theme.colors.primary, borderColor: theme.colors.primary }}
            >
              前往添加MT5账户
            </Button>
          </div>
        </AnalyticsCard>
      </Container>
    )
  }

  const renderProfitBarChart = () => {
    if (!profitBySymbol || profitBySymbol.length === 0) {
      return (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary }}>暂无数据</Text>
        </div>
      )
    }

    const displayData = profitBySymbol.slice(0, 6)
    const maxAbsProfit = Math.max(...displayData.map(d => Math.abs(d.profit)), 1)
    const barWidth = 50
    const gap = 15
    const chartWidth = displayData.length * (barWidth + gap) + 40
    const chartHeight = 200
    const zeroY = chartHeight / 2

    return (
      <ChartInner>
        <SVGChart width={chartWidth} height={chartHeight + 40} viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}>
          <line x1="20" y1={zeroY} x2={chartWidth - 20} y2={zeroY} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          
          {displayData.map((item, index) => {
            const x = 20 + index * (barWidth + gap)
            const barHeight = Math.min((Math.abs(item.profit) / maxAbsProfit) * (chartHeight / 2 - 10), chartHeight / 2 - 10)
            const y = item.profit >= 0 ? zeroY - barHeight : zeroY
            const color = item.profit >= 0 ? '#00ff88' : '#ff4d4f'
            
            return (
              <g key={item.symbol}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx="4"
                  opacity="0.85"
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 15}
                  fill="rgba(255,255,255,0.6)"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {item.symbol.length > 6 ? item.symbol.slice(0, 6) : item.symbol}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={y + (item.profit >= 0 ? -5 : barHeight + 12)}
                  fill={color}
                  fontSize="9"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {item.profit > 0 ? '+' : ''}{item.profit.toFixed(0)}
                </text>
              </g>
            )
          })}
        </SVGChart>
        <LegendContainer>
          <LegendItem><LegendDot color="#00ff88" />盈利</LegendItem>
          <LegendItem><LegendDot color="#ff4d4f" />亏损</LegendItem>
        </LegendContainer>
      </ChartInner>
    )
  }

  const renderDistributionPieChart = () => {
    if (!tradeDistribution) {
      return (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary }}>暂无数据</Text>
        </div>
      )
    }

    const { by_type } = tradeDistribution
    const total = by_type.buy + by_type.sell
    if (total === 0) {
      return (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary }}>暂无交易数据</Text>
        </div>
      )
    }

    const size = 200
    const centerX = size / 2
    const centerY = size / 2 - 10
    const radius = 70
    const buyRatio = by_type.buy / total
    const buyAngle = buyRatio * 360

    const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
      const rad = (angle - 90) * Math.PI / 180
      return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad)
      }
    }

    const describeArc = (startAngle: number, endAngle: number) => {
      const start = polarToCartesian(centerX, centerY, radius, endAngle)
      const end = polarToCartesian(centerX, centerY, radius, startAngle)
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
      return [
        "M", centerX, centerY,
        "L", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        "Z"
      ].join(" ")
    }

    return (
      <ChartInner>
        <SVGChart width={size} height={size - 20} viewBox={`0 0 ${size} ${size - 20}`}>
          <path d={describeArc(0, buyAngle)} fill="#00ff88" opacity="0.8" />
          <path d={describeArc(buyAngle, 360)} fill="#ff4d4f" opacity="0.8" />
          <circle cx={centerX} cy={centerY} r="40" fill="rgba(26, 31, 58, 0.9)" />
          <text x={centerX} y={centerY - 5} fill={theme.colors.text} fontSize="20" fontWeight="bold" textAnchor="middle">
            {total}
          </text>
          <text x={centerX} y={centerY + 15} fill={theme.colors.textSecondary} fontSize="10" textAnchor="middle">
            总交易
          </text>
        </SVGChart>
        <LegendContainer>
          <LegendItem><LegendDot color="#00ff88" />买入 ({by_type.buy})</LegendItem>
          <LegendItem><LegendDot color="#ff4d4f" />卖出 ({by_type.sell})</LegendItem>
        </LegendContainer>
      </ChartInner>
    )
  }

  const renderEquityCurveChart = () => {
    if (!equityCurve || equityCurve.length === 0) {
      return (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary }}>暂无数据</Text>
        </div>
      )
    }

    const chartWidth = 400
    const chartHeight = 200
    const padding = { top: 20, right: 20, bottom: 30, left: 50 }
    const innerWidth = chartWidth - padding.left - padding.right
    const innerHeight = chartHeight - padding.top - padding.bottom

    const profits = equityCurve.map(d => d.cumulative_profit)
    const minProfit = Math.min(...profits, 0)
    const maxProfit = Math.max(...profits, 0)
    const profitRange = maxProfit - minProfit || 1

    const scaleX = (index: number) => padding.left + (index / Math.max(equityCurve.length - 1, 1)) * innerWidth
    const scaleY = (value: number) => padding.top + innerHeight - ((value - minProfit) / profitRange) * innerHeight

    const pathPoints = equityCurve.map((point, index) => ({
      x: scaleX(index),
      y: scaleY(point.cumulative_profit)
    }))

    const pathD = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const lastPoint = pathPoints[pathPoints.length - 1]
    const firstPoint = pathPoints[0]
    const areaD = `${pathD} L ${lastPoint.x} ${scaleY(minProfit)} L ${firstPoint.x} ${scaleY(minProfit)} Z`
    const zeroY = scaleY(0)

    return (
      <ChartInner>
        <SVGChart width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <defs>
            <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {minProfit < 0 && maxProfit > 0 && (
            <line x1={padding.left} y1={zeroY} x2={chartWidth - padding.right} y2={zeroY} stroke="rgba(255,255,255,0.2)" strokeDasharray="4" />
          )}
          
          <path d={areaD} fill="url(#equityGradient)" />
          <path d={pathD} fill="none" stroke="#00ff88" strokeWidth="2" />
          
          {pathPoints.length > 0 && (
            <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill="#00ff88" />
          )}
          
          <text x={padding.left - 5} y={padding.top + 5} fill="rgba(255,255,255,0.5)" fontSize="9" textAnchor="end">
            {maxProfit.toFixed(0)}
          </text>
          <text x={padding.left - 5} y={chartHeight - padding.bottom} fill="rgba(255,255,255,0.5)" fontSize="9" textAnchor="end">
            {minProfit.toFixed(0)}
          </text>
        </SVGChart>
        <LegendContainer>
          <LegendItem><LegendDot color="#00ff88" />累计盈亏</LegendItem>
        </LegendContainer>
      </ChartInner>
    )
  }

  const renderRiskGauge = () => {
    if (!riskMetrics) {
      return (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary }}>暂无数据</Text>
        </div>
      )
    }

    const { max_drawdown_percent, volatility, risk_reward_ratio, max_consecutive_losses } = riskMetrics
    
    const riskScore = Math.min(100, Math.max(0, (max_drawdown_percent * 2 + volatility / 10)))
    const riskLevel = riskScore < 30 ? '低' : riskScore < 60 ? '中' : '高'
    const riskColor = riskScore < 30 ? '#00ff88' : riskScore < 60 ? '#faad14' : '#ff4d4f'

    return (
      <div style={{ padding: '10px 0', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              border: `6px solid ${riskColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              margin: '0 auto'
            }}>
              <span style={{ fontSize: 28, fontWeight: 'bold', color: riskColor }}>{riskScore.toFixed(0)}</span>
              <span style={{ fontSize: 11, color: theme.colors.textSecondary }}>风险评分</span>
            </div>
            <div style={{ marginTop: 6, color: riskColor, fontWeight: 'bold', fontSize: 13 }}>{riskLevel}风险</div>
          </div>
        </div>

        <Row gutter={[12, 12]}>
          <Col span={12}>
            <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ color: theme.colors.textSecondary, fontSize: 11 }}>最大回撤</div>
              <div style={{ color: '#ff4d4f', fontSize: 16, fontWeight: 'bold' }}>{max_drawdown_percent.toFixed(2)}%</div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ color: theme.colors.textSecondary, fontSize: 11 }}>波动率</div>
              <div style={{ color: theme.colors.text, fontSize: 16, fontWeight: 'bold' }}>{volatility.toFixed(2)}</div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ color: theme.colors.textSecondary, fontSize: 11 }}>风险回报比</div>
              <div style={{ color: '#00ff88', fontSize: 16, fontWeight: 'bold' }}>{risk_reward_ratio.toFixed(2)}</div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ color: theme.colors.textSecondary, fontSize: 11 }}>最大连续亏损</div>
              <div style={{ color: '#ff4d4f', fontSize: 16, fontWeight: 'bold' }}>{max_consecutive_losses}</div>
            </div>
          </Col>
        </Row>
      </div>
    )
  }

  return (
    <Container>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ color: theme.colors.text, margin: 0 }}>
          数据分析
        </Title>
        <Space>
          <Text style={{ color: theme.colors.textSecondary }}>时间范围:</Text>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            style={{ width: 260 }}
            allowClear={false}
            format="YYYY-MM-DD"
          />
        </Space>
      </div>

      {error && (
        <AnalyticsCard style={{ marginBottom: 16 }}>
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: theme.colors.textSecondary 
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <Title level={4} style={{ color: theme.colors.text, marginBottom: '12px' }}>
              功能不可用
            </Title>
            <p style={{ color: theme.colors.textSecondary, fontSize: '14px', marginBottom: '20px' }}>
              {error}
            </p>
            <Button 
              type="primary"
              onClick={() => window.location.href = '/pricing'}
              style={{ background: theme.colors.primary, borderColor: theme.colors.primary }}
            >
              升级会员
            </Button>
          </div>
        </AnalyticsCard>
      )}

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <StatCard>
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
            <StatCard>
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
            <StatCard>
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
            <StatCard>
              <Statistic
                title="最大回撤"
                value={analyticsData?.max_drawdown || 0}
                precision={2}
                valueStyle={{ color: theme.colors.error }}
                prefix={<FallOutlined />}
              />
            </StatCard>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <StatCard>
              <Statistic
                title="总交易次数"
                value={analyticsData?.total_trades || 0}
                valueStyle={{ color: theme.colors.text }}
                prefix={<BarChartOutlined />}
              />
            </StatCard>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard>
              <Statistic
                title="盈利交易"
                value={analyticsData?.winning_trades || 0}
                valueStyle={{ color: theme.colors.success }}
                prefix={<RiseOutlined />}
              />
            </StatCard>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard>
              <Statistic
                title="亏损交易"
                value={analyticsData?.losing_trades || 0}
                valueStyle={{ color: theme.colors.error }}
                prefix={<FallOutlined />}
              />
            </StatCard>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard>
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

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <AnalyticsCard title="品种盈亏分析">
              <ChartWrapper>
                {renderProfitBarChart()}
              </ChartWrapper>
            </AnalyticsCard>
          </Col>
          <Col xs={24} lg={12}>
            <AnalyticsCard title="交易分布">
              <ChartWrapper>
                {renderDistributionPieChart()}
              </ChartWrapper>
            </AnalyticsCard>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <AnalyticsCard title="资金曲线">
              <ChartWrapper>
                {renderEquityCurveChart()}
              </ChartWrapper>
            </AnalyticsCard>
          </Col>
          <Col xs={24} lg={12}>
            <AnalyticsCard title="风险评估">
              <ChartWrapper>
                {renderRiskGauge()}
              </ChartWrapper>
            </AnalyticsCard>
          </Col>
        </Row>
      </Spin>
    </Container>
  )
}

export default Analytics

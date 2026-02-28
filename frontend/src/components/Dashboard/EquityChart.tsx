import React, { useMemo, useState, useEffect } from 'react'
import styled from 'styled-components'
import { Spin, DatePicker } from 'antd'
import type { Dayjs } from 'dayjs'
import { accountService } from '../../services/accountService'

const { RangePicker } = DatePicker

interface EquityPoint {
  date: string
  profit: number
  cumulative: number
  cumulativeProfit: number
  tradeId: string
  tradeTime: number
  symbol?: string
  type?: string
}

interface EquityCurveData {
  equityCurve: EquityPoint[]
  dailyPnl: Array<{ date: string; profit: number }>
  totalTrades: number
  totalProfit: number
  winRate: number
  maxDrawdown: number
  profitableTrades: number
  losingTrades: number
}

const Container = styled.div`
  background: linear-gradient(180deg, rgba(26, 31, 58, 0.95) 0%, rgba(11, 14, 17, 0.98) 100%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 28px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
`

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

const TitleIcon = styled.div`
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 8px 20px rgba(0, 255, 136, 0.25);
`

const TitleText = styled.div`
  h2 {
    color: #ffffff;
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    letter-spacing: 0.3px;
  }
  
  p {
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    margin: 4px 0 0 0;
  }
`

const ControlsSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const TimeButtons = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
`

const TimeButton = styled.button<{ $active: boolean }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: ${props => props.$active ? 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)' : 'transparent'};
  color: ${props => props.$active ? '#0a0f29' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 13px;
  font-weight: ${props => props.$active ? '700' : '500'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)' : 'rgba(255, 255, 255, 0.08)'};
    color: ${props => props.$active ? '#0a0f29' : '#ffffff'};
  }
`

const CustomDateButton = styled.button<{ $active: boolean }>`
  padding: 10px 16px;
  border: 1px solid ${props => props.$active ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  background: ${props => props.$active ? 'rgba(0, 255, 136, 0.1)' : 'transparent'};
  color: ${props => props.$active ? '#00ff88' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    border-color: rgba(0, 255, 136, 0.5);
    color: #00ff88;
  }
`

const DateRangeContainer = styled.div<{ $visible: boolean }>`
  display: ${props => props.$visible ? 'flex' : 'none'};
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 8px;
  width: 100%;
  
  .ant-picker {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
    
    .ant-picker-input > input {
      color: rgba(255, 255, 255, 0.8) !important;
    }
    
    .ant-picker-suffix {
      color: rgba(255, 255, 255, 0.4) !important;
    }
    
    .ant-picker-separator {
      color: rgba(255, 255, 255, 0.3) !important;
    }
    
    &:hover {
      border-color: rgba(0, 255, 136, 0.5) !important;
    }
  }
  
  .ant-picker-dropdown {
    .ant-picker-panel-container {
      background: rgba(26, 31, 58, 0.98) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      
      .ant-picker-header,
      .ant-picker-body {
        background: transparent !important;
      }
      
      .ant-picker-content th,
      .ant-picker-content td {
        color: rgba(255, 255, 255, 0.8) !important;
      }
      
      .ant-picker-cell:hover .ant-picker-cell-inner {
        background: rgba(0, 255, 136, 0.2) !important;
      }
      
      .ant-picker-cell-selected .ant-picker-cell-inner {
        background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%) !important;
        color: #0a0f29 !important;
      }
    }
  }
`

const ApplyButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
  color: #0a0f29;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
  }
`

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
`

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(0, 255, 136, 0.2);
    transform: translateY(-2px);
  }
`

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
  font-weight: 600;
`

const StatNumber = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  font-size: 24px;
  font-weight: 800;
  color: ${props => props.$positive ? '#00ff88' : props.$negative ? '#ff4d4f' : '#ffffff'};
  text-shadow: ${props => props.$positive ? '0 0 20px rgba(0, 255, 136, 0.4)' : props.$negative ? '0 0 20px rgba(255, 77, 79, 0.4)' : 'none'};
`

const ChartWrapper = styled.div`
  position: relative;
  height: 400px;
  margin: 0 -10px;
`

const ChartSVG = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`

const CurrentValueBox = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 12px 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  .label {
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    margin-bottom: 4px;
  }
  
  .value {
    color: #00ff88;
    font-size: 18px;
    font-weight: 700;
  }
`

const LegendRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const LegendDot = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.$color};
  box-shadow: 0 0 10px ${props => props.$color};
`

const LegendLabel = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  
  span {
    color: #ffffff;
    font-weight: 600;
    margin-left: 6px;
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: rgba(255, 255, 255, 0.4);
  
  .icon {
    font-size: 64px;
    margin-bottom: 20px;
    opacity: 0.5;
  }
  
  .title {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 8px;
  }
  
  .subtitle {
    font-size: 13px;
  }
`

const EquityChart: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<EquityCurveData | null>(null)
  const [days, setDays] = useState(30)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customDateRange, setCustomDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])

  useEffect(() => {
    loadEquityCurve()
  }, [days])

  const loadEquityCurve = async (startDate?: string, endDate?: string) => {
    setLoading(true)
    try {
      let response
      if (startDate && endDate) {
        response = await accountService.getEquityCurveByDateRange(startDate, endDate)
      } else {
        response = await accountService.getEquityCurve(days)
      }
      if (response.success && response.data) {
        setData(response.data)
      }
    } catch (error) {
      console.error('加载资金曲线失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePresetClick = (presetDays: number) => {
    setDays(presetDays)
    setIsCustomMode(false)
    setCustomDateRange([null, null])
  }

  const handleCustomToggle = () => {
    setIsCustomMode(!isCustomMode)
  }

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates) {
      setCustomDateRange(dates)
    } else {
      setCustomDateRange([null, null])
    }
  }

  const handleApplyCustomRange = () => {
    if (customDateRange[0] && customDateRange[1]) {
      const startDate = customDateRange[0].format('YYYY-MM-DD')
      const endDate = customDateRange[1].format('YYYY-MM-DD')
      loadEquityCurve(startDate, endDate)
    }
  }

  const chartData = useMemo(() => {
    if (!data || !data.equityCurve || data.equityCurve.length === 0) {
      return null
    }

    const filteredData = data.equityCurve.filter((item, index) => {
      if (index === 0) return true
      return item.cumulative !== data.equityCurve[index - 1].cumulative
    })

    if (filteredData.length < 2) {
      return null
    }

    const points = filteredData.map((item, index) => {
      const date = new Date(item.date)
      return {
        x: index,
        y: item.cumulative,
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        profit: item.profit,
        symbol: item.symbol,
        type: item.type
      }
    })

    const values = points.map(p => p.y)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const padding = (maxValue - minValue) * 0.1 || 1000

    return { 
      points, 
      minValue: minValue - padding, 
      maxValue: maxValue + padding,
      valueRange: (maxValue - minValue) + padding * 2
    }
  }, [data])

  const totalReturn = useMemo(() => {
    if (!chartData || chartData.points.length < 2) return 0
    const firstValue = chartData.points[0].y
    const lastValue = chartData.points[chartData.points.length - 1].y
    return ((lastValue - firstValue) / (firstValue || 1)) * 100
  }, [chartData])

  const chartWidth = 900
  const chartHeight = 350
  const padding = { top: 30, right: 30, bottom: 50, left: 80 }
  const graphWidth = chartWidth - padding.left - padding.right
  const graphHeight = chartHeight - padding.top - padding.bottom

  const getX = (index: number, total: number) => {
    return padding.left + (index / (total - 1)) * graphWidth
  }

  const getY = (value: number) => {
    if (!chartData) return 0
    return padding.top + graphHeight - ((value - chartData.minValue) / chartData.valueRange) * graphHeight
  }

  const createSmoothPath = useMemo(() => {
    if (!chartData) return ''

    const { points } = chartData
    
    if (points.length < 2) return ''

    let path = `M ${getX(0, points.length)} ${getY(points[0].y)}`
    
    for (let i = 1; i < points.length; i++) {
      const x0 = getX(i - 1, points.length)
      const y0 = getY(points[i - 1].y)
      const x1 = getX(i, points.length)
      const y1 = getY(points[i].y)
      
      const cpx = (x0 + x1) / 2
      
      path += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`
    }

    return path
  }, [chartData])

  const createAreaPath = useMemo(() => {
    if (!chartData || !createSmoothPath) return ''

    const { points } = chartData
    const lastX = getX(points.length - 1, points.length)
    const firstX = getX(0, points.length)
    const bottomY = chartHeight - padding.bottom

    return `${createSmoothPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
  }, [chartData, createSmoothPath])

  const yAxisTicks = useMemo(() => {
    if (!chartData) return []
    
    const ticks = []
    const numTicks = 5
    const step = chartData.valueRange / (numTicks - 1)
    
    for (let i = 0; i < numTicks; i++) {
      const value = chartData.minValue + step * i
      ticks.push({
        value,
        y: getY(value),
        label: (value / 1000).toFixed(0) + 'K'
      })
    }
    
    return ticks
  }, [chartData])

  const xAxisTicks = useMemo(() => {
    if (!chartData) return []
    
    const { points } = chartData
    const numTicks = Math.min(6, points.length)
    const step = Math.floor((points.length - 1) / (numTicks - 1))
    
    const ticks = []
    for (let i = 0; i < numTicks; i++) {
      const index = i === numTicks - 1 ? points.length - 1 : i * step
      ticks.push({
        x: getX(index, points.length),
        label: points[index].date
      })
    }
    
    return ticks
  }, [chartData])

  const getDateRangeText = () => {
    if (isCustomMode && customDateRange[0] && customDateRange[1]) {
      return `${customDateRange[0].format('MM/DD')} - ${customDateRange[1].format('MM/DD')}`
    }
    return `最近 ${days} 天交易表现`
  }

  if (loading) {
    return (
      <Container>
        <EmptyState>
          <Spin size="large" style={{ color: '#00ff88' }} />
          <div className="title" style={{ marginTop: 20 }}>加载资金曲线数据...</div>
        </EmptyState>
      </Container>
    )
  }

  if (!chartData || chartData.points.length === 0) {
    return (
      <Container>
        <Header>
          <TitleSection>
            <TitleIcon>📈</TitleIcon>
            <TitleText>
              <h2>账户资金曲线</h2>
              <p>追踪您的交易表现</p>
            </TitleText>
          </TitleSection>
        </Header>
        <EmptyState>
          <div className="icon">📊</div>
          <div className="title">暂无交易数据</div>
          <div className="subtitle">开始交易后将显示资金曲线</div>
        </EmptyState>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <TitleSection>
          <TitleIcon>📈</TitleIcon>
          <TitleText>
            <h2>账户资金曲线</h2>
            <p>{getDateRangeText()}</p>
          </TitleText>
        </TitleSection>
        <ControlsSection>
          <TimeButtons>
            {[7, 30, 90].map(d => (
              <TimeButton
                key={d}
                $active={!isCustomMode && days === d}
                onClick={() => handlePresetClick(d)}
              >
                {d}天
              </TimeButton>
            ))}
          </TimeButtons>
          <CustomDateButton $active={isCustomMode} onClick={handleCustomToggle}>
            📅 自定义
          </CustomDateButton>
        </ControlsSection>
      </Header>

      <DateRangeContainer $visible={isCustomMode}>
        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13 }}>选择日期范围:</span>
        <RangePicker
          value={customDateRange}
          onChange={handleDateRangeChange}
          format="YYYY-MM-DD"
          placeholder={['开始日期', '结束日期']}
          allowClear
          style={{ width: 280 }}
        />
        <ApplyButton 
          onClick={handleApplyCustomRange}
          disabled={!customDateRange[0] || !customDateRange[1]}
          style={{ opacity: customDateRange[0] && customDateRange[1] ? 1 : 0.5 }}
        >
          应用
        </ApplyButton>
      </DateRangeContainer>

      <StatsRow>
        <StatCard>
          <StatLabel>总交易</StatLabel>
          <StatNumber>{data?.totalTrades || 0}</StatNumber>
        </StatCard>
        <StatCard>
          <StatLabel>总盈亏</StatLabel>
          <StatNumber $positive={(data?.totalProfit || 0) > 0} $negative={(data?.totalProfit || 0) < 0}>
            {(data?.totalProfit || 0) >= 0 ? '+' : ''}{(data?.totalProfit || 0).toFixed(2)}
          </StatNumber>
        </StatCard>
        <StatCard>
          <StatLabel>胜率</StatLabel>
          <StatNumber $positive={(data?.winRate || 0) >= 50} $negative={(data?.winRate || 0) < 50}>
            {(data?.winRate || 0).toFixed(1)}%
          </StatNumber>
        </StatCard>
        <StatCard>
          <StatLabel>最大回撤</StatLabel>
          <StatNumber $negative>-{(data?.maxDrawdown || 0).toFixed(2)}</StatNumber>
        </StatCard>
      </StatsRow>

      <ChartWrapper>
        <ChartSVG viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={totalReturn >= 0 ? '#00ff88' : '#ff4d4f'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={totalReturn >= 0 ? '#00ff88' : '#ff4d4f'} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={totalReturn >= 0 ? '#00cc6a' : '#cc3d3d'} />
              <stop offset="100%" stopColor={totalReturn >= 0 ? '#00ff88' : '#ff4d4f'} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {yAxisTicks.map((tick, i) => (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={chartWidth - padding.right}
                y2={tick.y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 15}
                y={tick.y}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="12"
                textAnchor="end"
                alignmentBaseline="middle"
              >
                ${tick.label}
              </text>
            </g>
          ))}

          {xAxisTicks.map((tick, i) => (
            <text
              key={`x-${i}`}
              x={tick.x}
              y={chartHeight - 15}
              fill="rgba(255, 255, 255, 0.4)"
              fontSize="12"
              textAnchor="middle"
            >
              {tick.label}
            </text>
          ))}

          <path
            d={createAreaPath}
            fill="url(#areaGradient)"
          />

          <path
            d={createSmoothPath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {chartData.points.map((point, index) => {
            const x = getX(index, chartData.points.length)
            const y = getY(point.y)
            const isLast = index === chartData.points.length - 1
            
            return (
              <g key={`point-${index}`}>
                {isLast && (
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill={totalReturn >= 0 ? '#00ff88' : '#ff4d4f'}
                    opacity="0.2"
                  >
                    <animate
                      attributeName="r"
                      from="8"
                      to="16"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.3"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isLast ? 6 : 4}
                  fill={totalReturn >= 0 ? '#00ff88' : '#ff4d4f'}
                  stroke="#0a0f29"
                  strokeWidth="2"
                />
              </g>
            )
          })}
        </ChartSVG>

        <CurrentValueBox>
          <div className="label">当前资金</div>
          <div className="value">
            ${chartData.points[chartData.points.length - 1]?.y.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
        </CurrentValueBox>
      </ChartWrapper>

      <LegendRow>
        <LegendItem>
          <LegendDot $color="#00ff88" />
          <LegendLabel>盈利交易<span>{data?.profitableTrades || 0}</span></LegendLabel>
        </LegendItem>
        <LegendItem>
          <LegendDot $color="#ff4d4f" />
          <LegendLabel>亏损交易<span>{data?.losingTrades || 0}</span></LegendLabel>
        </LegendItem>
        <LegendItem>
          <LegendDot $color={totalReturn >= 0 ? '#00ff88' : '#ff4d4f'} />
          <LegendLabel>
            总收益率
            <span style={{ color: totalReturn >= 0 ? '#00ff88' : '#ff4d4f' }}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </span>
          </LegendLabel>
        </LegendItem>
      </LegendRow>
    </Container>
  )
}

export default EquityChart

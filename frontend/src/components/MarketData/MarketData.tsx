import React from 'react'
import styled from 'styled-components'
import { Card } from 'antd'
import { theme } from '../../styles/theme'
import KlineChart from './KlineChart'

const MarketDataContainer = styled.div`
  padding: 20px;
  background: rgba(19, 23, 42, 0.4);
  border-radius: ${theme.borderRadius.lg};
`

const Title = styled.h2`
  color: ${theme.colors.text};
  font-size: 24px;
  margin-bottom: 20px;
  font-weight: 600;
`

const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 1200px) {
    grid-template-columns: 2fr 1fr;
  }
`

const ChartCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6) !important;
  border: 1px solid ${theme.colors.border} !important;
  border-radius: ${theme.borderRadius.md} !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;

  .ant-card-head {
    border-bottom: 1px solid ${theme.colors.border} !important;
    background: rgba(19, 23, 42, 0.8) !important;

    .ant-card-head-title {
      color: ${theme.colors.textSecondary} !important;
      font-weight: 600;
    }
  }

  .ant-card-body {
    padding: 20px;
  }
`

const FeatureUnderDevelopment = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  text-align: center;
  line-height: 1.5;
`

const MarketData: React.FC = () => {
  // 传递给K线图表的默认参数
  const defaultSymbol = 'EURUSD'
  const defaultTimeframe = 'H1'

  return (
    <MarketDataContainer>
      <Title>实时行情</Title>
      <CardsContainer>
        <ChartCard title="K线图表">
          <KlineChart symbol={defaultSymbol} timeframe={defaultTimeframe} />
        </ChartCard>
        <ChartCard title="市场深度">
          <FeatureUnderDevelopment>
            <div>功能开发中...</div>
            <div style={{ fontSize: '14px', marginTop: '10px' }}>
              即将支持实时市场深度和订单簿查看
            </div>
          </FeatureUnderDevelopment>
        </ChartCard>
      </CardsContainer>
    </MarketDataContainer>
  )
}

export default MarketData
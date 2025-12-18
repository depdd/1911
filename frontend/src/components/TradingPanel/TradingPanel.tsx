import React from 'react'
import { Typography, Card, Row, Col } from 'antd'
import styled from 'styled-components'

import { theme } from '../../styles/theme'

const { Title } = Typography

const Container = styled.div`
  padding: 24px;
`

const StyledCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  margin-bottom: 24px;
`

const TradingPanel: React.FC = () => {
  return (
    <Container>
      <Title level={2} style={{ color: theme.colors.text, marginBottom: 24 }}>
        交易面板
      </Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <StyledCard title="新订单">
            <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Title level={4} style={{ color: theme.colors.textSecondary }}>
                新订单功能开发中...
              </Title>
            </div>
          </StyledCard>
        </Col>
        
        <Col xs={24} lg={12}>
          <StyledCard title="持仓管理">
            <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Title level={4} style={{ color: theme.colors.textSecondary }}>
                持仓管理功能开发中...
              </Title>
            </div>
          </StyledCard>
        </Col>
      </Row>

      <StyledCard title="订单历史">
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Title level={4} style={{ color: theme.colors.textSecondary }}>
            订单历史功能开发中...
          </Title>
        </div>
      </StyledCard>
    </Container>
  )
}

export default TradingPanel
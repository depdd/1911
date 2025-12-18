import React from 'react'
import { Typography, Card, Row, Col, Button, Tag, Space } from 'antd'
import { RobotOutlined, PlayCircleOutlined, SettingOutlined } from '@ant-design/icons'
import styled from 'styled-components'

import { theme } from '../../styles/theme'

const { Title, Text } = Typography

const Container = styled.div`
  padding: 24px;
`

const StrategyCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  height: 100%;
  transition: all ${theme.animations.duration.normal} ${theme.animations.easing.easeOut};
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${theme.shadows.glowStrong};
    border-color: ${theme.colors.primary};
  }
  
  .ant-card-head {
    background: transparent;
    border-bottom: 1px solid ${theme.colors.border};
    
    .ant-card-head-title {
      color: ${theme.colors.text};
      font-weight: ${theme.typography.fontWeight.semibold};
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
`

const StrategyStore: React.FC = () => {
  const strategies = [
    {
      id: '1',
      name: '移动平均线交叉策略',
      description: '基于快慢移动平均线交叉信号的交易策略，适合趋势行情',
      type: '趋势跟踪',
      status: 'active',
      performance: '+15.6%',
      trades: 156,
      winRate: '68.5%',
    },
    {
      id: '2',
      name: 'RSI超买超卖策略',
      description: '利用RSI指标识别超买超卖区域的反转交易机会',
      type: '反转交易',
      status: 'testing',
      performance: '+8.2%',
      trades: 89,
      winRate: '62.3%',
    },
    {
      id: '3',
      name: '布林带突破策略',
      description: '基于布林带上下轨突破的趋势跟踪策略',
      type: '突破交易',
      status: 'inactive',
      performance: '-2.1%',
      trades: 45,
      winRate: '55.8%',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'testing':
        return 'warning'
      case 'inactive':
        return 'default'
      default:
        return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '运行中'
      case 'testing':
        return '测试中'
      case 'inactive':
        return '已停止'
      default:
        return '未知'
    }
  }

  return (
    <Container>
      <Title level={2} style={{ color: theme.colors.text, marginBottom: 24 }}>
        策略商店
      </Title>
      
      <Row gutter={[24, 24]}>
        {strategies.map((strategy) => (
          <Col key={strategy.id} xs={24} md={12} lg={8}>
            <StrategyCard
              title={
                <>
                  <RobotOutlined />
                  {strategy.name}
                </>
              }
              extra={
                <Tag color={getStatusColor(strategy.status)}>
                  {getStatusText(strategy.status)}
                </Tag>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text style={{ color: theme.colors.textSecondary, lineHeight: 1.6 }}>
                  {strategy.description}
                </Text>
                
                <div>
                  <Text strong style={{ color: theme.colors.primary, marginRight: 8 }}>
                    策略类型:
                  </Text>
                  <Tag>{strategy.type}</Tag>
                </div>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        收益率
                      </Text>
                      <div>
                        <Text
                          strong
                          style={{
                            color: strategy.performance.startsWith('+')
                              ? theme.colors.success
                              : theme.colors.error,
                          }}
                        >
                          {strategy.performance}
                        </Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        交易次数
                      </Text>
                      <div>
                        <Text strong style={{ color: theme.colors.text }}>
                          {strategy.trades}
                        </Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        胜率
                      </Text>
                      <div>
                        <Text strong style={{ color: theme.colors.text }}>
                          {strategy.winRate}
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
                
                <Row gutter={8} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      style={{ width: '100%' }}
                      disabled={strategy.status === 'active'}
                    >
                      启动
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button
                      icon={<SettingOutlined />}
                      style={{ width: '100%' }}
                    >
                      配置
                    </Button>
                  </Col>
                </Row>
              </Space>
            </StrategyCard>
          </Col>
        ))}
      </Row>
    </Container>
  )
}

export default StrategyStore
import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Space, Alert, Row, Col } from 'antd'
import { LoginOutlined, DatabaseOutlined, SafetyCertificateOutlined, DashboardOutlined, LineChartOutlined, SwapOutlined, RobotOutlined, BarChartOutlined } from '@ant-design/icons'
import styled from 'styled-components'

import { useAuth } from '../../contexts/AuthContext'
import { theme } from '../../styles/theme'

const { Title, Paragraph } = Typography

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${theme.gradients.background};
  padding: 24px;
`

const ConnectionCard = styled(Card)`
  width: 100%;
  max-width: 500px;
  background: rgba(26, 31, 58, 0.8);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.xl};
  box-shadow: ${theme.shadows.glow};
`

const LogoContainer = styled.div`
  text-align: center;
  margin-bottom: 32px;
`

const Logo = styled.div`
  width: 80px;
  height: 80px;
  background: ${theme.gradients.primary};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 32px;
  font-weight: ${theme.typography.fontWeight.bold};
  color: white;
  animation: glow 2s ease-in-out infinite alternate;
`

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: ${theme.colors.textSecondary};
    font-weight: ${theme.typography.fontWeight.medium};
  }
  
  .ant-input {
    background: rgba(26, 31, 58, 0.8);
    border: 1px solid ${theme.colors.border};
    color: ${theme.colors.text};
    
    &:hover, &:focus {
      border-color: ${theme.colors.primary};
      box-shadow: 0 0 0 2px ${theme.colors.shadow};
    }
  }
`

const ConnectButton = styled(Button)`
  width: 100%;
  height: 48px;
  background: ${theme.gradients.primary};
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: white;
  
  &:hover {
    background: ${theme.gradients.secondary};
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.glowStrong};
  }
  
  &:active {
    transform: translateY(0);
  }
`

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 24px 0;
  
  li {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    color: ${theme.colors.textSecondary};
    
    .anticon {
      color: ${theme.colors.success};
      font-size: 16px;
    }
  }
`

const MT5Connection: React.FC = () => {
  const [form] = Form.useForm()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()

  const handleSubmit = async (values: unknown) => {
    setIsConnecting(true)
    setError(null)

    try {
      // 类型断言
      const credentials = values as {
        login: string
        password: string
        server: string
      }
      await login(credentials.login, credentials.password, credentials.server)
      // 登录成功，页面会自动跳转
    } catch (error) {
      setError(error instanceof Error ? error.message : '连接失败')
    } finally {
      setIsConnecting(false)
    }
  }

  

  return (
    <Container>
      <Row justify="center" style={{ width: '100%' }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8}>
          <ConnectionCard>
            <LogoContainer>
              <Logo>FX</Logo>
              <Title level={2} style={{ color: theme.colors.text, margin: 0 }}>
                外汇量化交易平台
              </Title>
              <Paragraph style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
                连接您的MT5账户开始交易
              </Paragraph>
            </LogoContainer>

            {error && (
              <Alert
                message="连接失败"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
                closable
                onClose={() => setError(null)}
              />
            )}

            <StyledForm
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              disabled={isConnecting}
            >
              <Form.Item
                name="login"
                label="账户号码"
                rules={[{ required: true, message: '请输入账户号码' }]}
              >
                <Input
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="请输入MT5账户号码"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="请输入账户密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="server"
                label="服务器"
                rules={[{ required: true, message: '请选择服务器' }]}
              >
                <Input
                  prefix={<DatabaseOutlined />}
                  placeholder="例如: MetaQuotes-Demo"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Space direction="vertical" style={{ width: '100%' }}>
              <ConnectButton
                type="primary"
                htmlType="submit"
                loading={isConnecting}
                icon={<LoginOutlined />}
              >
                {isConnecting ? '连接中...' : '连接MT5账户'}
              </ConnectButton>
            </Space>
              </Form.Item>
            </StyledForm>

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${theme.colors.border}` }}>
              <Title level={4} style={{ color: theme.colors.text, marginBottom: 16 }}>
                平台功能
              </Title>
              <FeatureList>
                <li>
                  <DashboardOutlined />
                  <span>实时账户监控与资金管理</span>
                </li>
                <li>
                  <LineChartOutlined />
                  <span>专业K线图表与技术分析</span>
                </li>
                <li>
                  <SwapOutlined />
                  <span>一键交易与持仓管理</span>
                </li>
                <li>
                  <RobotOutlined />
                  <span>智能量化策略交易系统</span>
                </li>
                <li>
                  <BarChartOutlined />
                  <span>深度数据分析与报表</span>
                </li>
              </FeatureList>
            </div>
          </ConnectionCard>
        </Col>
      </Row>
    </Container>
  )
}

export default MT5Connection
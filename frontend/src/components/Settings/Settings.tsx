import React, { useState } from 'react'
import { Typography, Card, Form, Select, Switch, Input, Button, Space, Row, Col } from 'antd'
import {
  SettingOutlined,
  SaveOutlined,
  UserOutlined,
  BellOutlined,
  SkinOutlined,
} from '@ant-design/icons'
import styled from 'styled-components'

import { theme } from '../../styles/theme'

const { Title } = Typography
const { Option } = Select

const Container = styled.div`
  padding: 24px;
`

const SettingsCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  margin-bottom: 24px;
  
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

const SettingsForm = styled(Form)`
  .ant-form-item-label > label {
    color: ${theme.colors.textSecondary};
    font-weight: ${theme.typography.fontWeight.medium};
  }
  
  .ant-select-selector {
    background: rgba(26, 31, 58, 0.8) !important;
    border: 1px solid ${theme.colors.border} !important;
    
    &:hover, &:focus {
      border-color: ${theme.colors.primary} !important;
      box-shadow: 0 0 0 2px ${theme.colors.shadow} !important;
    }
  }
  
  .ant-input {
    background: rgba(26, 31, 58, 0.8) !important;
    border: 1px solid ${theme.colors.border} !important;
    color: ${theme.colors.text} !important;
    
    &:hover, &:focus {
      border-color: ${theme.colors.primary} !important;
      box-shadow: 0 0 0 2px ${theme.colors.shadow} !important;
    }
  }
`

const SaveButton = styled(Button)`
  background: ${theme.gradients.primary};
  border: none;
  color: white;
  font-weight: ${theme.typography.fontWeight.semibold};
  
  &:hover {
    background: ${theme.gradients.secondary};
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.glow};
  }
`

const Settings: React.FC = () => {
  const [form] = Form.useForm()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (values: any) => {
    setIsSaving(true)
    try {
      // 这里可以添加保存设置的逻辑
      console.log('Saving settings:', values)
      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    form.resetFields()
  }

  return (
    <Container>
      <Title level={2} style={{ color: theme.colors.text, marginBottom: 24 }}>
        系统设置
      </Title>

      <SettingsForm form={form} layout="vertical" onFinish={handleSave}>
        {/* 个人设置 */}
        <SettingsCard
          title={
            <>
              <UserOutlined />
              个人设置
            </>
          }
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="language"
                label="界面语言"
                initialValue="zh"
              >
                <Select>
                  <Option value="zh">简体中文</Option>
                  <Option value="en">English</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="timezone"
                label="时区"
                initialValue="Asia/Shanghai"
              >
                <Select>
                  <Option value="Asia/Shanghai">北京时间 (UTC+8)</Option>
                  <Option value="UTC">协调世界时 (UTC)</Option>
                  <Option value="America/New_York">纽约时间 (UTC-5)</Option>
                  <Option value="Europe/London">伦敦时间 (UTC+0)</Option>
                  <Option value="Asia/Tokyo">东京时间 (UTC+9)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="theme"
                label="主题"
                initialValue="dark"
              >
                <Select>
                  <Option value="dark">深色主题</Option>
                  <Option value="light">浅色主题</Option>
                  <Option value="auto">跟随系统</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="compactMode"
                label="紧凑模式"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </SettingsCard>

        {/* 交易设置 */}
        <SettingsCard
          title={
            <>
              <SettingOutlined />
              交易设置
            </>
          }
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="defaultVolume"
                label="默认交易量"
                initialValue={0.1}
              >
                <Input type="number" step={0.01} min={0.01} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="maxPositions"
                label="最大持仓数量"
                initialValue={10}
              >
                <Input type="number" min={1} max={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="defaultStopLoss"
                label="默认止损 (点)"
                initialValue={50}
              >
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="defaultTakeProfit"
                label="默认止盈 (点)"
                initialValue={100}
              >
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="autoCloseWeekend"
                label="周末自动平仓"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="confirmBeforeTrade"
                label="交易前确认"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </SettingsCard>

        {/* 通知设置 */}
        <SettingsCard
          title={
            <>
              <BellOutlined />
              通知设置
            </>
          }
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="emailNotifications"
                label="邮件通知"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="pushNotifications"
                label="推送通知"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="soundNotifications"
                label="声音提醒"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="desktopNotifications"
                label="桌面通知"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </SettingsCard>

        {/* 图表设置 */}
        <SettingsCard
          title={
            <>
              <SkinOutlined />
              图表设置
            </>
          }
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="defaultTimeframe"
                label="默认时间周期"
                initialValue="H1"
              >
                <Select>
                  <Option value="M1">1分钟</Option>
                  <Option value="M5">5分钟</Option>
                  <Option value="M15">15分钟</Option>
                  <Option value="M30">30分钟</Option>
                  <Option value="H1">1小时</Option>
                  <Option value="H4">4小时</Option>
                  <Option value="D1">日线</Option>
                  <Option value="W1">周线</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="chartTheme"
                label="图表主题"
                initialValue="dark"
              >
                <Select>
                  <Option value="dark">深色</Option>
                  <Option value="light">浅色</Option>
                  <Option value="blue">蓝色</Option>
                  <Option value="green">绿色</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="showGrid"
                label="显示网格"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="showVolume"
                label="显示成交量"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </SettingsCard>

        {/* 操作按钮 */}
        <Form.Item>
          <Space>
            <SaveButton
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isSaving}
            >
              {isSaving ? '保存中...' : '保存设置'}
            </SaveButton>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </SettingsForm>
    </Container>
  )
}

export default Settings
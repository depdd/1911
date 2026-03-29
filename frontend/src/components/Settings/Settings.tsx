import React, { useState, useEffect } from 'react'
import { Typography, Card, Form, Select, Switch, Button, Row, Col, Spin, App } from 'antd'
import {
  UserOutlined,
  SkinOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import styled from 'styled-components'
import axios from 'axios'

import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage } from '../../contexts/LanguageContext'

const { Title } = Typography
const { Option } = Select

const Container = styled.div`
  padding: 24px;
`

const SettingsCard = styled(Card)<{ $borderColor: string; $bgColor: string }>`
  background: ${props => props.$bgColor};
  border: 1px solid ${props => props.$borderColor};
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin-bottom: 24px;
  
  .ant-card-head {
    background: transparent;
    border-bottom: 1px solid ${props => props.$borderColor};
    
    .ant-card-head-title {
      color: ${props => props.theme?.colors?.text || '#fff'};
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
`

const SettingsForm = styled(Form)<{ $textSecondary: string }>`
  .ant-form-item-label > label {
    color: ${props => props.$textSecondary};
    font-weight: 500;
  }
  
  .ant-select-selector {
    background: ${props => props.theme?.colors?.background || 'rgba(26, 31, 58, 0.8)'} !important;
    border: 1px solid ${props => props.theme?.colors?.border || 'rgba(0, 212, 255, 0.2)'} !important;
    color: ${props => props.theme?.colors?.text || '#fff'} !important;
    
    .ant-select-selection-item {
      color: ${props => props.theme?.colors?.text || '#fff'} !important;
    }
    
    &:hover, &:focus {
      border-color: ${props => props.theme?.colors?.primary || '#00d4ff'} !important;
    }
  }
`

const SaveIndicator = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 255, 136, 0.9);
  color: #000;
  padding: 8px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  opacity: ${props => props.visible ? 1 : 0};
  transform: translateY(${props => props.visible ? 0 : -20}px);
  transition: all 0.3s ease;
  z-index: 1000;
`

const ResetButton = styled(Button)<{ $borderColor: string; $textSecondary: string; $primary: string }>`
  border-color: ${props => props.$borderColor};
  color: ${props => props.$textSecondary};
  
  &:hover {
    border-color: ${props => props.$primary};
    color: ${props => props.$primary};
  }
`

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000,
})

interface SettingsData {
  theme: string
  language: string
  timezone: string
  chartSettings: {
    defaultTimeframe: string
    chartTheme: string
    showGrid: boolean
    showVolume: boolean
  }
  systemSettings: {
    autoRefresh: boolean
    refreshInterval: number
    dataRetention: number
    logLevel: string
  }
}

const defaultSettings: SettingsData = {
  theme: 'dark',
  language: 'zh',
  timezone: 'Asia/Shanghai',
  chartSettings: {
    defaultTimeframe: 'H1',
    chartTheme: 'dark',
    showGrid: true,
    showVolume: true,
  },
  systemSettings: {
    autoRefresh: true,
    refreshInterval: 5,
    dataRetention: 30,
    logLevel: 'info',
  }
}

const Settings: React.FC = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [isLoading, setIsLoading] = useState(false)
  const [showSaveIndicator, setShowSaveIndicator] = useState(false)
  const { theme, setTheme } = useTheme()
  const { setLanguage, t } = useLanguage()

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/settings')
      if (response.data.success) {
        const settings = response.data.data
        form.setFieldsValue({
          language: settings.language || 'zh',
          timezone: settings.timezone || 'Asia/Shanghai',
          theme: settings.theme || 'dark',
          defaultTimeframe: settings.chartSettings?.defaultTimeframe || 'H1',
          chartTheme: settings.chartSettings?.chartTheme || 'dark',
          showGrid: settings.chartSettings?.showGrid ?? true,
          showVolume: settings.chartSettings?.showVolume ?? true,
          autoRefresh: settings.systemSettings?.autoRefresh ?? true,
          refreshInterval: settings.systemSettings?.refreshInterval || 5,
          dataRetention: settings.systemSettings?.dataRetention || 30,
          logLevel: settings.systemSettings?.logLevel || 'info',
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      message.error(t('settings.loadFailed'))
      form.setFieldsValue(defaultSettings)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const saveSettings = async (values: any) => {
    try {
      const settingsData = {
        theme: values.theme,
        language: values.language,
        timezone: values.timezone,
        chartSettings: {
          defaultTimeframe: values.defaultTimeframe,
          chartTheme: values.chartTheme,
          showGrid: values.showGrid,
          showVolume: values.showVolume,
        },
        systemSettings: {
          autoRefresh: values.autoRefresh,
          refreshInterval: values.refreshInterval,
          dataRetention: values.dataRetention,
          logLevel: values.logLevel,
        },
      }

      const response = await apiClient.put('/settings', settingsData)
      if (response.data.success) {
        setShowSaveIndicator(true)
        setTimeout(() => setShowSaveIndicator(false), 2000)
      } else {
        message.error(response.data.error || t('settings.saveFailed'))
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      message.error(t('settings.saveFailed'))
    }
  }

  const handleValueChange = (changedValues: any, allValues: any) => {
    if (changedValues.theme) {
      setTheme(changedValues.theme)
    }
    if (changedValues.language) {
      setLanguage(changedValues.language)
    }
    saveSettings(allValues)
  }

  const handleReset = async () => {
    try {
      const response = await apiClient.post('/settings/reset')
      if (response.data.success) {
        message.success(t('settings.settingsReset'))
        setTheme('dark')
        setLanguage('zh')
        loadSettings()
      } else {
        message.error(response.data.error || t('settings.saveFailed'))
      }
    } catch (error) {
      console.error('Failed to reset settings:', error)
      message.error(t('settings.saveFailed'))
    }
  }

  return (
    <Container>
      <SaveIndicator visible={showSaveIndicator}>
        <CheckCircleOutlined />
        {t('settings.settingsSaved')}
      </SaveIndicator>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ color: theme.colors.text, margin: 0 }}>
          {t('settings.title')}
        </Title>
        <ResetButton 
          icon={<ReloadOutlined />} 
          onClick={handleReset}
          $borderColor={theme.colors.border}
          $textSecondary={theme.colors.textSecondary}
          $primary={theme.colors.primary}
        >
          {t('settings.resetToDefault')}
        </ResetButton>
      </div>

      <Spin spinning={isLoading}>
        <SettingsForm 
          form={form} 
          layout="vertical"
          onValuesChange={handleValueChange}
          $textSecondary={theme.colors.textSecondary}
          theme={theme}
        >
          <SettingsCard
            title={
              <>
                <UserOutlined />
                {t('settings.personal')}
              </>
            }
            $borderColor={theme.colors.border}
            $bgColor={`${theme.colors.backgroundLight}cc`}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item name="language" label={t('settings.language')}>
                  <Select>
                    <Option value="zh">简体中文</Option>
                    <Option value="en">English</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="timezone" label={t('settings.timezone')}>
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
                <Form.Item name="theme" label={t('settings.theme')}>
                  <Select>
                    <Option value="dark">{t('settings.darkTheme')}</Option>
                    <Option value="light">{t('settings.lightTheme')}</Option>
                    <Option value="auto">{t('settings.followSystem')}</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </SettingsCard>

          <SettingsCard
            title={
              <>
                <DatabaseOutlined />
                {t('settings.systemConfig')}
              </>
            }
            $borderColor={theme.colors.border}
            $bgColor={`${theme.colors.backgroundLight}cc`}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item name="autoRefresh" label={t('settings.autoRefresh')} valuePropName="checked">
                  <Switch checkedChildren="开" unCheckedChildren="关" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="refreshInterval" label={t('settings.refreshInterval')}>
                  <Select>
                    <Option value={1}>1秒</Option>
                    <Option value={5}>5秒</Option>
                    <Option value={10}>10秒</Option>
                    <Option value={30}>30秒</Option>
                    <Option value={60}>60秒</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item name="dataRetention" label={t('settings.dataRetention')}>
                  <Select>
                    <Option value={7}>7天</Option>
                    <Option value={30}>30天</Option>
                    <Option value={60}>60天</Option>
                    <Option value={90}>90天</Option>
                    <Option value={180}>180天</Option>
                    <Option value={365}>365天</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="logLevel" label={t('settings.logLevel')}>
                  <Select>
                    <Option value="debug">Debug (调试)</Option>
                    <Option value="info">Info (信息)</Option>
                    <Option value="warning">Warning (警告)</Option>
                    <Option value="error">Error (错误)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </SettingsCard>

          <SettingsCard
            title={
              <>
                <SkinOutlined />
                {t('settings.chartSettings')}
              </>
            }
            $borderColor={theme.colors.border}
            $bgColor={`${theme.colors.backgroundLight}cc`}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item name="defaultTimeframe" label={t('settings.defaultTimeframe')}>
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
                <Form.Item name="chartTheme" label={t('settings.chartTheme')}>
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
                <Form.Item name="showGrid" label={t('settings.showGrid')} valuePropName="checked">
                  <Switch checkedChildren="开" unCheckedChildren="关" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="showVolume" label={t('settings.showVolume')} valuePropName="checked">
                  <Switch checkedChildren="开" unCheckedChildren="关" />
                </Form.Item>
              </Col>
            </Row>
          </SettingsCard>
        </SettingsForm>
      </Spin>
    </Container>
  )
}

export default Settings

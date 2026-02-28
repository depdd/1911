import React, { useState, useEffect } from 'react'
import { Modal, message, Tabs, Spin, InputNumber, Select, Input, Popconfirm } from 'antd'
import styled from 'styled-components'
import { 
  RobotOutlined, PlayCircleOutlined, PauseCircleOutlined, 
  SettingOutlined, DeleteOutlined, PlusOutlined,
  ThunderboltOutlined, BarChartOutlined, FileTextOutlined
} from '@ant-design/icons'
import { strategyService, StrategyTemplate, StrategyInstance, StrategyParameter } from '../../services/strategyService'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage } from '../../contexts/LanguageContext'

const { TabPane } = Tabs

interface StrategyLog {
  timestamp: string
  level: string
  message: string
  details: Record<string, any>
}

const Container = styled.div`
  padding: 24px;
  min-height: 100vh;
`

const PageHeader = styled.div`
  margin-bottom: 32px;
`

const PageTitle = styled.h1<{ $primary: string }>`
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  
  .icon {
    font-size: 32px;
    background: linear-gradient(135deg, ${props => props.$primary} 0%, #00cc6a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`

const PageSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin: 0;
`

const TabsContainer = styled.div`
  .ant-tabs-nav {
    margin-bottom: 24px;
    
    &::before {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
  }
  
  .ant-tabs-tab {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
    padding: 12px 24px;
    
    &:hover {
      color: #00ff88;
    }
  }
  
  .ant-tabs-tab-active {
    .ant-tabs-tab-btn {
      color: #00ff88;
    }
  }
  
  .ant-tabs-ink-bar {
    background: #00ff88;
    height: 3px;
    border-radius: 2px;
  }
`

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
`

const TemplateCard = styled.div<{ $border: string }>`
  background: linear-gradient(180deg, rgba(26, 31, 58, 0.95) 0%, rgba(11, 14, 17, 0.98) 100%);
  border: 1px solid ${props => props.$border};
  border-radius: 20px;
  padding: 24px;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-4px);
    border-color: rgba(0, 255, 136, 0.3);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 136, 0.1);
  }
`

const TemplateHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`

const TemplateInfo = styled.div`
  flex: 1;
`

const TemplateName = styled.h3`
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px 0;
`

const TemplateCategory = styled.span<{ $primary: string }>`
  display: inline-block;
  padding: 4px 12px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 20px;
  color: ${props => props.$primary};
  font-size: 12px;
  font-weight: 500;
`

const RiskBadge = styled.span<{ $level: string }>`
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: ${props => {
    switch(props.$level) {
      case 'low': return 'rgba(0, 255, 136, 0.15)'
      case 'medium': return 'rgba(255, 193, 7, 0.15)'
      case 'high': return 'rgba(255, 77, 79, 0.15)'
      default: return 'rgba(255, 255, 255, 0.1)'
    }
  }};
  color: ${props => {
    switch(props.$level) {
      case 'low': return '#00ff88'
      case 'medium': return '#ffc107'
      case 'high': return '#ff4d4f'
      default: return '#ffffff'
    }
  }};
`

const TemplateDescription = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 20px 0;
`

const PerformanceRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
`

const PerformanceItem = styled.div`
  text-align: center;
`

const PerformanceLabel = styled.div`
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  margin-bottom: 4px;
`

const PerformanceValue = styled.div<{ $positive?: boolean }>`
  color: ${props => props.$positive ? '#00ff88' : '#ffffff'};
  font-size: 16px;
  font-weight: 700;
`

const AddButton = styled.button<{ $primary: string }>`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, ${props => props.$primary} 0%, #00cc6a 100%);
  border: none;
  border-radius: 12px;
  color: #0a0f29;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 255, 136, 0.3);
  }
`

const MyStrategyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
`

const StrategyCard = styled.div<{ $border: string }>`
  background: linear-gradient(180deg, rgba(26, 31, 58, 0.95) 0%, rgba(11, 14, 17, 0.98) 100%);
  border: 1px solid ${props => props.$border};
  border-radius: 20px;
  padding: 24px;
  transition: all 0.3s ease;
`

const StrategyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`

const StrategyName = styled.h3`
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
`

const StatusBadge = styled.span<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    switch(props.$status) {
      case 'running': return 'rgba(0, 255, 136, 0.15)'
      case 'stopped': return 'rgba(255, 255, 255, 0.1)'
      case 'error': return 'rgba(255, 77, 79, 0.15)'
      default: return 'rgba(255, 255, 255, 0.1)'
    }
  }};
  color: ${props => {
    switch(props.$status) {
      case 'running': return '#00ff88'
      case 'stopped': return 'rgba(255, 255, 255, 0.6)'
      case 'error': return '#ff4d4f'
      default: return 'rgba(255, 255, 255, 0.6)'
    }
  }};
  
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    animation: ${props => props.$status === 'running' ? 'pulse 2s infinite' : 'none'};
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const StrategyParams = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
`

const ParamItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ParamLabel = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
`

const ParamValue = styled.span`
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
`

const StrategyStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
`

const StatItem = styled.div`
  text-align: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
`

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  margin-bottom: 4px;
`

const StatValue = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.$positive ? '#00ff88' : props.$negative ? '#ff4d4f' : '#ffffff'};
`

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
`

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'default' }>`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  
  ${props => {
    switch(props.$variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
          color: #0a0f29;
          
          &:hover {
            box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
          }
        `
      case 'danger':
        return `
          background: rgba(255, 77, 79, 0.15);
          color: #ff4d4f;
          
          &:hover {
            background: rgba(255, 77, 79, 0.25);
          }
        `
      default:
        return `
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          
          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        `
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
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

const ModalForm = styled.div`
  .form-item {
    margin-bottom: 20px;
    
    label {
      display: block;
      color: rgba(255, 255, 255, 0.8);
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    
    .ant-input,
    .ant-input-number,
    .ant-select-selector {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 8px !important;
      color: #ffffff !important;
      
      &:hover,
      &:focus {
        border-color: rgba(0, 255, 136, 0.5) !important;
      }
    }
    
    .ant-select-arrow {
      color: rgba(255, 255, 255, 0.4);
    }
    
    .ant-select-selection-item {
      color: #ffffff !important;
    }
  }
`

const StrategyStore: React.FC = () => {
  const [templates, setTemplates] = useState<StrategyTemplate[]>([])
  const [strategies, setStrategies] = useState<StrategyInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [logModalVisible, setLogModalVisible] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyInstance | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [strategyName, setStrategyName] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [logs, setLogs] = useState<StrategyLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  
  const { theme } = useTheme()
  const { t } = useLanguage()

  useEffect(() => {
    loadData()
    const interval = setInterval(loadStrategies, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    await Promise.all([loadTemplates(), loadStrategies()])
    setLoading(false)
  }

  const loadTemplates = async () => {
    const response = await strategyService.getTemplates()
    if (response.success && response.data) {
      setTemplates(response.data.templates)
    }
  }

  const loadStrategies = async () => {
    const response = await strategyService.getStrategies()
    if (response.success && response.data) {
      setStrategies(response.data.strategies)
    }
  }

  const handleOpenCreateModal = (template: StrategyTemplate) => {
    setSelectedTemplate(template)
    const defaultParams: Record<string, any> = {}
    template.parameters_schema.forEach(param => {
      defaultParams[param.name] = param.default
    })
    setFormData(defaultParams)
    setStrategyName(`${template.name} - ${new Date().toLocaleDateString()}`)
    setCreateModalVisible(true)
  }

  const handleCreateStrategy = async () => {
    if (!selectedTemplate || !strategyName) {
      message.error(t('common.error'))
      return
    }

    setActionLoading('create')
    const response = await strategyService.createStrategy({
      template_id: selectedTemplate.id,
      name: strategyName,
      parameters: formData
    })

    if (response.success) {
      message.success(t('strategies.deploySuccess'))
      setCreateModalVisible(false)
      loadStrategies()
    } else {
      message.error(response.error || t('strategies.deployFailed'))
    }
    setActionLoading(null)
  }

  const handleOpenConfigModal = (strategy: StrategyInstance) => {
    setSelectedStrategy(strategy)
    setFormData(strategy.parameters)
    setStrategyName(strategy.name)
    setConfigModalVisible(true)
  }

  const handleUpdateStrategy = async () => {
    if (!selectedStrategy) return

    setActionLoading('update')
    const response = await strategyService.updateStrategy(selectedStrategy.strategy_id, {
      name: strategyName,
      parameters: formData
    })

    if (response.success) {
      message.success(t('common.success'))
      setConfigModalVisible(false)
      loadStrategies()
    } else {
      message.error(response.error || t('common.error'))
    }
    setActionLoading(null)
  }

  const handleStartStrategy = async (strategyId: string) => {
    setActionLoading(strategyId)
    const response = await strategyService.startStrategy(strategyId)
    if (response.success) {
      message.success(t('strategies.startSuccess'))
      loadStrategies()
    } else {
      message.error(response.error || t('common.error'))
    }
    setActionLoading(null)
  }

  const handleStopStrategy = async (strategyId: string) => {
    setActionLoading(strategyId)
    const response = await strategyService.stopStrategy(strategyId)
    if (response.success) {
      message.success(t('strategies.stopSuccess'))
      loadStrategies()
    } else {
      message.error(response.error || t('common.error'))
    }
    setActionLoading(null)
  }

  const handleDeleteStrategy = async (strategyId: string) => {
    const response = await strategyService.deleteStrategy(strategyId)
    if (response.success) {
      message.success(t('strategies.deleteSuccess'))
      loadStrategies()
    } else {
      message.error(response.error || t('common.error'))
    }
  }

  const handleViewLogs = async (strategy: StrategyInstance) => {
    setSelectedStrategy(strategy)
    setLogModalVisible(true)
    setLogsLoading(true)
    
    try {
      const response = await strategyService.getStrategyLogs(strategy.strategy_id)
      if (response.success && response.data) {
        setLogs(response.data)
      }
    } catch (error) {
      message.error(t('common.error'))
    } finally {
      setLogsLoading(false)
    }
  }

  const handleClearLogs = async () => {
    if (!selectedStrategy) return
    
    try {
      const response = await strategyService.clearStrategyLogs(selectedStrategy.strategy_id)
      if (response.success) {
        setLogs([])
        message.success(t('common.success'))
      }
    } catch (error) {
      message.error(t('common.error'))
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO': return '#00ff88'
      case 'WARNING': return '#ffc107'
      case 'ERROR': return '#ff4d4f'
      case 'TRADE': return '#00ccff'
      default: return '#ffffff'
    }
  }

  const renderParameterInput = (param: StrategyParameter) => {
    const value = formData[param.name] ?? param.default

    switch (param.type) {
      case 'number':
        return (
          <InputNumber
            style={{ width: '100%' }}
            min={param.min}
            max={param.max}
            step={param.step || 1}
            value={value}
            onChange={(val) => setFormData({ ...formData, [param.name]: val })}
          />
        )
      case 'select':
        return (
          <Select
            style={{ width: '100%' }}
            value={value}
            onChange={(val) => setFormData({ ...formData, [param.name]: val })}
            options={param.options?.map(opt => ({ label: opt, value: opt }))}
          />
        )
      default:
        return (
          <Input
            value={value}
            onChange={(e) => setFormData({ ...formData, [param.name]: e.target.value })}
          />
        )
    }
  }

  const getRiskText = (level: string) => {
    switch (level) {
      case 'low': return t('strategies.riskLow')
      case 'medium': return t('strategies.riskMedium')
      case 'high': return t('strategies.riskHigh')
      default: return t('common.info')
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return t('strategies.running')
      case 'stopped': return t('strategies.stopped')
      case 'error': return t('common.error')
      default: return t('common.info')
    }
  }

  if (loading) {
    return (
      <Container>
        <EmptyState>
          <Spin size="large" style={{ color: '#00ff88' }} />
          <div className="title" style={{ marginTop: 20 }}>{t('common.loading')}</div>
        </EmptyState>
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader>
        <PageTitle $primary={theme.colors.primary}>
          <RobotOutlined className="icon" />
          {t('strategies.title')}
        </PageTitle>
        <PageSubtitle>{t('strategies.subtitle')}</PageSubtitle>
      </PageHeader>

      <TabsContainer>
        <Tabs defaultActiveKey="market">
          <TabPane
            tab={<span><ThunderboltOutlined /> {t('strategies.template')}</span>}
            key="market"
          >
            <TemplateGrid>
              {templates.map(template => (
                <TemplateCard key={template.id} $border={theme.colors.border} onClick={() => handleOpenCreateModal(template)}>
                  <TemplateHeader>
                    <TemplateInfo>
                      <TemplateName>{template.name}</TemplateName>
                      <TemplateCategory $primary={theme.colors.primary}>{template.category}</TemplateCategory>
                    </TemplateInfo>
                    <RiskBadge $level={template.risk_level}>
                      {getRiskText(template.risk_level)}
                    </RiskBadge>
                  </TemplateHeader>

                  <TemplateDescription>{template.description}</TemplateDescription>

                  <PerformanceRow>
                    <PerformanceItem>
                      <PerformanceLabel>{t('strategies.winRate')}</PerformanceLabel>
                      <PerformanceValue $positive>{template.performance.win_rate}%</PerformanceValue>
                    </PerformanceItem>
                    <PerformanceItem>
                      <PerformanceLabel>{t('strategies.profitFactor')}</PerformanceLabel>
                      <PerformanceValue $positive>{template.performance.profit_factor}</PerformanceValue>
                    </PerformanceItem>
                    <PerformanceItem>
                      <PerformanceLabel>{t('strategies.maxDrawdown')}</PerformanceLabel>
                      <PerformanceValue>{template.performance.max_drawdown}%</PerformanceValue>
                    </PerformanceItem>
                    <PerformanceItem>
                      <PerformanceLabel>{t('strategies.avgProfit')}</PerformanceLabel>
                      <PerformanceValue $positive>${template.performance.avg_trade}</PerformanceValue>
                    </PerformanceItem>
                  </PerformanceRow>

                  <AddButton $primary={theme.colors.primary}>
                    <PlusOutlined /> {t('strategies.addStrategy')}
                  </AddButton>
                </TemplateCard>
              ))}
            </TemplateGrid>
          </TabPane>

          <TabPane
            tab={<span><BarChartOutlined /> {t('strategies.myStrategies')}</span>}
            key="my-strategies"
          >
            {strategies.length === 0 ? (
              <EmptyState>
                <div className="icon">📊</div>
                <div className="title">{t('strategies.noStrategies')}</div>
                <div className="subtitle">{t('strategies.selectFromMarket')}</div>
              </EmptyState>
            ) : (
              <MyStrategyGrid>
                {strategies.map(strategy => (
                  <StrategyCard key={strategy.strategy_id} $border={theme.colors.border}>
                    <StrategyHeader>
                      <StrategyName>{strategy.name}</StrategyName>
                      <StatusBadge $status={strategy.status}>
                        <span className="dot" />
                        {getStatusText(strategy.status)}
                      </StatusBadge>
                    </StrategyHeader>

                    <StrategyParams>
                      <ParamItem>
                        <ParamLabel>{t('dashboard.symbol')}</ParamLabel>
                        <ParamValue>{strategy.parameters.symbol}</ParamValue>
                      </ParamItem>
                      <ParamItem>
                        <ParamLabel>{t('analytics.timeRange')}</ParamLabel>
                        <ParamValue>{strategy.parameters.timeframe}</ParamValue>
                      </ParamItem>
                      <ParamItem>
                        <ParamLabel>{t('trading.volume')}</ParamLabel>
                        <ParamValue>{strategy.parameters.volume}</ParamValue>
                      </ParamItem>
                      <ParamItem>
                        <ParamLabel>{t('common.time')}</ParamLabel>
                        <ParamValue>
                          {strategy.created_at ? new Date(strategy.created_at).toLocaleDateString() : '-'}
                        </ParamValue>
                      </ParamItem>
                    </StrategyParams>

                    {strategy.runtime && (
                      <StrategyStats>
                        <StatItem>
                          <StatLabel>{t('strategies.totalTrades')}</StatLabel>
                          <StatValue>{strategy.runtime.total_trades}</StatValue>
                        </StatItem>
                        <StatItem>
                          <StatLabel>{t('strategies.winRate')}</StatLabel>
                          <StatValue $positive={strategy.runtime.win_rate >= 50} $negative={strategy.runtime.win_rate < 50}>
                            {strategy.runtime.win_rate.toFixed(1)}%
                          </StatValue>
                        </StatItem>
                        <StatItem>
                          <StatLabel>{t('strategies.totalProfit')}</StatLabel>
                          <StatValue $positive={strategy.runtime.total_profit >= 0} $negative={strategy.runtime.total_profit < 0}>
                            {strategy.runtime.total_profit >= 0 ? '+' : ''}{strategy.runtime.total_profit.toFixed(2)}
                          </StatValue>
                        </StatItem>
                      </StrategyStats>
                    )}

                    <ActionButtons>
                      {strategy.status === 'running' ? (
                        <ActionButton 
                          onClick={() => handleStopStrategy(strategy.strategy_id)}
                          disabled={actionLoading === strategy.strategy_id}
                        >
                          <PauseCircleOutlined /> {t('strategies.stop')}
                        </ActionButton>
                      ) : (
                        <ActionButton 
                          $variant="primary"
                          onClick={() => handleStartStrategy(strategy.strategy_id)}
                          disabled={actionLoading === strategy.strategy_id}
                        >
                          <PlayCircleOutlined /> {t('strategies.start')}
                        </ActionButton>
                      )}
                      <ActionButton onClick={() => handleViewLogs(strategy)}>
                        <FileTextOutlined /> {t('strategies.logs')}
                      </ActionButton>
                      <ActionButton onClick={() => handleOpenConfigModal(strategy)}>
                        <SettingOutlined /> {t('strategies.configure')}
                      </ActionButton>
                      <Popconfirm
                        title={t('strategies.confirmDelete')}
                        onConfirm={() => handleDeleteStrategy(strategy.strategy_id)}
                        okText={t('common.confirm')}
                        cancelText={t('common.cancel')}
                        getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
                      >
                        <ActionButton $variant="danger">
                          <DeleteOutlined />
                        </ActionButton>
                      </Popconfirm>
                    </ActionButtons>
                  </StrategyCard>
                ))}
              </MyStrategyGrid>
            )}
          </TabPane>
        </Tabs>
      </TabsContainer>

      <Modal
        title={t('strategies.addStrategy')}
        open={createModalVisible}
        onOk={handleCreateStrategy}
        onCancel={() => setCreateModalVisible(false)}
        confirmLoading={actionLoading === 'create'}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        width={600}
        style={{ top: 50 }}
      >
        {selectedTemplate && (
          <ModalForm>
            <div className="form-item">
              <label>{t('strategies.strategyName')}</label>
              <Input
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder={t('strategies.strategyName')}
              />
            </div>
            {selectedTemplate.parameters_schema.map(param => (
              <div className="form-item" key={param.name}>
                <label>{param.label}</label>
                {renderParameterInput(param)}
              </div>
            ))}
          </ModalForm>
        )}
      </Modal>

      <Modal
        title={t('strategies.configure')}
        open={configModalVisible}
        onOk={handleUpdateStrategy}
        onCancel={() => setConfigModalVisible(false)}
        confirmLoading={actionLoading === 'update'}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        width={600}
        style={{ top: 50 }}
      >
        {selectedStrategy && (
          <ModalForm>
            <div className="form-item">
              <label>{t('strategies.strategyName')}</label>
              <Input
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder={t('strategies.strategyName')}
              />
            </div>
            {templates
              .find(t => t.id === selectedStrategy.template_id)
              ?.parameters_schema.map(param => (
                <div className="form-item" key={param.name}>
                  <label>{param.label}</label>
                  {renderParameterInput(param)}
                </div>
              ))}
          </ModalForm>
        )}
      </Modal>

      <Modal
        title={t('strategies.logs')}
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={[
          <ActionButton key="clear" onClick={handleClearLogs} style={{ marginRight: 8 }}>
            {t('strategies.clearLogs')}
          </ActionButton>,
          <ActionButton key="close" $variant="primary" onClick={() => setLogModalVisible(false)}>
            {t('common.close')}
          </ActionButton>
        ]}
        width={800}
        style={{ top: 50 }}
      >
        <LogContainer>
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin style={{ color: '#00ff88' }} />
            </div>
          ) : logs.length === 0 ? (
            <EmptyLogState>{t('strategies.noLogs')}</EmptyLogState>
          ) : (
            logs.map((log, index) => (
              <LogEntry key={index}>
                <LogHeader>
                  <LogTime>{new Date(log.timestamp).toLocaleString()}</LogTime>
                  <LogLevel $color={getLevelColor(log.level)}>{log.level}</LogLevel>
                </LogHeader>
                <LogMessage>{log.message}</LogMessage>
                {log.details && Object.keys(log.details).length > 0 && (
                  <LogDetails>
                    {Object.entries(log.details).map(([key, value]) => (
                      <LogDetailItem key={key}>
                        <span className="key">{key}:</span>
                        <span className="value">{String(value)}</span>
                      </LogDetailItem>
                    ))}
                  </LogDetails>
                )}
              </LogEntry>
            ))
          )}
        </LogContainer>
      </Modal>
    </Container>
  )
}

export default StrategyStore

const LogContainer = styled.div`
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 136, 0.3);
    border-radius: 3px;
  }
`

const EmptyLogState = styled.div`
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.4);
`

const LogEntry = styled.div`
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border-left: 3px solid rgba(0, 255, 136, 0.3);
`

const LogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`

const LogTime = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
`

const LogLevel = styled.span<{ $color: string }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`

const LogMessage = styled.div`
  color: #ffffff;
  font-size: 13px;
  margin-bottom: 6px;
`

const LogDetails = styled.div`
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-size: 11px;
`

const LogDetailItem = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .key {
    color: rgba(255, 255, 255, 0.5);
    min-width: 80px;
  }
  
  .value {
    color: #00ff88;
  }
`

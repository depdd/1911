import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Card, Table, Input, Select, Button, Tag, Modal, Form, message, Tabs, Statistic, Row, Col, Switch, Descriptions, Space, Popconfirm } from 'antd'
import { 
  UserOutlined, 
  RobotOutlined,
  DashboardOutlined, 
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  AppstoreAddOutlined,
  UndoOutlined,
  RestOutlined
} from '@ant-design/icons'
import { theme } from '../../styles/theme'
import { apiClient } from '../../services/userAuthService'

const { TabPane } = Tabs
const { Option } = Select
const { TextArea } = Input

const AdminContainer = styled.div`
  padding: 20px;
  background: rgba(19, 23, 42, 0.4);
  border-radius: ${theme.borderRadius.lg};
  min-height: calc(100vh - 120px);
`

const PageTitle = styled.h2`
  color: ${theme.colors.text};
  font-size: 24px;
  margin-bottom: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`

const StatsCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6) !important;
  border: 1px solid ${theme.colors.border} !important;
  border-radius: ${theme.borderRadius.md} !important;
  margin-bottom: 20px;

  .ant-card-body {
    padding: 20px;
  }

  .ant-statistic-title {
    color: ${theme.colors.textSecondary} !important;
  }

  .ant-statistic-content {
    color: ${theme.colors.text} !important;
  }
`

const ContentCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6) !important;
  border: 1px solid ${theme.colors.border} !important;
  border-radius: ${theme.borderRadius.md} !important;

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

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;

  .ant-input, .ant-select-selector, .ant-input-affix-wrapper {
    background: rgba(19, 23, 42, 0.8) !important;
    border: 1px solid ${theme.colors.border} !important;
    color: ${theme.colors.text} !important;
  }

  .ant-input::placeholder {
    color: ${theme.colors.textTertiary} !important;
  }
`

const StyledTable = styled(Table)`
  .ant-table {
    background: transparent !important;
  }

  .ant-table-thead > tr > th {
    background: rgba(19, 23, 42, 0.8) !important;
    color: ${theme.colors.textSecondary} !important;
    border-bottom: 1px solid ${theme.colors.border} !important;
  }

  .ant-table-tbody > tr > td {
    background: transparent !important;
    color: ${theme.colors.text} !important;
    border-bottom: 1px solid ${theme.colors.borderLight} !important;
  }

  .ant-table-tbody > tr:hover > td {
    background: rgba(0, 212, 255, 0.05) !important;
  }

  .ant-pagination {
    margin-top: 16px;
    
    .ant-pagination-item {
      background: rgba(19, 23, 42, 0.8);
      border: 1px solid ${theme.colors.border};
      
      a {
        color: ${theme.colors.text};
      }
      
      &:hover, &-active {
        border-color: ${theme.colors.primary};
        
        a {
          color: ${theme.colors.primary};
        }
      }
    }
  }
`

const ActionButton = styled(Button)`
  &.ant-btn-primary {
    background: ${theme.gradients.primary};
    border: none;
    
    &:hover {
      opacity: 0.9;
    }
  }
  
  &.ant-btn-default {
    background: rgba(19, 23, 42, 0.8);
    border: 1px solid ${theme.colors.border};
    color: ${theme.colors.text};
    
    &:hover {
      border-color: ${theme.colors.primary};
      color: ${theme.colors.primary};
    }
  }
`

const StyledTag = styled(Tag)`
  &.ant-tag {
    border-radius: 4px;
  }
`

const StyledModal = styled(Modal)`
  .ant-modal-content {
    background: rgba(26, 31, 58, 0.95);
    border: 1px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.lg};
  }

  .ant-modal-header {
    background: transparent;
    border-bottom: 1px solid ${theme.colors.border};
    
    .ant-modal-title {
      color: ${theme.colors.text};
    }
  }

  .ant-modal-body {
    color: ${theme.colors.text};
  }

  .ant-modal-footer {
    border-top: 1px solid ${theme.colors.border};
  }

  .ant-form-item-label > label {
    color: ${theme.colors.textSecondary};
  }

  .ant-input, .ant-select-selector, .ant-input-affix-wrapper {
    background: rgba(19, 23, 42, 0.8) !important;
    border: 1px solid ${theme.colors.border} !important;
    color: ${theme.colors.text} !important;
  }
`

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>({})
  
  const [users, setUsers] = useState<any[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersMembership, setUsersMembership] = useState('')
  const [usersStatus, setUsersStatus] = useState('')
  
  const [strategies, setStrategies] = useState<any[]>([])
  const [strategiesTotal, setStrategiesTotal] = useState(0)
  const [strategiesPage, setStrategiesPage] = useState(1)
  const [strategiesSearch, setStrategiesSearch] = useState('')
  const [strategiesType, setStrategiesType] = useState('')
  const [strategiesStatus, setStrategiesStatus] = useState('')
  
  const [operations, setOperations] = useState<any[]>([])
  const [operationsTotal, setOperationsTotal] = useState(0)
  const [operationsPage, setOperationsPage] = useState(1)
  
  const [userDetailVisible, setUserDetailVisible] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [strategyDetailVisible, setStrategyDetailVisible] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState<any>(null)
  const [editStrategyVisible, setEditStrategyVisible] = useState(false)
  const [editMembershipVisible, setEditMembershipVisible] = useState(false)
  const [editForm] = Form.useForm()
  const [membershipForm] = Form.useForm()
  
  const [templates, setTemplates] = useState<any[]>([])
  const [templateModalVisible, setTemplateModalVisible] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [templateForm] = Form.useForm()
  
  const [strategyFiles, setStrategyFiles] = useState<any[]>([])
  const [recycledStrategies, setRecycledStrategies] = useState<any[]>([])
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [uploadForm] = Form.useForm()
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats()
    } else if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'strategies') {
      fetchStrategies()
    } else if (activeTab === 'templates') {
      fetchTemplates()
    } else if (activeTab === 'strategy-files') {
      fetchStrategyFiles()
      fetchRecycledStrategies()
    } else if (activeTab === 'operations') {
      fetchOperations()
    }
  }, [activeTab, usersPage, strategiesPage, operationsPage])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/admin/stats')
      if (response.data.success) {
        setStats(response.data.data)
      }
    } catch (error) {
      message.error('获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', usersPage.toString())
      params.append('per_page', '10')
      if (usersSearch) params.append('search', usersSearch)
      if (usersMembership) params.append('membership', usersMembership)
      if (usersStatus) params.append('status', usersStatus)
      
      const response = await apiClient.get(`/api/admin/users?${params.toString()}`)
      if (response.data.success) {
        setUsers(response.data.data.users)
        setUsersTotal(response.data.data.total)
      }
    } catch (error) {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchStrategies = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', strategiesPage.toString())
      params.append('per_page', '10')
      if (strategiesSearch) params.append('search', strategiesSearch)
      if (strategiesType) params.append('type', strategiesType)
      if (strategiesStatus) params.append('status', strategiesStatus)
      
      const response = await apiClient.get(`/api/admin/strategies?${params.toString()}`)
      if (response.data.success) {
        setStrategies(response.data.data.strategies)
        setStrategiesTotal(response.data.data.total)
      }
    } catch (error) {
      message.error('获取策略列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchOperations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', operationsPage.toString())
      params.append('per_page', '20')
      
      const response = await apiClient.get(`/api/admin/operations?${params.toString()}`)
      if (response.data.success) {
        setOperations(response.data.data.logs)
        setOperationsTotal(response.data.data.total)
      }
    } catch (error) {
      message.error('获取操作日志失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/admin/strategy-templates')
      if (response.data.success) {
        setTemplates(response.data.data)
      }
    } catch (error) {
      message.error('获取策略模板失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    templateForm.resetFields()
    templateForm.setFieldsValue({
      risk_level: 'medium',
      default_parameters: '{}',
      parameters_schema: '[]',
      performance: '{}'
    })
    setTemplateModalVisible(true)
  }

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template)
    templateForm.setFieldsValue({
      template_id: template.template_id,
      name: template.name,
      description: template.description,
      category: template.category,
      risk_level: template.risk_level,
      default_parameters: JSON.stringify(template.default_parameters || {}, null, 2),
      parameters_schema: JSON.stringify(template.parameters_schema || [], null, 2),
      performance: JSON.stringify(template.performance || {}, null, 2),
      is_active: template.is_active
    })
    setTemplateModalVisible(true)
  }

  const handleSaveTemplate = async () => {
    try {
      const values = await templateForm.validateFields()
      
      let defaultParameters, parametersSchema, performance
      try {
        defaultParameters = JSON.parse(values.default_parameters || '{}')
        parametersSchema = JSON.parse(values.parameters_schema || '[]')
        performance = JSON.parse(values.performance || '{}')
      } catch (e) {
        message.error('JSON格式错误，请检查参数格式')
        return
      }
      
      const data = {
        template_id: values.template_id,
        name: values.name,
        description: values.description,
        category: values.category,
        risk_level: values.risk_level,
        default_parameters: defaultParameters,
        parameters_schema: parametersSchema,
        performance: performance,
        is_active: values.is_active
      }
      
      if (editingTemplate) {
        const response = await apiClient.put(`/api/admin/strategy-templates/${editingTemplate.id}`, data)
        if (response.data.success) {
          message.success('策略模板更新成功')
          setTemplateModalVisible(false)
          fetchTemplates()
        }
      } else {
        const response = await apiClient.post('/api/admin/strategy-templates', data)
        if (response.data.success) {
          message.success('策略模板创建成功')
          setTemplateModalVisible(false)
          fetchTemplates()
        }
      }
    } catch (error) {
      message.error(editingTemplate ? '更新策略模板失败' : '创建策略模板失败')
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    try {
      const response = await apiClient.delete(`/api/admin/strategy-templates/${id}`)
      if (response.data.success) {
        message.success('策略模板删除成功')
        fetchTemplates()
      }
    } catch (error) {
      message.error('删除策略模板失败')
    }
  }

  const fetchStrategyFiles = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/admin/strategy-files')
      if (response.data.success) {
        setStrategyFiles(response.data.data)
      }
    } catch (error) {
      message.error('获取策略文件列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecycledStrategies = async () => {
    try {
      const response = await apiClient.get('/api/admin/strategy-files/recycled')
      if (response.data.success) {
        setRecycledStrategies(response.data.data)
      }
    } catch (error) {
      console.error('获取回收站策略失败', error)
    }
  }

  const handleRestoreStrategy = async (strategyId: string) => {
    try {
      const response = await apiClient.post(`/api/admin/strategy-files/${strategyId}/restore`)
      if (response.data.success) {
        message.success('策略恢复成功')
        fetchStrategyFiles()
        fetchRecycledStrategies()
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '恢复策略失败')
    }
  }

  const handlePermanentDelete = async (strategyId: string) => {
    try {
      const response = await apiClient.delete(`/api/admin/strategy-files/${strategyId}/permanent`)
      if (response.data.success) {
        message.success('策略已永久删除')
        fetchRecycledStrategies()
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '永久删除失败')
    }
  }

  const handleUploadStrategy = () => {
    uploadForm.resetFields()
    uploadForm.setFieldsValue({
      category: '自定义',
      risk_level: 'medium'
    })
    setUploadModalVisible(true)
  }

  const handleUploadSubmit = async () => {
    try {
      const values = await uploadForm.validateFields()
      const file = values.file?.file?.originFileObj || values.file?.file
      
      if (!file) {
        message.error('请选择策略文件')
        return
      }
      
      setUploading(true)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('strategy_id', values.strategy_id || '')
      formData.append('name', values.name || '')
      formData.append('description', values.description || '')
      formData.append('category', values.category || '自定义')
      formData.append('risk_level', values.risk_level || 'medium')
      formData.append('class_name', values.class_name || '')
      
      const response = await apiClient.post('/api/admin/strategy-files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      if (response.data.success) {
        message.success('策略上传成功')
        setUploadModalVisible(false)
        fetchStrategyFiles()
        fetchTemplates()
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '策略上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteStrategyFile = async (strategyId: string) => {
    try {
      const response = await apiClient.delete(`/api/admin/strategy-files/${strategyId}`)
      if (response.data.success) {
        message.success('策略删除成功')
        fetchStrategyFiles()
        fetchTemplates()
      }
    } catch (error: any) {
      const errorData = error.response?.data
      if (errorData?.in_use && errorData?.users) {
        Modal.error({
          title: '无法删除策略',
          content: (
            <div>
              <p>以下 {errorData.count} 位用户正在使用该策略：</p>
              <ul style={{ maxHeight: '200px', overflow: 'auto' }}>
                {errorData.users.map((u: any, idx: number) => (
                  <li key={idx}>
                    <strong>{u.username}</strong> ({u.email}) - {u.strategy_name}
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: '10px', color: '#ff4d4f' }}>
                请先停止这些用户的策略后再删除。
              </p>
            </div>
          )
        })
      } else {
        message.error(errorData?.error || '删除策略失败')
      }
    }
  }

  const handleViewUser = async (userId: number) => {
    try {
      const response = await apiClient.get(`/api/admin/users/${userId}`)
      if (response.data.success) {
        setCurrentUser(response.data.data)
        setUserDetailVisible(true)
      }
    } catch (error) {
      message.error('获取用户详情失败')
    }
  }

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await apiClient.put(`/api/admin/users/${userId}/status`, {
        is_active: !currentStatus
      })
      if (response.data.success) {
        message.success('用户状态已更新')
        fetchUsers()
      }
    } catch (error) {
      message.error('更新用户状态失败')
    }
  }

  const handleEditMembership = (user: any) => {
    setCurrentUser(user)
    membershipForm.setFieldsValue({
      membership_level: user.membership_level,
      expire_days: 30
    })
    setEditMembershipVisible(true)
  }

  const handleSaveMembership = async () => {
    try {
      const values = await membershipForm.validateFields()
      const response = await apiClient.put(`/api/admin/users/${currentUser.id}/membership`, values)
      if (response.data.success) {
        message.success('会员等级已更新')
        setEditMembershipVisible(false)
        fetchUsers()
      }
    } catch (error) {
      message.error('更新会员等级失败')
    }
  }

  const handleViewStrategy = async (strategyId: number) => {
    try {
      const response = await apiClient.get(`/api/admin/strategies/${strategyId}`)
      if (response.data.success) {
        setCurrentStrategy(response.data.data)
        setStrategyDetailVisible(true)
      }
    } catch (error) {
      message.error('获取策略详情失败')
    }
  }

  const handleEditStrategy = (strategy: any) => {
    setCurrentStrategy(strategy)
    editForm.setFieldsValue({
      name: strategy.name,
      description: strategy.description,
      is_active: strategy.is_active
    })
    setEditStrategyVisible(true)
  }

  const handleSaveStrategy = async () => {
    try {
      const values = await editForm.validateFields()
      const response = await apiClient.put(`/api/admin/strategies/${currentStrategy.id}`, values)
      if (response.data.success) {
        message.success('策略已更新')
        setEditStrategyVisible(false)
        fetchStrategies()
      }
    } catch (error) {
      message.error('更新策略失败')
    }
  }

  const handleDeleteStrategy = async (strategyId: number) => {
    try {
      const response = await apiClient.delete(`/api/admin/strategies/${strategyId}`)
      if (response.data.success) {
        message.success('策略已删除')
        fetchStrategies()
      }
    } catch (error) {
      message.error('删除策略失败')
    }
  }

  const getMembershipColor = (level: string) => {
    const colors: Record<string, string> = {
      free: '#9ca3af',
      basic: '#10b981',
      pro: '#3b82f6',
      enterprise: '#8b5cf6',
      admin: '#ef4444'
    }
    return colors[level] || '#9ca3af'
  }

  const getStatusTag = (isActive: boolean) => (
    <StyledTag color={isActive ? 'success' : 'error'}>
      {isActive ? '活跃' : '禁用'}
    </StyledTag>
  )

  const userColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '会员等级',
      dataIndex: 'membership_level',
      key: 'membership_level',
      render: (level: string) => (
        <StyledTag color={getMembershipColor(level)}>
          {level.toUpperCase()}
        </StyledTag>
      )
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => getStatusTag(isActive)
    },
    {
      title: 'MT5账户',
      dataIndex: 'mt5_accounts_count',
      key: 'mt5_accounts_count',
      width: 100
    },
    {
      title: '策略数',
      dataIndex: 'strategies_count',
      key: 'strategies_count',
      width: 80
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space size="small">
          <ActionButton size="small" icon={<EyeOutlined />} onClick={() => handleViewUser(record.id)}>
            查看
          </ActionButton>
          <ActionButton size="small" icon={<EditOutlined />} onClick={() => handleEditMembership(record)}>
            会员
          </ActionButton>
          <Popconfirm
            title={`确定${record.is_active ? '禁用' : '启用'}该用户?`}
            onConfirm={() => handleToggleUserStatus(record.id, record.is_active)}
          >
            <ActionButton size="small" danger={record.is_active}>
              {record.is_active ? '禁用' : '启用'}
            </ActionButton>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const strategyColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '模板ID',
      dataIndex: 'template_id',
      key: 'template_id'
    },
    {
      title: '品种',
      dataIndex: 'symbol',
      key: 'symbol'
    },
    {
      title: '周期',
      dataIndex: 'timeframe',
      key: 'timeframe'
    },
    {
      title: '所属用户',
      key: 'user',
      render: (_: any, record: any) => (
        <span>{record.user?.username} ({record.user?.email})</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          running: { color: 'green', text: '运行中' },
          stopped: { color: 'default', text: '已停止' },
          paused: { color: 'orange', text: '已暂停' },
          error: { color: 'red', text: '错误' }
        }
        const config = statusConfig[status] || { color: 'default', text: status }
        return <StyledTag color={config.color}>{config.text}</StyledTag>
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space size="small">
          <ActionButton size="small" icon={<EyeOutlined />} onClick={() => handleViewStrategy(record.id)}>
            查看
          </ActionButton>
          <ActionButton size="small" icon={<EditOutlined />} onClick={() => handleEditStrategy(record)}>
            编辑
          </ActionButton>
          <Popconfirm
            title="确定删除该策略?"
            onConfirm={() => handleDeleteStrategy(record.id)}
          >
            <ActionButton size="small" danger icon={<DeleteOutlined />}>
              删除
            </ActionButton>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const operationColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation_type',
      render: (type: string) => (
        <StyledTag color="blue">{type}</StyledTag>
      )
    },
    {
      title: '操作详情',
      dataIndex: 'operation_detail',
      key: 'operation_detail',
      ellipsis: true
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 140
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    }
  ]

  const templateColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '模板ID',
      dataIndex: 'template_id',
      key: 'template_id',
      width: 120
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (level: string) => {
        const colors: Record<string, string> = {
          low: 'green',
          medium: 'orange',
          high: 'red'
        }
        const labels: Record<string, string> = {
          low: '低',
          medium: '中',
          high: '高'
        }
        return <StyledTag color={colors[level]}>{labels[level] || level}</StyledTag>
      }
    },
    {
      title: '胜率',
      dataIndex: 'performance',
      key: 'win_rate',
      width: 80,
      render: (perf: any) => perf?.win_rate ? `${perf.win_rate}%` : '-'
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => getStatusTag(isActive)
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Space size="small">
          <ActionButton size="small" icon={<EditOutlined />} onClick={() => handleEditTemplate(record)}>
            编辑
          </ActionButton>
          <Popconfirm
            title="确定删除该策略模板?"
            onConfirm={() => handleDeleteTemplate(record.id)}
          >
            <ActionButton size="small" danger icon={<DeleteOutlined />}>
              删除
            </ActionButton>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const strategyFileColumns = [
    {
      title: '策略ID',
      dataIndex: 'id',
      key: 'id',
      width: 120
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (level: string) => {
        const colors: Record<string, string> = {
          low: 'green',
          medium: 'orange',
          high: 'red'
        }
        const labels: Record<string, string> = {
          low: '低',
          medium: '中',
          high: '高'
        }
        return <StyledTag color={colors[level]}>{labels[level] || level}</StyledTag>
      }
    },
    {
      title: '类型',
      dataIndex: 'is_builtin',
      key: 'is_builtin',
      width: 80,
      render: (isBuiltin: boolean) => (
        <StyledTag color={isBuiltin ? 'blue' : 'green'}>
          {isBuiltin ? '内置' : '自定义'}
        </StyledTag>
      )
    },
    {
      title: '使用情况',
      key: 'usage',
      width: 120,
      render: (_: any, record: any) => {
        const running = record.running_count || 0
        const total = record.total_count || 0
        return (
          <span>
            <StyledTag color={running > 0 ? 'green' : 'default'}>
              运行中: {running}
            </StyledTag>
            <StyledTag color="blue">
              总计: {total}
            </StyledTag>
          </span>
        )
      }
    },
    {
      title: '加载时间',
      dataIndex: 'loaded_at',
      key: 'loaded_at',
      width: 160,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: any) => {
        const running = record.running_count || 0
        const total = record.total_count || 0
        const confirmTitle = running > 0 
          ? `策略 "${record.name}" 有 ${running} 个用户正在运行中，确定要删除吗？删除后这些策略将被停止！`
          : total > 0
            ? `策略 "${record.name}" 有 ${total} 个用户使用记录，确定要删除吗？`
            : `确定删除策略 "${record.name}"?`
        
        return (
          <Space size="small">
            <Popconfirm
              title={confirmTitle}
              onConfirm={() => handleDeleteStrategyFile(record.id)}
            >
              <ActionButton size="small" danger icon={<DeleteOutlined />}>
                删除
              </ActionButton>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  const recycledColumns = [
    {
      title: '策略ID',
      dataIndex: 'id',
      key: 'id',
      width: 120
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100
    },
    {
      title: '类型',
      dataIndex: 'is_builtin',
      key: 'is_builtin',
      width: 80,
      render: (isBuiltin: boolean) => (
        <StyledTag color={isBuiltin ? 'blue' : 'green'}>
          {isBuiltin ? '内置' : '自定义'}
        </StyledTag>
      )
    },
    {
      title: '删除时间',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      width: 160,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: any) => (
        <Space size="small">
          <ActionButton 
            size="small" 
            type="primary"
            icon={<UndoOutlined />} 
            onClick={() => handleRestoreStrategy(record.id)}
          >
            恢复
          </ActionButton>
          <Popconfirm
            title={`确定永久删除策略 "${record.name}" 吗？此操作不可恢复！`}
            onConfirm={() => handlePermanentDelete(record.id)}
          >
            <ActionButton size="small" danger icon={<DeleteOutlined />}>
              永久删除
            </ActionButton>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const renderDashboard = () => (
    <>
      <Row gutter={16}>
        <Col span={6}>
          <StatsCard>
            <Statistic 
              title="总用户数" 
              value={stats.total_users || 0} 
              prefix={<TeamOutlined />}
              valueStyle={{ color: theme.colors.primary }}
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StatsCard>
            <Statistic 
              title="活跃用户" 
              value={stats.active_users || 0} 
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: theme.colors.success }}
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StatsCard>
            <Statistic 
              title="总策略数" 
              value={stats.total_strategies || 0} 
              prefix={<RobotOutlined />}
              valueStyle={{ color: theme.colors.secondary }}
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StatsCard>
            <Statistic 
              title="今日新增用户" 
              value={stats.new_users_today || 0} 
              prefix={<UserOutlined />}
              valueStyle={{ color: theme.colors.warning }}
            />
          </StatsCard>
        </Col>
      </Row>
      
      <ContentCard title="会员分布" style={{ marginTop: 20 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="免费用户" value={stats.subscription_stats?.free || 0} />
          </Col>
          <Col span={6}>
            <Statistic title="基础版" value={stats.subscription_stats?.basic || 0} />
          </Col>
          <Col span={6}>
            <Statistic title="专业版" value={stats.subscription_stats?.pro || 0} />
          </Col>
          <Col span={6}>
            <Statistic title="企业版" value={stats.subscription_stats?.enterprise || 0} />
          </Col>
        </Row>
      </ContentCard>
    </>
  )

  const renderUsers = () => (
    <ContentCard title="用户管理">
      <FilterBar>
        <Input
          placeholder="搜索用户名或邮箱"
          prefix={<SearchOutlined />}
          value={usersSearch}
          onChange={e => setUsersSearch(e.target.value)}
          style={{ width: 200 }}
          onPressEnter={fetchUsers}
        />
        <Select
          placeholder="会员等级"
          value={usersMembership}
          onChange={setUsersMembership}
          style={{ width: 120 }}
          allowClear
        >
          <Option value="free">免费</Option>
          <Option value="basic">基础</Option>
          <Option value="pro">专业</Option>
          <Option value="enterprise">企业</Option>
        </Select>
        <Select
          placeholder="状态"
          value={usersStatus}
          onChange={setUsersStatus}
          style={{ width: 100 }}
          allowClear
        >
          <Option value="active">活跃</Option>
          <Option value="inactive">禁用</Option>
        </Select>
        <ActionButton type="primary" icon={<SearchOutlined />} onClick={fetchUsers}>
          搜索
        </ActionButton>
        <ActionButton icon={<ReloadOutlined />} onClick={() => { setUsersSearch(''); setUsersMembership(''); setUsersStatus(''); }}>
          重置
        </ActionButton>
      </FilterBar>
      
      <StyledTable
        columns={userColumns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: usersPage,
          total: usersTotal,
          pageSize: 10,
          onChange: setUsersPage
        }}
      />
    </ContentCard>
  )

  const renderStrategies = () => (
    <ContentCard title="策略管理">
      <FilterBar>
        <Input
          placeholder="搜索策略名称或用户"
          prefix={<SearchOutlined />}
          value={strategiesSearch}
          onChange={e => setStrategiesSearch(e.target.value)}
          style={{ width: 200 }}
          onPressEnter={fetchStrategies}
        />
        <Select
          placeholder="策略类型"
          value={strategiesType}
          onChange={setStrategiesType}
          style={{ width: 120 }}
          allowClear
        >
          <Option value="trend">趋势</Option>
          <Option value="grid">网格</Option>
          <Option value="scalping">剥头皮</Option>
          <Option value="arbitrage">套利</Option>
        </Select>
        <Select
          placeholder="状态"
          value={strategiesStatus}
          onChange={setStrategiesStatus}
          style={{ width: 100 }}
          allowClear
        >
          <Option value="active">运行中</Option>
          <Option value="inactive">已停止</Option>
        </Select>
        <ActionButton type="primary" icon={<SearchOutlined />} onClick={fetchStrategies}>
          搜索
        </ActionButton>
        <ActionButton icon={<ReloadOutlined />} onClick={() => { setStrategiesSearch(''); setStrategiesType(''); setStrategiesStatus(''); }}>
          重置
        </ActionButton>
      </FilterBar>
      
      <StyledTable
        columns={strategyColumns}
        dataSource={strategies}
        rowKey="id"
        loading={loading}
        pagination={{
          current: strategiesPage,
          total: strategiesTotal,
          pageSize: 10,
          onChange: setStrategiesPage
        }}
      />
    </ContentCard>
  )

  const renderOperations = () => (
    <ContentCard title="操作日志">
      <StyledTable
        columns={operationColumns}
        dataSource={operations}
        rowKey="id"
        loading={loading}
        pagination={{
          current: operationsPage,
          total: operationsTotal,
          pageSize: 20,
          onChange: setOperationsPage
        }}
      />
    </ContentCard>
  )

  const renderTemplates = () => (
    <ContentCard 
      title="策略模板管理"
      extra={
        <ActionButton type="primary" icon={<PlusOutlined />} onClick={handleCreateTemplate}>
          添加策略模板
        </ActionButton>
      }
    >
      <StyledTable
        columns={templateColumns}
        dataSource={templates}
        rowKey="id"
        loading={loading}
        pagination={false}
      />
    </ContentCard>
  )

  const renderStrategyFiles = () => (
    <>
      <ContentCard 
        title="策略文件管理"
        extra={
          <ActionButton type="primary" icon={<PlusOutlined />} onClick={handleUploadStrategy}>
            上传策略
          </ActionButton>
        }
        style={{ marginBottom: 20 }}
      >
        <StyledTable
          columns={strategyFileColumns}
          dataSource={strategyFiles}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </ContentCard>
      <ContentCard 
        title={<span><RestOutlined /> 回收站</span>}
      >
        {recycledStrategies.length > 0 ? (
          <StyledTable
            columns={recycledColumns}
            dataSource={recycledStrategies}
            rowKey="id"
            pagination={false}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textSecondary }}>
            回收站为空
          </div>
        )}
      </ContentCard>
    </>
  )

  return (
    <AdminContainer>
      <PageTitle>
        <DashboardOutlined />
        管理员平台
      </PageTitle>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ color: theme.colors.text }}>
        <TabPane 
          tab={<span><DashboardOutlined />仪表盘</span>} 
          key="dashboard"
        >
          {renderDashboard()}
        </TabPane>
        <TabPane 
          tab={<span><UserOutlined />用户管理</span>} 
          key="users"
        >
          {renderUsers()}
        </TabPane>
        <TabPane 
          tab={<span><RobotOutlined />策略管理</span>} 
          key="strategies"
        >
          {renderStrategies()}
        </TabPane>
        <TabPane 
          tab={<span><AppstoreAddOutlined />策略模板</span>} 
          key="templates"
        >
          {renderTemplates()}
        </TabPane>
        <TabPane 
          tab={<span><RobotOutlined />策略文件</span>} 
          key="strategy-files"
        >
          {renderStrategyFiles()}
        </TabPane>
        <TabPane 
          tab={<span><FileTextOutlined />操作日志</span>} 
          key="operations"
        >
          {renderOperations()}
        </TabPane>
      </Tabs>

      <StyledModal
        title="用户详情"
        open={userDetailVisible}
        onCancel={() => setUserDetailVisible(false)}
        footer={null}
        width={700}
      >
        {currentUser && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="用户ID">{currentUser.user?.id}</Descriptions.Item>
              <Descriptions.Item label="用户名">{currentUser.user?.username}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{currentUser.user?.email}</Descriptions.Item>
              <Descriptions.Item label="会员等级">
                <StyledTag color={getMembershipColor(currentUser.user?.membership_level)}>
                  {currentUser.user?.membership_level?.toUpperCase()}
                </StyledTag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(currentUser.user?.is_active)}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱验证">
                {currentUser.user?.is_verified ? <CheckCircleOutlined style={{ color: theme.colors.success }} /> : <CloseCircleOutlined style={{ color: theme.colors.error }} />}
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {new Date(currentUser.user?.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录">
                {currentUser.user?.last_login_at ? new Date(currentUser.user?.last_login_at).toLocaleString('zh-CN') : '从未登录'}
              </Descriptions.Item>
            </Descriptions>
            
            <h4 style={{ color: theme.colors.text, marginBottom: 10 }}>MT5账户 ({currentUser.mt5_accounts?.length || 0})</h4>
            <StyledTable
              dataSource={currentUser.mt5_accounts || []}
              columns={[
                { title: '账户名', dataIndex: 'account_name' },
                { title: '登录号', dataIndex: 'login' },
                { title: '服务器', dataIndex: 'server' },
                { title: '状态', dataIndex: 'connection_status' }
              ]}
              rowKey="id"
              pagination={false}
              size="small"
            />
            
            <h4 style={{ color: theme.colors.text, margin: '20px 0 10px' }}>策略列表 ({currentUser.strategies?.length || 0})</h4>
            <StyledTable
              dataSource={currentUser.strategies || []}
              columns={[
                { title: '策略名', dataIndex: 'name' },
                { title: '类型', dataIndex: 'strategy_type' },
                { title: '品种', dataIndex: 'symbol' },
                { title: '状态', dataIndex: 'is_active', render: (v: boolean) => getStatusTag(v) }
              ]}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </>
        )}
      </StyledModal>

      <StyledModal
        title="编辑会员等级"
        open={editMembershipVisible}
        onOk={handleSaveMembership}
        onCancel={() => setEditMembershipVisible(false)}
      >
        <Form form={membershipForm} layout="vertical">
          <Form.Item name="membership_level" label="会员等级" rules={[{ required: true }]}>
            <Select>
              <Option value="free">免费</Option>
              <Option value="basic">基础</Option>
              <Option value="pro">专业</Option>
              <Option value="enterprise">企业</Option>
            </Select>
          </Form.Item>
          <Form.Item name="expire_days" label="有效期(天)">
            <Input type="number" min={1} />
          </Form.Item>
        </Form>
      </StyledModal>

      <StyledModal
        title="编辑策略"
        open={editStrategyVisible}
        onOk={handleSaveStrategy}
        onCancel={() => setEditStrategyVisible(false)}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="策略名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="is_active" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </StyledModal>

      <StyledModal
        title="策略详情"
        open={strategyDetailVisible}
        onCancel={() => setStrategyDetailVisible(false)}
        footer={null}
        width={600}
      >
        {currentStrategy && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="策略ID">{currentStrategy.id}</Descriptions.Item>
            <Descriptions.Item label="策略名称">{currentStrategy.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{currentStrategy.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="类型">{currentStrategy.strategy_type}</Descriptions.Item>
            <Descriptions.Item label="品种">{currentStrategy.symbol}</Descriptions.Item>
            <Descriptions.Item label="周期">{currentStrategy.timeframe}</Descriptions.Item>
            <Descriptions.Item label="状态">{getStatusTag(currentStrategy.is_active)}</Descriptions.Item>
            <Descriptions.Item label="所属用户">{currentStrategy.user?.username} ({currentStrategy.user?.email})</Descriptions.Item>
            <Descriptions.Item label="MT5账户">{currentStrategy.mt5_account?.account_name} - {currentStrategy.mt5_account?.login}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(currentStrategy.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </StyledModal>

      <StyledModal
        title={editingTemplate ? '编辑策略模板' : '添加策略模板'}
        open={templateModalVisible}
        onOk={handleSaveTemplate}
        onCancel={() => setTemplateModalVisible(false)}
        width={700}
      >
        <Form form={templateForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="template_id" label="模板ID" rules={[{ required: true, message: '请输入模板ID' }]}>
                <Input placeholder="如: my_strategy" disabled={!!editingTemplate} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="策略名称" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="策略描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="分类">
                <Select placeholder="选择分类">
                  <Option value="趋势跟踪">趋势跟踪</Option>
                  <Option value="反转交易">反转交易</Option>
                  <Option value="网格交易">网格交易</Option>
                  <Option value="套利交易">套利交易</Option>
                  <Option value="高频交易">高频交易</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="risk_level" label="风险等级">
                <Select placeholder="选择风险等级">
                  <Option value="low">低</Option>
                  <Option value="medium">中</Option>
                  <Option value="high">高</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item 
            name="default_parameters" 
            label="默认参数 (JSON)"
            extra='例如: {"symbol": "EURUSD", "volume": 0.1}'
          >
            <TextArea rows={3} placeholder='{"key": "value"}' />
          </Form.Item>
          <Form.Item 
            name="parameters_schema" 
            label="参数配置 (JSON)"
            extra='参数表单配置，用于前端渲染参数输入表单'
          >
            <TextArea rows={4} placeholder='[{"name": "symbol", "label": "品种", "type": "select", ...}]' />
          </Form.Item>
          <Form.Item 
            name="performance" 
            label="性能指标 (JSON)"
            extra='例如: {"win_rate": 65.5, "profit_factor": 1.8}'
          >
            <TextArea rows={2} placeholder='{"win_rate": 65.5}' />
          </Form.Item>
          <Form.Item name="is_active" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </StyledModal>

      <StyledModal
        title="上传策略文件"
        open={uploadModalVisible}
        onOk={handleUploadSubmit}
        onCancel={() => setUploadModalVisible(false)}
        confirmLoading={uploading}
        width={600}
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item 
            name="file" 
            label="策略文件 (.py)" 
            rules={[{ required: true, message: '请选择策略文件' }]}
          >
            <input 
              type="file" 
              accept=".py"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  uploadForm.setFieldsValue({ 
                    file: { file: file },
                    name: uploadForm.getFieldValue('name') || file.name.replace('.py', '')
                  })
                }
              }}
              style={{ 
                width: '100%',
                padding: '8px',
                background: 'rgba(19, 23, 42, 0.8)',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#fff'
              }}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="strategy_id" label="策略ID" extra="留空则自动生成">
                <Input placeholder="如: my_strategy" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="名称">
                <Input placeholder="策略名称" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="策略描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="分类">
                <Select placeholder="选择分类">
                  <Option value="趋势跟踪">趋势跟踪</Option>
                  <Option value="反转交易">反转交易</Option>
                  <Option value="网格交易">网格交易</Option>
                  <Option value="套利交易">套利交易</Option>
                  <Option value="高频交易">高频交易</Option>
                  <Option value="自定义">自定义</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="risk_level" label="风险等级">
                <Select placeholder="选择风险等级">
                  <Option value="low">低</Option>
                  <Option value="medium">中</Option>
                  <Option value="high">高</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="class_name" label="策略类名" extra="留空则自动检测继承BaseStrategy的类">
            <Input placeholder="如: MyStrategy" />
          </Form.Item>
        </Form>
      </StyledModal>
    </AdminContainer>
  )
}

export default AdminDashboard

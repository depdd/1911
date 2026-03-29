import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Input, Form, Popconfirm, Space, Typography, Tag, Empty, Spin, App } from 'antd'
import { 
  PlusOutlined, 
  CopyOutlined, 
  DeleteOutlined, 
  KeyOutlined 
} from '@ant-design/icons'
import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { apiClient } from '../../services/userAuthService'
import { useUser } from '../../contexts/UserContext'

const { Title, Text } = Typography

interface APIKey {
  id: number
  key_name: string
  api_key: string
  permissions: string
  is_active: boolean
  last_used_at: string | null
  expire_at: string | null
  created_at: string
}

const Container = styled.div`
  padding: 24px;
`

const APIKeyCard = styled(Card)`
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

const StyledTable = styled(Table)`
  .ant-table {
    background: transparent;
  }
  
  .ant-table-thead > tr > th {
    background: rgba(255, 255, 255, 0.05);
    color: ${theme.colors.text};
    border-bottom: 1px solid ${theme.colors.border};
  }
  
  .ant-table-tbody > tr > td {
    background: transparent;
    border-bottom: 1px solid ${theme.colors.border};
    color: ${theme.colors.text};
  }
  
  .ant-table-tbody > tr:hover > td {
    background: rgba(255, 255, 255, 0.03);
  }
`

const APIKeyDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`

const HiddenKey = styled.span`
  letter-spacing: 2px;
`

const ActionsCell = styled.div`
  display: flex;
  gap: 8px;
`

const APIKeysPage: React.FC = () => {
  const { isAuthenticated } = useUser()
  const { message } = App.useApp()
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [permissions, setPermissions] = useState('read')
  const [expireDays, setExpireDays] = useState(365)
  const [createdKey, setCreatedKey] = useState<{ key: string; secret: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  const loadAPIKeys = async () => {
    if (!isAuthenticated) {
      setError('请先登录')
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get('/api/auth/api-keys')
      setAPIKeys(response.data.api_keys || [])
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('API访问功能需要专业版或企业版会员')
      } else if (err.response?.status === 401) {
        setError('请先登录')
      } else {
        setError('加载API密钥失败')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAPIKeys()
  }, [isAuthenticated])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      message.error('请输入密钥名称')
      return
    }

    setCreateLoading(true)
    try {
      const response = await apiClient.post('/api/auth/api-keys', {
        key_name: newKeyName,
        permissions,
        expire_days: expireDays
      })

      const keyData = response.data.api_key
      setCreatedKey({
        key: keyData.api_key,
        secret: keyData.api_secret
      })
      setShowCreateModal(false)
      setShowKeyModal(true)
      setNewKeyName('')
      await loadAPIKeys()
      message.success('API密钥创建成功')
    } catch (err: any) {
      message.error(err.response?.data?.error || '创建API密钥失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteKey = async (keyId: number) => {
    try {
      await apiClient.delete(`/api/auth/api-keys/${keyId}`)
      await loadAPIKeys()
      message.success('API密钥删除成功')
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除API密钥失败')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  }

  const maskKey = (key: string) => {
    if (key.length <= 8) return key
    return key.substring(0, 4) + '****' + key.substring(key.length - 4)
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'key_name',
      key: 'key_name',
      render: (text: string) => (
        <Space>
          <KeyOutlined style={{ color: theme.colors.primary }} />
          <span style={{ color: theme.colors.text }}>{text}</span>
        </Space>
      )
    },
    {
      title: 'API Key',
      dataIndex: 'api_key',
      key: 'api_key',
      render: (key: string) => (
        <APIKeyDisplay>
          <HiddenKey>{maskKey(key)}</HiddenKey>
          <Button
            type="text"
            icon={<CopyOutlined />}
            size="small"
            onClick={() => copyToClipboard(key)}
            style={{ color: theme.colors.textSecondary }}
          />
        </APIKeyDisplay>
      )
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms: string) => {
        const colors: Record<string, string> = {
          read: 'blue',
          write: 'green',
          admin: 'red'
        }
        return (
          <Tag color={colors[perms] || 'default'}>
            {perms.toUpperCase()}
          </Tag>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '活跃' : '已禁用'}
        </Tag>
      )
    },
    {
      title: '过期时间',
      dataIndex: 'expire_at',
      key: 'expire_at',
      render: (date: string | null) => (
        <span style={{ color: theme.colors.textSecondary }}>
          {date ? new Date(date).toLocaleDateString('zh-CN') : '永不过期'}
        </span>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <span style={{ color: theme.colors.textSecondary }}>
          {new Date(date).toLocaleString('zh-CN')}
        </span>
      )
    },
    {
      title: '操作',
      key: 'actions',
      dataIndex: 'id',
      render: (_: any, record: any) => (
        <ActionsCell>
          <Popconfirm
            title="确定要删除这个API密钥吗？"
            description="删除后将无法恢复，请谨慎操作"
            onConfirm={() => handleDeleteKey(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </ActionsCell>
      )
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Container>
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ color: theme.colors.textSecondary }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                <div style={{ fontSize: '16px', marginBottom: '12px' }}>功能不可用</div>
                <div style={{ fontSize: '14px', marginBottom: '20px' }}>{error}</div>
                <Button
                  type="primary"
                  onClick={() => window.location.href = '/pricing'}
                  style={{ background: theme.colors.primary, borderColor: theme.colors.primary }}
                >
                  升级会员
                </Button>
              </div>
            }
          />
        </Card>
      </Container>
    )
  }

  return (
    <Container>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ color: theme.colors.text, margin: 0 }}>
          API密钥管理
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
          style={{ background: theme.colors.primary, borderColor: theme.colors.primary }}
        >
          创建API密钥
        </Button>
      </div>

      <APIKeyCard>
        {apiKeys.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ color: theme.colors.textSecondary }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
                <div>暂无API密钥</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  创建API密钥以访问您的账户数据
                </div>
              </div>
            }
          />
        ) : (
          <StyledTable
            dataSource={apiKeys}
            columns={columns}
            rowKey="id"
            pagination={false}
          />
        )}
      </APIKeyCard>

      <Modal
        title="创建API密钥"
        open={showCreateModal}
        onOk={handleCreateKey}
        onCancel={() => setShowCreateModal(false)}
        confirmLoading={createLoading}
        okText="创建"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="密钥名称" required>
            <Input
              placeholder="例如：交易机器人、数据分析"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="权限">
            <select
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.background,
                color: theme.colors.text
              }}
            >
              <option value="read">只读</option>
              <option value="write">读写</option>
              <option value="admin">管理员</option>
            </select>
          </Form.Item>
          <Form.Item label="有效期（天）">
            <Input
              type="number"
              value={expireDays}
              onChange={(e) => setExpireDays(Number(e.target.value))}
              placeholder="365"
            />
            <Text style={{ color: theme.colors.textSecondary, fontSize: '12px' }}>
              设置为0表示永不过期
            </Text>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="API密钥创建成功"
        open={showKeyModal}
        onOk={() => {
          setShowKeyModal(false)
          setCreatedKey(null)
        }}
        onCancel={() => {
          setShowKeyModal(false)
          setCreatedKey(null)
        }}
        okText="我知道了"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={600}
      >
        {createdKey && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text style={{ color: theme.colors.textSecondary }}>
                请妥善保管您的API密钥，此密钥只会显示一次！
              </Text>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ color: theme.colors.text, display: 'block', marginBottom: '8px' }}>
                API Key:
              </Text>
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                fontFamily: 'Courier New, monospace',
                fontSize: '14px'
              }}>
                <span style={{ color: theme.colors.text }}>{createdKey.key}</span>
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(createdKey.key)}
                >
                  复制
                </Button>
              </div>
            </div>
            <div>
              <Text strong style={{ color: theme.colors.text, display: 'block', marginBottom: '8px' }}>
                API Secret:
              </Text>
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                fontFamily: 'Courier New, monospace',
                fontSize: '14px'
              }}>
                <span style={{ color: theme.colors.text }}>{createdKey.secret}</span>
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(createdKey.secret)}
                >
                  复制
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Container>
  )
}

export default APIKeysPage

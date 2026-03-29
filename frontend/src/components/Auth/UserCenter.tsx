import React, { useState } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { App } from 'antd'
import { useUser } from '../../contexts/UserContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { userAuthService } from '../../services/userAuthService'

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}15, ${props => props.theme.colors.primary}05);
  border-radius: 20px;
  border: 1px solid ${props => props.theme.colors.border};
`

const Avatar = styled.div<{ $level: string }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$level) {
      case 'enterprise': return 'linear-gradient(135deg, #7c3aed, #a855f7)'
      case 'pro': return 'linear-gradient(135deg, #2563eb, #3b82f6)'
      case 'basic': return 'linear-gradient(135deg, #059669, #10b981)'
      default: return 'linear-gradient(135deg, #6b7280, #9ca3af)'
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: white;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
`

const UserInfo = styled.div`
  flex: 1;
`

const UserName = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
`

const UserEmail = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
  margin-bottom: 12px;
`

const Badge = styled.span<{ $level: string }>`
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    switch (props.$level) {
      case 'enterprise': return 'linear-gradient(135deg, #7c3aed, #a855f7)'
      case 'pro': return 'linear-gradient(135deg, #2563eb, #3b82f6)'
      case 'basic': return 'linear-gradient(135deg, #059669, #10b981)'
      default: return '#6b7280'
    }
  }};
  color: white;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '★';
  }
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`

const StatCard = styled.div`
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: 16px;
  padding: 20px;
  border: 1px solid ${props => props.theme.colors.border};
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
`

const StatIcon = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${props => props.$color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: 12px;
`

const StatValue = styled.div`
  color: ${props => props.theme.colors.text};
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
`

const StatLabel = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 13px;
`

const StatProgress = styled.div`
  margin-top: 12px;
  height: 6px;
  background: ${props => props.theme.colors.border};
  border-radius: 3px;
  overflow: hidden;
`

const StatProgressBar = styled.div<{ $percent: number; $color: string }>`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => props.$color};
  border-radius: 3px;
  transition: width 0.3s;
`

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const Card = styled.div`
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: 16px;
  padding: 24px;
  border: 1px solid ${props => props.theme.colors.border};
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`

const CardTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  
  span {
    font-size: 20px;
  }
`

const FormGroup = styled.div`
  margin-bottom: 16px;
`

const Label = styled.label`
  display: block;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 13px;
  margin-bottom: 8px;
  font-weight: 500;
`

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 10px;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>`
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => {
    switch (props.$variant) {
      case 'danger':
        return `
          background: transparent;
          border: 1px solid #ef4444;
          color: #ef4444;
          
          &:hover {
            background: #ef4444;
            color: white;
          }
        `
      case 'secondary':
        return `
          background: ${props.theme.colors.background};
          border: 1px solid ${props.theme.colors.border};
          color: ${props.theme.colors.text};
          
          &:hover {
            border-color: ${props.theme.colors.primary};
            color: ${props.theme.colors.primary};
          }
        `
      case 'ghost':
        return `
          background: transparent;
          border: none;
          color: ${props.theme.colors.textSecondary};
          
          &:hover {
            color: ${props.theme.colors.text};
          }
        `
      default:
        return `
          background: linear-gradient(135deg, ${props.theme.colors.primary}, ${props.theme.colors.primary}dd);
          border: none;
          color: white;
          
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px ${props.theme.colors.primary}40;
          }
        `
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
`

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 12px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #ef444415;
  border-radius: 8px;
`

const SuccessMessage = styled.div`
  color: #22c55e;
  font-size: 12px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #22c55e15;
  border-radius: 8px;
`

const AccountList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const AccountCard = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid ${props => props.theme.colors.border};
  transition: border-color 0.2s;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary}40;
  }
`

const AccountInfo = styled.div`
  flex: 1;
`

const AccountName = styled.div`
  color: ${props => props.theme.colors.text};
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const PrimaryTag = styled.span`
  font-size: 10px;
  padding: 2px 8px;
  background: #22c55e20;
  color: #22c55e;
  border-radius: 10px;
  font-weight: 500;
`

const AccountDetail = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 13px;
`

const StatusBadge = styled.span<{ $status: string }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: ${props => props.$status === 'connected' ? '#22c55e20' : '#f59e0b20'};
  color: ${props => props.$status === 'connected' ? '#22c55e' : '#f59e0b'};
`

const AccountActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ActionButton = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.theme.colors.backgroundLight};
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
  }
`

const DeleteButton = styled(ActionButton)`
  border-color: #ef444440;
  color: #ef4444;
  
  &:hover {
    background: #ef4444;
    border-color: #ef4444;
    color: white;
  }
`

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`

const ModalContent = styled.div`
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: 20px;
  padding: 32px;
  width: 100%;
  max-width: 420px;
  border: 1px solid ${props => props.theme.colors.border};
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
`

const ModalTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  
  span {
    font-size: 24px;
  }
`

const FullWidthCard = styled(Card)`
  grid-column: 1 / -1;
`

const UpgradeBanner = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}20, ${props => props.theme.colors.primary}10);
  border: 1px solid ${props => props.theme.colors.primary}40;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
`

const UpgradeText = styled.div`
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  
  span {
    color: ${props => props.theme.colors.textSecondary};
    font-size: 12px;
    display: block;
    margin-top: 4px;
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${props => props.theme.colors.textSecondary};
  
  div {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  p {
    font-size: 14px;
    margin-bottom: 20px;
  }
`

const UserCenter: React.FC = () => {
  const navigate = useNavigate()
  const { user, mt5Accounts, refreshUser, refreshAccounts, addMT5Account, deleteMT5Account, subscription } = useUser()
  const { t } = useLanguage()
  const { message } = App.useApp()
  
  const [username, setUsername] = useState(user?.username || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({
    account_name: '',
    login: '',
    password: '',
    server: '',
  })
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  const handleUpdateProfile = async () => {
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(false)
    
    const result = await userAuthService.updateProfile({ username })
    
    if (result.success) {
      setProfileSuccess(true)
      refreshUser()
    } else {
      setProfileError(result.error || t('user.failedToUpdateProfile'))
    }
    
    setProfileLoading(false)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError(t('user.passwordsNotMatch'))
      return
    }
    
    setPasswordLoading(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    
    const result = await userAuthService.changePassword(currentPassword, newPassword)
    
    if (result.success) {
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setPasswordError(result.error || t('user.failedToChangePassword'))
    }
    
    setPasswordLoading(false)
  }

  const handleAddAccount = async () => {
    if (!newAccount.account_name || !newAccount.login || !newAccount.password || !newAccount.server) {
      setAccountError('请填写所有必填字段')
      return
    }
    
    setAccountLoading(true)
    setAccountError(null)
    
    if (subscription?.limits && subscription.limits.accounts !== -1) {
      const currentCount = mt5Accounts.length
      const maxCount = subscription.limits.accounts
      if (currentCount >= maxCount) {
        setAccountError(t('user.accountLimitReached', { current: currentCount, max: maxCount }))
        setAccountLoading(false)
        return
      }
    }
    
    try {
      const result = await addMT5Account(newAccount)
      
      if (result.success) {
        setShowAddAccount(false)
        setNewAccount({ account_name: '', login: '', password: '', server: '' })
        setAccountError(null)
        message.success('MT5账户添加成功！')
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 1000)
      } else {
        setAccountError(result.error || t('user.failedToAddAccount'))
      }
    } catch (error: any) {
      setAccountError(error.message || '添加账户失败，请稍后重试')
    } finally {
      setAccountLoading(false)
    }
  }

  const handleDeleteAccount = async (id: number) => {
    if (window.confirm('确定要删除这个账户吗？')) {
      await deleteMT5Account(id)
    }
  }

  const handleTestConnection = async (id: number) => {
    const result = await userAuthService.testMT5Connection(id)
    if (result.success) {
      message.success(t('user.connectionSuccessful'))
      refreshAccounts()
    } else {
      message.error(result.error || t('user.connectionFailed'))
    }
  }

  const getLevelName = (level: string) => {
    const names: Record<string, string> = {
      free: '免费版',
      basic: '基础版',
      pro: '专业版',
      enterprise: '企业版'
    }
    return names[level] || level
  }

  if (!user) return null

  const strategyLimit = subscription?.limits?.strategies || 1
  const accountLimit = subscription?.limits?.accounts || 1
  const strategyCount = user.stats?.strategies_count || 0
  const accountCount = user.stats?.accounts_count || 0

  return (
    <Container>
      <PageHeader>
        <Avatar $level={user.membership_level}>
          {user.username?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
        <UserInfo>
          <UserName>{user.username || 'User'}</UserName>
          <UserEmail>{user.email}</UserEmail>
          <Badge $level={user.membership_level}>
            {getLevelName(user.membership_level)}
          </Badge>
        </UserInfo>
      </PageHeader>

      <StatsGrid>
        <StatCard>
          <StatIcon $color="#2563eb">📊</StatIcon>
          <StatValue>{strategyCount}</StatValue>
          <StatLabel>运行中的策略</StatLabel>
          {strategyLimit !== -1 && (
            <StatProgress>
              <StatProgressBar 
                $percent={Math.min((strategyCount / strategyLimit) * 100, 100)} 
                $color="#2563eb" 
              />
            </StatProgress>
          )}
        </StatCard>
        
        <StatCard>
          <StatIcon $color="#059669">💳</StatIcon>
          <StatValue>{accountCount}</StatValue>
          <StatLabel>MT5 账户</StatLabel>
          {accountLimit !== -1 && (
            <StatProgress>
              <StatProgressBar 
                $percent={Math.min((accountCount / accountLimit) * 100, 100)} 
                $color="#059669" 
              />
            </StatProgress>
          )}
        </StatCard>
        
        <StatCard>
          <StatIcon $color="#7c3aed">⏰</StatIcon>
          <StatValue>
            {user.membership_expire_at 
              ? Math.max(0, Math.ceil((new Date(user.membership_expire_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : '∞'}
          </StatValue>
          <StatLabel>会员剩余天数</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon $color="#f59e0b">✨</StatIcon>
          <StatValue>{subscription?.limits?.features?.length || 0}</StatValue>
          <StatLabel>可用功能</StatLabel>
        </StatCard>
      </StatsGrid>

      <ContentGrid>
        <Card>
          <CardHeader>
            <CardTitle><span>👤</span> 个人资料</CardTitle>
          </CardHeader>
          
          <FormGroup>
            <Label>邮箱地址</Label>
            <Input type="text" value={user.email} disabled style={{ opacity: 0.6 }} />
          </FormGroup>
          
          <FormGroup>
            <Label>用户名</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>会员等级</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Badge $level={user.membership_level}>
                {getLevelName(user.membership_level)}
              </Badge>
              {user.membership_expire_at && (
                <span style={{ color: '#9ca3af', fontSize: 13 }}>
                  到期: {new Date(user.membership_expire_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </FormGroup>
          
          {profileError && <ErrorMessage>{profileError}</ErrorMessage>}
          {profileSuccess && <SuccessMessage>资料更新成功！</SuccessMessage>}
          
          <ButtonGroup>
            <Button onClick={handleUpdateProfile} disabled={profileLoading}>
              {profileLoading ? '保存中...' : '保存修改'}
            </Button>
          </ButtonGroup>
          
          {user.membership_level !== 'enterprise' && (
            <UpgradeBanner>
              <UpgradeText>
                升级会员获取更多功能
                <span>解锁无限策略、更多账户和高级功能</span>
              </UpgradeText>
              <Button 
                $variant="primary" 
                style={{ padding: '10px 20px' }}
                onClick={() => navigate('/pricing')}
              >
                立即升级
              </Button>
            </UpgradeBanner>
          )}
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle><span>🔐</span> 修改密码</CardTitle>
          </CardHeader>
          
          <FormGroup>
            <Label>当前密码</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="输入当前密码"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>新密码</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="输入新密码"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>确认新密码</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
            />
          </FormGroup>
          
          {passwordError && <ErrorMessage>{passwordError}</ErrorMessage>}
          {passwordSuccess && <SuccessMessage>密码修改成功！</SuccessMessage>}
          
          <ButtonGroup>
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? '修改中...' : '修改密码'}
            </Button>
          </ButtonGroup>
        </Card>

        <FullWidthCard>
          <CardHeader>
            <CardTitle><span>💳</span> MT5 账户管理</CardTitle>
            <Button 
              $variant="primary" 
              onClick={() => setShowAddAccount(true)}
              style={{ padding: '10px 20px' }}
            >
              + 添加账户
            </Button>
          </CardHeader>
          
          {mt5Accounts.length === 0 ? (
            <EmptyState>
              <div>💳</div>
              <p>还没有添加MT5账户</p>
              <Button $variant="primary" onClick={() => setShowAddAccount(true)}>
                添加第一个账户
              </Button>
            </EmptyState>
          ) : (
            <AccountList>
              {mt5Accounts.map((account) => (
                <AccountCard key={account.id}>
                  <AccountInfo>
                    <AccountName>
                      {account.account_name}
                      {account.is_primary && <PrimaryTag>主账户</PrimaryTag>}
                    </AccountName>
                    <AccountDetail>
                      {account.login}@{account.server}
                    </AccountDetail>
                  </AccountInfo>
                  <AccountActions>
                    <StatusBadge $status={account.connection_status}>
                      {account.connection_status === 'connected' ? '已连接' : '未连接'}
                    </StatusBadge>
                    <ActionButton onClick={() => handleTestConnection(account.id)}>
                      测试连接
                    </ActionButton>
                    <DeleteButton onClick={() => handleDeleteAccount(account.id)}>
                      删除
                    </DeleteButton>
                  </AccountActions>
                </AccountCard>
              ))}
            </AccountList>
          )}
        </FullWidthCard>
      </ContentGrid>
      
      {showAddAccount && (
        <Modal onClick={() => setShowAddAccount(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle><span>💳</span> 添加 MT5 账户</ModalTitle>
            
            <FormGroup>
              <Label>账户名称</Label>
              <Input
                type="text"
                placeholder="例如: 我的交易账户"
                value={newAccount.account_name}
                onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>MT5 登录号</Label>
              <Input
                type="text"
                placeholder="例如: 12345678"
                value={newAccount.login}
                onChange={(e) => setNewAccount({ ...newAccount, login: e.target.value })}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>密码</Label>
              <Input
                type="password"
                placeholder="MT5账户密码"
                value={newAccount.password}
                onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>服务器</Label>
              <Input
                type="text"
                placeholder="例如: MetaQuotes-Demo"
                value={newAccount.server}
                onChange={(e) => setNewAccount({ ...newAccount, server: e.target.value })}
              />
            </FormGroup>
            
            {accountError && <ErrorMessage>{accountError}</ErrorMessage>}
            
            <ButtonGroup>
              <Button $variant="secondary" onClick={() => setShowAddAccount(false)}>
                取消
              </Button>
              <Button onClick={handleAddAccount} disabled={accountLoading}>
                {accountLoading ? '添加中...' : '添加账户'}
              </Button>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}
    </Container>
  )
}

export default UserCenter

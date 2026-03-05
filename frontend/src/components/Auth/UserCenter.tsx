import React, { useState } from 'react'
import styled from 'styled-components'
import { useUser } from '../../contexts/UserContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { userAuthService } from '../../services/userAuthService'

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
`

const Card = styled.div`
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: 12px;
  padding: 24px;
`

const CardTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`

const InfoLabel = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
`

const InfoValue = styled.span`
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-weight: 500;
`

const Badge = styled.span<{ $level: string }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.$level) {
      case 'enterprise': return '#7c3aed'
      case 'pro': return '#2563eb'
      case 'basic': return '#059669'
      default: return '#6b7280'
    }
  }};
  color: white;
`

const FormGroup = styled.div`
  margin-bottom: 16px;
`

const Label = styled.label`
  display: block;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  margin-bottom: 8px;
`

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
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
          background: transparent;
          border: 1px solid ${props.theme.colors.border};
          color: ${props.theme.colors.text};
          
          &:hover {
            background: rgba(255, 255, 255, 0.05);
          }
        `
      default:
        return `
          background: ${props.theme.colors.primary};
          border: none;
          color: white;
          
          &:hover {
            opacity: 0.9;
          }
        `
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 12px;
  margin-top: 8px;
`

const SuccessMessage = styled.div`
  color: #22c55e;
  font-size: 12px;
  margin-top: 8px;
`

const AccountCard = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const AccountInfo = styled.div`
  flex: 1;
`

const AccountName = styled.div`
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
`

const AccountDetail = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 12px;
`

const StatusBadge = styled.span<{ $status: string }>`
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  background: ${props => props.$status === 'connected' ? '#22c55e20' : '#ef444420'};
  color: ${props => props.$status === 'connected' ? '#22c55e' : '#ef4444'};
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
`

const ModalContent = styled.div`
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
`

const ModalTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  font-size: 18px;
  margin-bottom: 20px;
`

const UserCenter: React.FC = () => {
  const { user, mt5Accounts, refreshUser, refreshAccounts, addMT5Account, deleteMT5Account, subscription } = useUser()
  const { t } = useLanguage()
  
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
    
    const result = await addMT5Account(newAccount)
    
    if (result.success) {
      setShowAddAccount(false)
      setNewAccount({ account_name: '', login: '', password: '', server: '' })
    } else {
      setAccountError(result.error || t('user.failedToAddAccount'))
    }
    
    setAccountLoading(false)
  }

  const handleDeleteAccount = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      await deleteMT5Account(id)
    }
  }

  const handleTestConnection = async (id: number) => {
    const result = await userAuthService.testMT5Connection(id)
    if (result.success) {
      alert(t('user.connectionSuccessful'))
      refreshAccounts()
    } else {
      alert(result.error || t('user.connectionFailed'))
    }
  }

  if (!user) return null

  return (
    <Container>
      <Title>User Center</Title>
      
      <Grid>
        <Card>
          <CardTitle>👤 {t('user.profile')}</CardTitle>
          
          <InfoRow>
            <InfoLabel>{t('user.email')}</InfoLabel>
            <InfoValue>{user.email}</InfoValue>
          </InfoRow>
          
          <InfoRow>
            <InfoLabel>{t('user.username')}</InfoLabel>
            <InfoValue>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '200px', padding: '6px 10px' }}
              />
            </InfoValue>
          </InfoRow>
          
          <InfoRow>
            <InfoLabel>{t('user.membership')}</InfoLabel>
            <InfoValue>
              <Badge $level={user.membership_level}>
                {user.membership_level.toUpperCase()}
              </Badge>
            </InfoValue>
          </InfoRow>
          
          <InfoRow>
            <InfoLabel>{t('user.expires')}</InfoLabel>
            <InfoValue>
              {user.membership_expire_at 
                ? new Date(user.membership_expire_at).toLocaleDateString()
                : 'N/A'}
            </InfoValue>
          </InfoRow>
          
          <InfoRow>
            <InfoLabel>{t('user.accounts')}</InfoLabel>
            <InfoValue>{user.stats?.accounts_count || 0}</InfoValue>
          </InfoRow>
          
          <InfoRow>
            <InfoLabel>{t('user.strategies')}</InfoLabel>
            <InfoValue>{user.stats?.strategies_count || 0}</InfoValue>
          </InfoRow>
          
          {subscription?.limits && (
            <>
              <InfoRow>
                <InfoLabel>{t('user.strategyLimit')}</InfoLabel>
                <InfoValue>
                  {user.stats?.strategies_count || 0} / {subscription.limits.strategies === -1 ? 'Unlimited' : subscription.limits.strategies}
                </InfoValue>
              </InfoRow>
              
              <InfoRow>
                <InfoLabel>{t('user.accountLimit')}</InfoLabel>
                <InfoValue>
                  {user.stats?.accounts_count || 0} / {subscription.limits.accounts === -1 ? 'Unlimited' : subscription.limits.accounts}
                </InfoValue>
              </InfoRow>
              
              {subscription.limits.features && (
                <InfoRow>
                  <InfoLabel>{t('user.features')}</InfoLabel>
                  <InfoValue>
                    {subscription.limits.features.map((feature: string, index: number) => (
                      <span key={index} style={{ display: 'inline-block', marginRight: '8px' }}>
                        ✓ {feature}
                      </span>
                    ))}
                  </InfoValue>
                </InfoRow>
              )}
            </>
          )}
          
          {user.membership_level !== 'enterprise' && (
            <InfoRow>
              <InfoLabel></InfoLabel>
              <InfoValue>
                <Button
                  $variant="primary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => {
                    window.location.href = '/pricing'
                  }}
                >
                  {t('user.upgradeMembership')}
                </Button>
              </InfoValue>
            </InfoRow>
          )}
          
          {profileError && <ErrorMessage>{profileError}</ErrorMessage>}
          {profileSuccess && <SuccessMessage>{t('user.profileUpdated')}</SuccessMessage>}
          
          <ButtonGroup>
            <Button onClick={handleUpdateProfile} disabled={profileLoading}>
              {profileLoading ? 'Saving...' : t('user.saveChanges')}
            </Button>
          </ButtonGroup>
        </Card>
        
        <Card>
          <CardTitle>🔐 {t('user.changePassword')}</CardTitle>
          
          <FormGroup>
            <Label>{t('user.currentPassword')}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </FormGroup>
          
          <FormGroup>
            <Label>{t('user.newPassword')}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormGroup>
          
          <FormGroup>
            <Label>{t('user.confirmPassword')}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </FormGroup>
          
          {passwordError && <ErrorMessage>{passwordError}</ErrorMessage>}
          {passwordSuccess && <SuccessMessage>{t('user.passwordChanged')}</SuccessMessage>}
          
          <ButtonGroup>
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? 'Changing...' : t('user.change')}
            </Button>
          </ButtonGroup>
        </Card>
        
        <Card style={{ gridColumn: '1 / -1' }}>
          <CardTitle>
            💳 {t('user.accounts')}
            <Button 
              $variant="secondary" 
              style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setShowAddAccount(true)}
            >
              + {t('user.addAccount')}
            </Button>
          </CardTitle>
          
          {mt5Accounts.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>
              {t('user.noAccounts')}
            </div>
          ) : (
            mt5Accounts.map((account) => (
              <AccountCard key={account.id}>
                <AccountInfo>
                  <AccountName>
                    {account.account_name}
                    {account.is_primary && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#22c55e' }}>PRIMARY</span>
                    )}
                  </AccountName>
                  <AccountDetail>
                    {account.login}@{account.server}
                  </AccountDetail>
                </AccountInfo>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge $status={account.connection_status}>
                    {account.connection_status}
                  </StatusBadge>
                  <Button
                    $variant="secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleTestConnection(account.id)}
                  >
                    Test
                  </Button>
                  <Button
                    $variant="danger"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    Delete
                  </Button>
                </div>
              </AccountCard>
            ))
          )}
        </Card>
      </Grid>
      
      {showAddAccount && (
        <Modal onClick={() => setShowAddAccount(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>{t('user.addAccount')}</ModalTitle>
            
            <FormGroup>
              <Label>{t('user.username')}</Label>
              <Input
                type="text"
                placeholder="My Trading Account"
                value={newAccount.account_name}
                onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>Login</Label>
              <Input
                type="text"
                placeholder="12345678"
                value={newAccount.login}
                onChange={(e) => setNewAccount({ ...newAccount, login: e.target.value })}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>{t('user.currentPassword')}</Label>
              <Input
                type="password"
                placeholder="Password"
                value={newAccount.password}
                onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>Server</Label>
              <Input
                type="text"
                placeholder="MetaQuotes-Demo"
                value={newAccount.server}
                onChange={(e) => setNewAccount({ ...newAccount, server: e.target.value })}
              />
            </FormGroup>
            
            {accountError && <ErrorMessage>{accountError}</ErrorMessage>}
            
            <ButtonGroup>
              <Button $variant="secondary" onClick={() => setShowAddAccount(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAccount} disabled={accountLoading}>
                {accountLoading ? 'Adding...' : 'Add Account'}
              </Button>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}
    </Container>
  )
}

export default UserCenter

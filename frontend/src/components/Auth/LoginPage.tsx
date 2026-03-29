import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.colors.background};
  padding: 20px;
`

const Card = styled.div`
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: 28px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
`

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
  text-align: center;
  margin-bottom: 32px;
`

const Tabs = styled.div`
  display: flex;
  margin-bottom: 20px;
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  padding: 4px;
`

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px;
  border: none;
  background: ${props => props.$active ? props.theme.colors.backgroundLighter : 'transparent'};
  color: ${props => props.$active ? props.theme.colors.text : props.theme.colors.textSecondary};
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$active ? props.theme.colors.backgroundLighter : 'rgba(255, 255, 255, 0.05)'};
  }
`

const SubTabs = styled.div`
  display: flex;
  margin-bottom: 24px;
  gap: 16px;
`

const SubTab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  background: transparent;
  color: ${props => props.$active ? props.theme.colors.text : props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.label`
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-weight: 500;
`

const Input = styled.input`
  padding: 14px 16px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`

const InputGroup = styled.div`
  display: flex;
  gap: 12px;
  
  input {
    flex: 1;
  }
`

const PasswordWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  
  input {
    width: 100%;
    padding-right: 44px;
  }
`

const PasswordToggle = styled.button`
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`

const SendCodeButton = styled.button<{ $disabled?: boolean }>`
  padding: 14px 20px;
  background: ${props => props.$disabled ? props.theme.colors.border : 'transparent'};
  border: 1px solid ${props => props.$disabled ? props.theme.colors.border : props.theme.colors.primary};
  border-radius: 8px;
  color: ${props => props.$disabled ? props.theme.colors.textSecondary : props.theme.colors.primary};
  font-size: 14px;
  font-weight: 500;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  white-space: nowrap;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.primary}10;
  }
`

const ErrorMessage = styled.span`
  color: #ef4444;
  font-size: 12px;
  margin-top: -12px;
`

const SuccessMessage = styled.span`
  color: #22c55e;
  font-size: 12px;
  margin-top: -12px;
`

const Button = styled.button<{ $loading?: boolean }>`
  padding: 14px;
  background: ${props => props.$loading ? props.theme.colors.primary + '80' : props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${props => props.$loading ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  margin-top: 8px;
  
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.7;
  }
`

const PasswordHint = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  padding: 12px;
  margin-top: -8px;
  
  p {
    color: ${props => props.theme.colors.textSecondary};
    font-size: 12px;
    margin: 4px 0;
    
    &.valid {
      color: #22c55e;
    }
    
    &.invalid {
      color: #ef4444;
    }
  }
`

const AdminLoginLink = styled.div`
  text-align: center;
  margin-top: 16px;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`

const ModalOverlay = styled.div`
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

const ModalCard = styled.div`
  background: ${props => props.theme.colors.backgroundLight};
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 400px;
  margin: 20px;
`

const ModalTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 24px;
`

const InfoBox = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-left: 3px solid ${props => props.theme.colors.primary};
  
  p {
    color: ${props => props.theme.colors.textSecondary};
    font-size: 13px;
    margin: 0;
  }
`

interface LoginPageProps {
  onLoginSuccess: () => void
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    login: contextLogin, 
    sendVerificationCode,
    loginWithCode,
    registerWithCode
  } = useUser()
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [loginMode, setLoginMode] = useState<'password' | 'code'>('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    code: '',
  })
  
  const [registerForm, setRegisterForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    code: '',
  })
  
  const [showPasswordHints, setShowPasswordHints] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [detectedStatus, setDetectedStatus] = useState<'unknown' | 'registered' | 'not_registered'>('unknown')
  
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: ''
  })
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  
  const passwordValidations = {
    length: registerForm.password.length >= 8,
    uppercase: /[A-Z]/.test(registerForm.password),
    lowercase: /[a-z]/.test(registerForm.password),
    number: /[0-9]/.test(registerForm.password),
  }
  
  const isPasswordValid = Object.values(passwordValidations).every(v => v)
  const passwordsMatch = registerForm.password === registerForm.confirmPassword
  
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [countdown])
  
  const handleSendCode = useCallback(async (email: string) => {
    if (!email) {
      setError('请先输入邮箱')
      return
    }
    
    setError(null)
    setSuccess(null)
    
    const result = await sendVerificationCode(email, 'auto')
    
    if (result.success) {
      setSuccess('验证码已发送，请查收邮件')
      setCountdown(60)
      
      if (result.is_registered !== undefined) {
        setDetectedStatus(result.is_registered ? 'registered' : 'not_registered')
        
        if (result.is_registered) {
          setActiveTab('login')
          setLoginMode('code')
          setLoginForm(prev => ({ ...prev, email }))
        } else {
          setActiveTab('register')
          setRegisterForm(prev => ({ ...prev, email }))
        }
      }
    } else {
      setError(result.error || '发送验证码失败')
    }
  }, [sendVerificationCode])
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    
    try {
      if (loginMode === 'password') {
        const result = await contextLogin(loginForm.email, loginForm.password)
        
        if (result.success) {
          onLoginSuccess()
          const from = (location.state as any)?.from?.pathname || '/'
          navigate(from, { replace: true })
        } else {
          setError(result.error || '登录失败')
        }
      } else {
        const result = await loginWithCode(loginForm.email, loginForm.code)
        
        if (result.success) {
          if (result.is_new_user) {
            setPendingEmail(loginForm.email)
            setShowRegisterModal(true)
          } else {
            onLoginSuccess()
            const from = (location.state as any)?.from?.pathname || '/'
            navigate(from, { replace: true })
          }
        } else {
          setError(result.error || '登录失败')
        }
      }
    } catch (err) {
      setError('发生未知错误')
    } finally {
      setLoading(false)
    }
  }
  
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError(null)
    setAdminLoading(true)
    
    try {
      const result = await contextLogin(adminForm.username, adminForm.password)
      
      if (result.success) {
        const userData = JSON.parse(localStorage.getItem('user') || '{}')
        if (userData.is_admin) {
          setShowAdminLogin(false)
          onLoginSuccess()
          navigate('/admin', { replace: true })
        } else {
          setAdminError('该账号不是管理员账号')
        }
      } else {
        setAdminError(result.error || '登录失败')
      }
    } catch (err) {
      setAdminError('发生未知错误')
    } finally {
      setAdminLoading(false)
    }
  }
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!registerForm.code) {
      setError('请输入验证码')
      return
    }
    
    if (!isPasswordValid) {
      setError('密码不符合要求')
      return
    }
    
    if (!passwordsMatch) {
      setError('两次输入的密码不一致')
      return
    }
    
    setLoading(true)
    
    try {
      const result = await registerWithCode(
        registerForm.email,
        registerForm.username,
        registerForm.password,
        registerForm.code
      )
      
      if (result.success) {
        onLoginSuccess()
        navigate('/', { replace: true })
      } else {
        setError(result.error || '注册失败')
      }
    } catch (err) {
      setError('发生未知错误')
    } finally {
      setLoading(false)
    }
  }
  
  const handleModalRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!isPasswordValid) {
      setError('密码不符合要求')
      return
    }
    
    if (!passwordsMatch) {
      setError('两次输入的密码不一致')
      return
    }
    
    setLoading(true)
    
    try {
      const result = await registerWithCode(
        pendingEmail,
        registerForm.username,
        registerForm.password,
        loginForm.code
      )
      
      if (result.success) {
        setShowRegisterModal(false)
        onLoginSuccess()
        navigate('/', { replace: true })
      } else {
        setError(result.error || '注册失败')
      }
    } catch (err) {
      setError('发生未知错误')
    } finally {
      setLoading(false)
    }
  }
  
  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab)
    setError(null)
    setSuccess(null)
    setDetectedStatus('unknown')
  }
  
  return (
    <Container>
      <Card>
        <Title>量化交易平台</Title>
        <Subtitle>量化交易管理系统</Subtitle>
        
        <Tabs>
          <Tab 
            $active={activeTab === 'login'} 
            onClick={() => handleTabChange('login')}
          >
            登录
          </Tab>
          <Tab 
            $active={activeTab === 'register'} 
            onClick={() => handleTabChange('register')}
          >
            注册
          </Tab>
        </Tabs>
        
        {activeTab === 'login' ? (
          <>
            <SubTabs>
              <SubTab 
                $active={loginMode === 'password'} 
                onClick={() => { setLoginMode('password'); setError(null); setSuccess(null); }}
              >
                密码登录
              </SubTab>
              <SubTab 
                $active={loginMode === 'code'} 
                onClick={() => { setLoginMode('code'); setError(null); setSuccess(null); }}
              >
                验证码登录
              </SubTab>
            </SubTabs>
            
            {detectedStatus === 'not_registered' && (
              <InfoBox>
                <p>该邮箱未注册，验证码已发送，请完成注册流程</p>
              </InfoBox>
            )}
            
            <Form onSubmit={handleLogin}>
              <FormGroup>
                <Label>邮箱</Label>
                <Input
                  type="email"
                  placeholder="请输入邮箱"
                  value={loginForm.email}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, email: e.target.value })
                    setDetectedStatus('unknown')
                  }}
                  required
                />
              </FormGroup>
              
              {loginMode === 'password' ? (
                <FormGroup>
                  <Label>密码</Label>
                  <PasswordWrapper>
                    <Input
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                    <PasswordToggle
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    </PasswordToggle>
                  </PasswordWrapper>
                </FormGroup>
              ) : (
                <FormGroup>
                  <Label>验证码</Label>
                  <InputGroup>
                    <Input
                      type="text"
                      placeholder="请输入验证码"
                      value={loginForm.code}
                      onChange={(e) => setLoginForm({ ...loginForm, code: e.target.value })}
                      maxLength={6}
                      required
                    />
                    <SendCodeButton
                      type="button"
                      $disabled={countdown > 0 || !loginForm.email}
                      onClick={() => handleSendCode(loginForm.email)}
                    >
                      {countdown > 0 ? `${countdown}秒` : '发送验证码'}
                    </SendCodeButton>
                  </InputGroup>
                </FormGroup>
              )}
              
              {error && <ErrorMessage>{error}</ErrorMessage>}
              {success && <SuccessMessage>{success}</SuccessMessage>}
              
              <Button type="submit" $loading={loading} disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
              
              <AdminLoginLink onClick={() => setShowAdminLogin(true)}>
                管理员登录
              </AdminLoginLink>
            </Form>
          </>
        ) : (
          <>
            {detectedStatus === 'registered' && (
              <InfoBox>
                <p>该邮箱已注册，验证码已发送，请直接登录</p>
              </InfoBox>
            )}
            
            <Form onSubmit={handleRegister}>
              <FormGroup>
                <Label>邮箱</Label>
                <InputGroup>
                  <Input
                    type="email"
                    placeholder="请输入邮箱"
                    value={registerForm.email}
                    onChange={(e) => {
                      setRegisterForm({ ...registerForm, email: e.target.value })
                      setDetectedStatus('unknown')
                    }}
                    required
                  />
                  <SendCodeButton
                    type="button"
                    $disabled={countdown > 0 || !registerForm.email}
                    onClick={() => handleSendCode(registerForm.email)}
                  >
                    {countdown > 0 ? `${countdown}秒` : '发送验证码'}
                  </SendCodeButton>
                </InputGroup>
              </FormGroup>
              
              <FormGroup>
                <Label>验证码</Label>
                <Input
                  type="text"
                  placeholder="请输入邮箱收到的验证码"
                  value={registerForm.code}
                  onChange={(e) => setRegisterForm({ ...registerForm, code: e.target.value })}
                  maxLength={6}
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label>用户名</Label>
                <Input
                  type="text"
                  placeholder="请输入用户名（3-50个字符）"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  minLength={3}
                  maxLength={50}
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label>密码</Label>
                <PasswordWrapper>
                  <Input
                    type={showRegisterPassword ? 'text' : 'password'}
                    placeholder="请设置密码"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    onFocus={() => setShowPasswordHints(true)}
                    required
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  >
                    {showRegisterPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </PasswordToggle>
                </PasswordWrapper>
                {showPasswordHints && (
                  <PasswordHint>
                    <p className={passwordValidations.length ? 'valid' : 'invalid'}>
                      {passwordValidations.length ? '✓' : '✗'} 至少8个字符
                    </p>
                    <p className={passwordValidations.uppercase ? 'valid' : 'invalid'}>
                      {passwordValidations.uppercase ? '✓' : '✗'} 至少一个大写字母
                    </p>
                    <p className={passwordValidations.lowercase ? 'valid' : 'invalid'}>
                      {passwordValidations.lowercase ? '✓' : '✗'} 至少一个小写字母
                    </p>
                    <p className={passwordValidations.number ? 'valid' : 'invalid'}>
                      {passwordValidations.number ? '✓' : '✗'} 至少一个数字
                    </p>
                  </PasswordHint>
                )}
              </FormGroup>
              
              <FormGroup>
                <Label>确认密码</Label>
                <PasswordWrapper>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    style={{
                      borderColor: registerForm.confirmPassword && !passwordsMatch ? '#ef4444' : undefined
                    }}
                    required
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </PasswordToggle>
                </PasswordWrapper>
                {registerForm.confirmPassword && !passwordsMatch && (
                  <ErrorMessage>两次输入的密码不一致</ErrorMessage>
                )}
              </FormGroup>
              
              {error && <ErrorMessage>{error}</ErrorMessage>}
              {success && <SuccessMessage>{success}</SuccessMessage>}
              
              <Button type="submit" $loading={loading} disabled={loading}>
                {loading ? '创建中...' : '创建账号'}
              </Button>
            </Form>
          </>
        )}
      </Card>
      
      {showAdminLogin && (
        <ModalOverlay onClick={() => setShowAdminLogin(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>管理员登录</ModalTitle>
            <Form onSubmit={handleAdminLogin}>
              <FormGroup>
                <Label>管理员账号</Label>
                <Input
                  type="text"
                  placeholder="请输入管理员账号"
                  value={adminForm.username}
                  onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label>密码</Label>
                <PasswordWrapper>
                  <Input
                    type={showAdminPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    required
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                  >
                    {showAdminPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </PasswordToggle>
                </PasswordWrapper>
              </FormGroup>
              
              {adminError && <ErrorMessage>{adminError}</ErrorMessage>}
              
              <Button type="submit" $loading={adminLoading} disabled={adminLoading}>
                {adminLoading ? '登录中...' : '管理员登录'}
              </Button>
            </Form>
          </ModalCard>
        </ModalOverlay>
      )}
      
      {showRegisterModal && (
        <ModalOverlay onClick={() => setShowRegisterModal(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>完善注册信息</ModalTitle>
            <Form onSubmit={handleModalRegister}>
              <FormGroup>
                <Label>邮箱</Label>
                <Input
                  type="email"
                  value={pendingEmail}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>用户名</Label>
                <Input
                  type="text"
                  placeholder="请输入用户名（3-50个字符）"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  minLength={3}
                  maxLength={50}
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label>密码</Label>
                <PasswordWrapper>
                  <Input
                    type={showRegisterPassword ? 'text' : 'password'}
                    placeholder="请设置密码"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    onFocus={() => setShowPasswordHints(true)}
                    required
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  >
                    {showRegisterPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </PasswordToggle>
                </PasswordWrapper>
                {showPasswordHints && (
                  <PasswordHint>
                    <p className={passwordValidations.length ? 'valid' : 'invalid'}>
                      {passwordValidations.length ? '✓' : '✗'} 至少8个字符
                    </p>
                    <p className={passwordValidations.uppercase ? 'valid' : 'invalid'}>
                      {passwordValidations.uppercase ? '✓' : '✗'} 至少一个大写字母
                    </p>
                    <p className={passwordValidations.lowercase ? 'valid' : 'invalid'}>
                      {passwordValidations.lowercase ? '✓' : '✗'} 至少一个小写字母
                    </p>
                    <p className={passwordValidations.number ? 'valid' : 'invalid'}>
                      {passwordValidations.number ? '✓' : '✗'} 至少一个数字
                    </p>
                  </PasswordHint>
                )}
              </FormGroup>
              
              <FormGroup>
                <Label>确认密码</Label>
                <PasswordWrapper>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    style={{
                      borderColor: registerForm.confirmPassword && !passwordsMatch ? '#ef4444' : undefined
                    }}
                    required
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </PasswordToggle>
                </PasswordWrapper>
                {registerForm.confirmPassword && !passwordsMatch && (
                  <ErrorMessage>两次输入的密码不一致</ErrorMessage>
                )}
              </FormGroup>
              
              {error && <ErrorMessage>{error}</ErrorMessage>}
              
              <Button type="submit" $loading={loading} disabled={loading}>
                {loading ? '创建中...' : '完成注册'}
              </Button>
            </Form>
          </ModalCard>
        </ModalOverlay>
      )}
    </Container>
  )
}

export default LoginPage

import React, { useState } from 'react'
import styled from 'styled-components'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'

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
  margin-bottom: 32px;
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

const ErrorMessage = styled.span`
  color: #ef4444;
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

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 24px 0;
  
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${props => props.theme.colors.border};
  }
  
  span {
    padding: 0 16px;
    color: ${props => props.theme.colors.textSecondary};
    font-size: 12px;
  }
`

const MT5LoginButton = styled.button`
  width: 100%;
  padding: 14px;
  background: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: ${props => props.theme.colors.primary};
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

interface LoginPageProps {
  onLoginSuccess: () => void
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: contextLogin, register: contextRegister } = useUser()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })
  
  const [registerForm, setRegisterForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  })
  
  const [showPasswordHints, setShowPasswordHints] = useState(false)
  
  const passwordValidations = {
    length: registerForm.password.length >= 8,
    uppercase: /[A-Z]/.test(registerForm.password),
    lowercase: /[a-z]/.test(registerForm.password),
    number: /[0-9]/.test(registerForm.password),
  }
  
  const isPasswordValid = Object.values(passwordValidations).every(v => v)
  const passwordsMatch = registerForm.password === registerForm.confirmPassword
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      const result = await contextLogin(loginForm.email, loginForm.password)
      
      if (result.success) {
        onLoginSuccess()
        const from = (location.state as any)?.from?.pathname || '/'
        navigate(from, { replace: true })
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!isPasswordValid) {
      setError('Password does not meet requirements')
      return
    }
    
    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }
    
    setLoading(true)
    
    try {
      const result = await contextRegister(
        registerForm.email,
        registerForm.username,
        registerForm.password
      )
      
      if (result.success) {
        onLoginSuccess()
        navigate('/', { replace: true })
      } else {
        setError(result.error || 'Registration failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const handleMT5Login = () => {
    navigate('/mt5-login')
  }
  
  return (
    <Container>
      <Card>
        <Title>Trading Platform</Title>
        <Subtitle>Quantitative Trading Management System</Subtitle>
        
        <Tabs>
          <Tab 
            $active={activeTab === 'login'} 
            onClick={() => { setActiveTab('login'); setError(null); }}
          >
            Login
          </Tab>
          <Tab 
            $active={activeTab === 'register'} 
            onClick={() => { setActiveTab('register'); setError(null); }}
          >
            Register
          </Tab>
        </Tabs>
        
        {activeTab === 'login' ? (
          <Form onSubmit={handleLogin}>
            <FormGroup>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
            </FormGroup>
            
            {error && <ErrorMessage>{error}</ErrorMessage>}
            
            <Button type="submit" $loading={loading} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </Form>
        ) : (
          <Form onSubmit={handleRegister}>
            <FormGroup>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label>Username</Label>
              <Input
                type="text"
                placeholder="Choose a username (3-50 characters)"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                minLength={3}
                maxLength={50}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Create a password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                onFocus={() => setShowPasswordHints(true)}
                onBlur={() => setShowPasswordHints(false)}
                required
              />
              {showPasswordHints && (
                <PasswordHint>
                  <p className={passwordValidations.length ? 'valid' : 'invalid'}>
                    {passwordValidations.length ? '✓' : '✗'} At least 8 characters
                  </p>
                  <p className={passwordValidations.uppercase ? 'valid' : 'invalid'}>
                    {passwordValidations.uppercase ? '✓' : '✗'} At least one uppercase letter
                  </p>
                  <p className={passwordValidations.lowercase ? 'valid' : 'invalid'}>
                    {passwordValidations.lowercase ? '✓' : '✗'} At least one lowercase letter
                  </p>
                  <p className={passwordValidations.number ? 'valid' : 'invalid'}>
                    {passwordValidations.number ? '✓' : '✗'} At least one number
                  </p>
                </PasswordHint>
              )}
            </FormGroup>
            
            <FormGroup>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                style={{
                  borderColor: registerForm.confirmPassword && !passwordsMatch ? '#ef4444' : undefined
                }}
                required
              />
              {registerForm.confirmPassword && !passwordsMatch && (
                <ErrorMessage>Passwords do not match</ErrorMessage>
              )}
            </FormGroup>
            
            {error && <ErrorMessage>{error}</ErrorMessage>}
            
            <Button type="submit" $loading={loading} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </Form>
        )}
        
        <Divider>
          <span>OR</span>
        </Divider>
        
        <MT5LoginButton onClick={handleMT5Login}>
          Login with MT5 Account
        </MT5LoginButton>
      </Card>
    </Container>
  )
}

export default LoginPage

import React, { useEffect } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
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
  padding: 48px;
  width: 100%;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`

const Icon = styled.div`
  font-size: 64px;
  margin-bottom: 24px;
`

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 16px;
`

const Description = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 32px;
`

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Button = styled.button<{ $primary?: boolean }>`
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.$primary ? `
    background: ${props.theme.colors.primary};
    color: white;
    
    &:hover {
      background: ${props.theme.colors.primaryDark};
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
    }
  ` : `
    background: transparent;
    color: ${props.theme.colors.textSecondary};
    border: 1px solid ${props.theme.colors.border};
    
    &:hover {
      background: ${props.theme.colors.backgroundLighter};
      color: ${props.theme.colors.text};
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const MT5SetupGuide: React.FC = () => {
  const navigate = useNavigate()
  const { mt5Accounts } = useUser()

  useEffect(() => {
    console.log('MT5SetupGuide - mt5Accounts:', mt5Accounts)
  }, [mt5Accounts])

  const handleAddAccount = () => {
    console.log('MT5SetupGuide - Navigate to user-center')
    navigate('/user-center')
  }

  const handleSkip = () => {
    console.log('MT5SetupGuide - Navigate to dashboard')
    navigate('/dashboard')
  }

  return (
    <Container>
      <Card>
        <Icon>🔗</Icon>
        <Title>连接您的MT5账户</Title>
        <Description>
          要开始使用交易功能，请先连接您的MetaTrader 5账户。
          您可以随时在用户中心添加或管理多个MT5账户。
        </Description>
        
        <ButtonGroup>
          <Button $primary onClick={handleAddAccount}>
            添加MT5账户
          </Button>
          <Button onClick={handleSkip}>
            稍后添加，进入仪表盘
          </Button>
        </ButtonGroup>
      </Card>
    </Container>
  )
}

export default MT5SetupGuide
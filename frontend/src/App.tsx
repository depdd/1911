import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Spin } from 'antd'
import styled from 'styled-components'

import { useAuth } from './contexts/AuthContext'
import { useWebSocket } from './contexts/WebSocketContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { UserProvider, useUser } from './contexts/UserContext'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import Dashboard from './components/Dashboard/Dashboard'
import MarketData from './components/MarketData/MarketData'
import TradingPanel from './components/TradingPanel/TradingPanel'
import StrategyStore from './components/StrategyStore/StrategyStore'
import Analytics from './components/Analytics/Analytics'
import Settings from './components/Settings/Settings'
import AlertsPage from './components/Alerts/AlertsPage'
import APIKeysPage from './components/APIKeys/APIKeysPage'
import MT5Connection from './components/MT5Connection/MT5Connection'
import LoginPage from './components/Auth/LoginPage'
import UserCenter from './components/Auth/UserCenter'
import PricingPage from './components/Auth/PricingPage'
import MT5SetupGuide from './components/Auth/MT5SetupGuide'

const { Content } = Layout

const AppLayout = styled(Layout)<{ $background: string }>`
  min-height: 100vh;
  background: ${props => props.$background};
`

const AppContent = styled(Content)<{ $bgColor: string; $borderColor: string }>`
  margin: 24px;
  padding: 24px;
  background: ${props => props.$bgColor};
  border-radius: 12px;
  border: 1px solid ${props => props.$borderColor};
  backdrop-filter: blur(10px);
  min-height: calc(100vh - 140px);
  overflow: auto;
`

const LoadingContainer = styled.div<{ $background: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${props => props.$background};
`

const LoadingText = styled.div<{ $color: string }>`
  margin-left: 20px;
  font-size: 18px;
  font-weight: 500;
  color: ${props => props.$color};
  letter-spacing: 1px;
`

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useUser()
  const location = useLocation()
  const { theme } = useTheme()

  if (isLoading) {
    return (
      <LoadingContainer $background={theme.gradients.background}>
        <Spin size="large" />
        <LoadingText $color={theme.colors.primary}>Loading...</LoadingText>
      </LoadingContainer>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

const AppContentWrapper: React.FC = () => {
  const { isLoading, checkAuthStatus } = useAuth()
  const { connect, isConnected } = useWebSocket()
  const { theme } = useTheme()
  const [isAppLoading, setIsAppLoading] = useState(true)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await checkAuthStatus()
        
        if (!isConnected) {
          console.log('Connecting to WebSocket: ws://localhost:65534')
          connect('ws://localhost:65534')
        }
        
        setIsAppLoading(false)
      } catch (error) {
        console.error('App initialization failed:', error)
        setIsAppLoading(false)
      }
    }

    initializeApp()
  }, [])

  if (isAppLoading || isLoading) {
    return (
      <LoadingContainer $background={theme.gradients.background}>
        <Spin size="large" />
        <LoadingText $color={theme.colors.primary}>Loading...</LoadingText>
      </LoadingContainer>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPageRoute />} />
      <Route path="/mt5-login" element={<MT5Connection />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

const LoginPageRoute: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, refreshUser } = useUser()

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  if (isAuthenticated) {
    return null
  }

  return <LoginPage onLoginSuccess={refreshUser} />
}

const MainLayout: React.FC = () => {
  const { theme } = useTheme()
  const { mt5Accounts } = useUser()
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!checked && mt5Accounts.length === 0) {
      setChecked(true)
      navigate('/mt5-setup', { replace: true })
    }
  }, [mt5Accounts, navigate, checked])

  return (
    <AppLayout $background={theme.colors.background}>
      <Sidebar />
      <Layout style={{ background: 'transparent' }}>
        <Header />
        <AppContent 
          $bgColor={`${theme.colors.backgroundLight}cc`}
          $borderColor={theme.colors.border}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/market" element={<MarketData />} />
            <Route path="/trading" element={<TradingPanel />} />
            <Route path="/strategies" element={<StrategyStore />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/api-keys" element={<APIKeysPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/user-center" element={<UserCenter />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/mt5-setup" element={<MT5SetupGuide />} />
          </Routes>
        </AppContent>
      </Layout>
    </AppLayout>
  )
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppContentWrapper />
      </UserProvider>
    </ThemeProvider>
  )
}

export default App

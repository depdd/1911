import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Spin, App as AntApp } from 'antd'
import styled from 'styled-components'

import { useAuth } from './contexts/AuthContext'
import { useWebSocket } from './contexts/WebSocketContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { UserProvider, useUser, useLogoutListener } from './contexts/UserContext'
import { PageStateProvider } from './contexts/PageStateContext'
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
import AdminDashboard from './components/Admin/AdminDashboard'

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

const PageWrapper = styled.div<{ $active: boolean }>`
  display: ${props => props.$active ? 'block' : 'none'};
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

const PAGE_COMPONENTS = {
  '/dashboard': Dashboard,
  '/market': MarketData,
  '/trading': TradingPanel,
  '/strategies': StrategyStore,
  '/analytics': Analytics,
  '/alerts': AlertsPage,
  '/api-keys': APIKeysPage,
  '/settings': Settings,
  '/user-center': UserCenter,
  '/pricing': PricingPage,
  '/mt5-setup': MT5SetupGuide,
  '/admin': AdminDashboard,
}

const MainLayout: React.FC = () => {
  const { theme } = useTheme()
  const { mt5Accounts, isLoading } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const hasRedirected = useRef(false)
  
  const [mountedPages, setMountedPages] = useState<Set<string>>(new Set(['/dashboard']))
  const pageRefs = useRef<Map<string, any>>(new Map())

  const clearAllPages = useCallback(() => {
    setMountedPages(new Set(['/dashboard']))
    pageRefs.current.clear()
  }, [])

  useLogoutListener(clearAllPages)

  useEffect(() => {
    if (isLoading || hasRedirected.current) return
    
    console.log('MainLayout - Checking mt5Accounts:', mt5Accounts)
    console.log('MainLayout - Current path:', location.pathname)
    
    if (mt5Accounts.length === 0 && location.pathname !== '/mt5-setup' && location.pathname !== '/user-center') {
      console.log('MainLayout - No accounts, redirecting to mt5-setup')
      hasRedirected.current = true
      navigate('/mt5-setup', { replace: true })
    }
  }, [mt5Accounts, isLoading, navigate, location.pathname])

  useEffect(() => {
    if (mt5Accounts.length > 0) {
      hasRedirected.current = false
    }
  }, [mt5Accounts])

  useEffect(() => {
    const currentPath = location.pathname
    if (currentPath !== '/' && PAGE_COMPONENTS[currentPath as keyof typeof PAGE_COMPONENTS]) {
      setMountedPages(prev => new Set(prev).add(currentPath))
    }
  }, [location.pathname])

  const currentPath = location.pathname

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <AppLayout $background={theme.colors.background}>
      <Sidebar />
      <Layout style={{ background: 'transparent' }}>
        <Header />
        <AppContent 
          $bgColor={`${theme.colors.backgroundLight}cc`}
          $borderColor={theme.colors.border}
        >
          {currentPath === '/' && <Navigate to="/dashboard" replace />}
          
          {Array.from(mountedPages).map(pagePath => {
            const Component = PAGE_COMPONENTS[pagePath as keyof typeof PAGE_COMPONENTS]
            if (!Component) return null
            
            return (
              <PageWrapper key={pagePath} $active={currentPath === pagePath}>
                <Component />
              </PageWrapper>
            )
          })}
        </AppContent>
      </Layout>
    </AppLayout>
  )
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UserProvider>
        <PageStateProvider>
          <AntApp>
            <AppContentWrapper />
          </AntApp>
        </PageStateProvider>
      </UserProvider>
    </ThemeProvider>
  )
}

export default App

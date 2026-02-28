import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Spin } from 'antd'
import styled from 'styled-components'

import { useAuth } from './contexts/AuthContext'
import { useWebSocket } from './contexts/WebSocketContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import Dashboard from './components/Dashboard/Dashboard'
import MarketData from './components/MarketData/MarketData'
import TradingPanel from './components/TradingPanel/TradingPanel'
import StrategyStore from './components/StrategyStore/StrategyStore'
import Analytics from './components/Analytics/Analytics'
import Settings from './components/Settings/Settings'
import MT5Connection from './components/MT5Connection/MT5Connection'

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

const AppContentWrapper: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth()
  const { connect, isConnected } = useWebSocket()
  const { theme } = useTheme()
  const [isAppLoading, setIsAppLoading] = useState(true)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await checkAuthStatus()
        
        if (!isConnected) {
          console.log('尝试连接WebSocket服务器: ws://localhost:65534')
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
        <LoadingText $color={theme.colors.primary}>加载中...</LoadingText>
      </LoadingContainer>
    )
  }

  if (!isAuthenticated) {
    return <MT5Connection />
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
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/market" element={<MarketData />} />
            <Route path="/trading" element={<TradingPanel />} />
            <Route path="/strategies" element={<StrategyStore />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppContent>
      </Layout>
    </AppLayout>
  )
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContentWrapper />
    </ThemeProvider>
  )
}

export default App

import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Spin } from 'antd'
import styled from 'styled-components'
import { theme } from './styles/theme'

import { useAuth } from './contexts/AuthContext'
import { useWebSocket } from './contexts/WebSocketContext'
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

const AppLayout = styled(Layout)`
  min-height: 100vh;
  background: ${theme.colors.background};
`

const AppContent = styled(Content)`
  margin: 24px;
  padding: 24px;
  background: rgba(26, 31, 58, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  backdrop-filter: blur(10px);
  min-height: calc(100vh - 140px);
  overflow: auto;
`

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f3a 100%);
`

const LoadingText = styled.div`
  margin-left: 20px;
  font-size: 18px;
  font-weight: 500;
  color: #00d4ff;
  letter-spacing: 1px;
`

const App: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth()
  const { connect, isConnected } = useWebSocket()
  const [isAppLoading, setIsAppLoading] = useState(true)

  useEffect(() => {
    const initializeApp = async () => {
    try {
      // 检查认证状态
      await checkAuthStatus()
      
      // 连接WebSocket
      console.log('初始化应用，认证状态:', isAuthenticated)
      // 无论认证状态如何，都尝试连接WebSocket（用于调试）
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
      <LoadingContainer>
        <Spin size="large" />
        <LoadingText>加载中...</LoadingText>
      </LoadingContainer>
    )
  }

  if (!isAuthenticated) {
    return <MT5Connection />
  }

  return (
    <AppLayout>
      <Sidebar />
      <Layout style={{ background: 'transparent' }}>
        <Header />
        <AppContent>
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

export default App
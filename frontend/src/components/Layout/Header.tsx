import React, { useState, useEffect } from 'react'
import { Layout, Space, Typography, Badge, Button, Tooltip, Switch } from 'antd'
import {
  WifiOutlined,
  DisconnectOutlined,
  BellOutlined,
  SyncOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'
import styled from 'styled-components'

import { useWebSocket } from '../../contexts/WebSocketContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage } from '../../contexts/LanguageContext'

const { Header: AntHeader } = Layout
const { Text } = Typography

const HeaderContainer = styled(AntHeader)<{ $background: string; $border: string }>`
  background: ${props => props.$background} !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${props => props.$border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const ConnectionStatus = styled.div<{ $connected: boolean; $success: string; $error: string; $border: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${props => props.$connected ? `${props.$success}20` : `${props.$error}20`};
  border: 1px solid ${props => props.$connected ? props.$success : props.$error};
  border-radius: 8px;
  backdrop-filter: blur(5px);
  
  .anticon {
    color: ${props => props.$connected ? props.$success : props.$error};
    animation: ${props => props.$connected ? 'pulse 2s infinite' : 'none'};
  }
  
  .status-text {
    color: ${props => props.$connected ? props.$success : props.$error};
    font-size: 14px;
    font-weight: 500;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const ActionButton = styled(Button)<{ $textSecondary: string; $primary: string }>`
  color: ${props => props.$textSecondary} !important;
  
  &:hover {
    color: ${props => props.$primary} !important;
    background: ${props => props.$primary}20 !important;
  }
`

const Header: React.FC = () => {
  const { isConnected, connect } = useWebSocket()
  const { theme, setTheme, isDark } = useTheme()
  const { t } = useLanguage()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      console.log('尝试连接WebSocket服务器: ws://localhost:65534')
      connect('ws://localhost:65534')
    }
  }, [connect, isConnected])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light')
  }

  return (
    <HeaderContainer $background={`${theme.colors.background}cc`} $border={theme.colors.border}>
      <HeaderLeft>
        <ConnectionStatus 
          $connected={isConnected}
          $success={theme.colors.success}
          $error={theme.colors.error}
          $border={theme.colors.border}
        >
          {isConnected ? <WifiOutlined /> : <DisconnectOutlined />}
          <Text className="status-text">
            {isConnected ? t('connection.connected') : t('connection.disconnected')}
          </Text>
        </ConnectionStatus>
      </HeaderLeft>

      <HeaderRight>
        <Space>
          <Tooltip title={t('common.loading')}>
            <ActionButton
              type="text"
              icon={<SyncOutlined spin={isRefreshing} />}
              onClick={handleRefresh}
              $textSecondary={theme.colors.textSecondary}
              $primary={theme.colors.primary}
            />
          </Tooltip>

          <Tooltip title={t('common.info')}>
            <Badge count={0} size="small">
              <ActionButton
                type="text"
                icon={<BellOutlined />}
                $textSecondary={theme.colors.textSecondary}
                $primary={theme.colors.primary}
              />
            </Badge>
          </Tooltip>

          <Tooltip title={t('settings.theme')}>
            <Switch
              checked={isDark}
              onChange={handleThemeToggle}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              style={{
                background: isDark ? theme.colors.primary : theme.colors.warning,
              }}
            />
          </Tooltip>
        </Space>
      </HeaderRight>
    </HeaderContainer>
  )
}

export default Header

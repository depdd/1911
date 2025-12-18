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
import { theme } from '../../styles/theme'

const { Header: AntHeader } = Layout
const { Text } = Typography

const HeaderContainer = styled(AntHeader)`
  background: rgba(10, 14, 26, 0.8) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${theme.colors.border};
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

const ConnectionStatus = styled.div<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${props => props.$connected ? theme.colors.success : theme.colors.error};
  border-radius: ${theme.borderRadius.md};
  backdrop-filter: blur(5px);
  
  .anticon {
    color: ${props => props.$connected ? theme.colors.success : theme.colors.error};
    animation: ${props => props.$connected ? 'pulse 2s infinite' : 'none'};
  }
  
  .status-text {
    color: ${props => props.$connected ? theme.colors.success : theme.colors.error};
    font-size: ${theme.typography.fontSize.sm};
    font-weight: ${theme.typography.fontWeight.medium};
  }
`

// 已移除账户信息相关样式组件

const Header: React.FC = () => {
  const { isConnected, connect } = useWebSocket()
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 自动连接WebSocket
  useEffect(() => {
    // 立即连接，不依赖isConnected状态
    if (!isConnected) {
      console.log('尝试连接WebSocket服务器: ws://localhost:65534')
      connect('ws://localhost:65534')
    }
  }, [connect, isConnected])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // 这里可以添加刷新数据的逻辑
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked)
    // 这里可以添加主题切换逻辑
  }

  // 已移除formatCurrency函数，因为不再需要格式化账户余额

  return (
    <HeaderContainer>
      <HeaderLeft>
        <ConnectionStatus $connected={isConnected}>
          {isConnected ? <WifiOutlined /> : <DisconnectOutlined />}
          <Text className="status-text">
            {isConnected ? '已连接' : '未连接'}
          </Text>
        </ConnectionStatus>
      </HeaderLeft>

      <HeaderRight>
        <Space>
          <Tooltip title="刷新数据">
            <Button
              type="text"
              icon={<SyncOutlined spin={isRefreshing} />}
              onClick={handleRefresh}
              style={{
                color: theme.colors.textSecondary,
              }}
            />
          </Tooltip>

          <Tooltip title="通知">
            <Badge count={0} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{
                  color: theme.colors.textSecondary,
                }}
              />
            </Badge>
          </Tooltip>

          <Tooltip title="主题切换">
            <Switch
              checked={isDarkMode}
              onChange={handleThemeToggle}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              style={{
                background: isDarkMode ? theme.colors.primary : theme.colors.warning,
              }}
            />
          </Tooltip>

          {/* 已移除右上角的余额和净值显示 */}
        </Space>
      </HeaderRight>
    </HeaderContainer>
  )
}

export default Header
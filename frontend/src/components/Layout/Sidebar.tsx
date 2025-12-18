import React, { useState } from 'react'
import { Layout, Menu, Avatar, Typography, Space, Button } from 'antd'
import {
  DashboardOutlined,
  LineChartOutlined,
  SwapOutlined,
  RobotOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import styled from 'styled-components'

import { useAuth } from '../../contexts/AuthContext'
import { theme } from '../../styles/theme'

const { Sider } = Layout
const { Text } = Typography

const SidebarContainer = styled(Sider)<{ $collapsed: boolean }>`
  background: rgba(10, 14, 26, 0.9) !important;
  backdrop-filter: blur(10px);
  border-right: 1px solid ${theme.colors.border};
  box-shadow: ${theme.shadows.md};
  
  .ant-layout-sider-trigger {
    background: ${theme.colors.backgroundLight} !important;
    border-top: 1px solid ${theme.colors.border};
    color: ${theme.colors.primary} !important;
  }
`

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  border-bottom: 1px solid ${theme.colors.border};
  margin-bottom: 16px;
`

const LogoText = styled(Text)<{ $collapsed: boolean }>`
  font-size: ${props => props.$collapsed ? '14px' : '18px'};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary};
  letter-spacing: ${props => props.$collapsed ? '0' : '1px'};
  transition: all ${theme.animations.duration.normal} ${theme.animations.easing.easeOut};
`

const UserInfo = styled.div<{ $collapsed: boolean }>`
  padding: 16px;
  border-top: 1px solid ${theme.colors.border};
  margin-top: auto;
  
  .ant-avatar {
    background: ${theme.colors.primary};
    margin-bottom: ${props => props.$collapsed ? '0' : '8px'};
  }
`

const UserName = styled(Text)<{ $collapsed: boolean }>`
  display: ${props => props.$collapsed ? 'none' : 'block'};
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textSecondary};
  text-align: center;
  margin-bottom: 8px;
`

const MenuContainer = styled(Menu)`
  background: transparent !important;
  border: none !important;
  
  .ant-menu-item {
    margin: 4px 8px !important;
    border-radius: ${theme.borderRadius.md} !important;
    
    &:hover {
      background: rgba(0, 212, 255, 0.1) !important;
      color: ${theme.colors.primary} !important;
    }
    
    &.ant-menu-item-selected {
      background: rgba(0, 212, 255, 0.2) !important;
      color: ${theme.colors.primary} !important;
      
      .anticon {
        color: ${theme.colors.primary} !important;
      }
    }
    
    .anticon {
      font-size: 16px;
      color: ${theme.colors.textSecondary};
    }
  }
`

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/market',
      icon: <LineChartOutlined />,
      label: '行情数据',
    },
    {
      key: '/trading',
      icon: <SwapOutlined />,
      label: '交易面板',
    },
    {
      key: '/strategies',
      icon: <RobotOutlined />,
      label: '策略商店',
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ]

  const handleMenuClick = (key: string) => {
    navigate(key)
  }

  const handleLogout = async () => {
    try {
      await logout()
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <SidebarContainer $collapsed={collapsed} collapsible trigger={null} collapsed={collapsed}>
      <LogoContainer>
        <LogoText $collapsed={collapsed}>
          {collapsed ? 'FX' : 'FX 量化交易'}
        </LogoText>
      </LogoContainer>

      <MenuContainer
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        inlineCollapsed={collapsed}
      />

      <UserInfo $collapsed={collapsed}>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          <Avatar size={collapsed ? 32 : 40}>
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <UserName $collapsed={collapsed}>
            {user?.username || 'Trader'}
          </UserName>
          {!collapsed && (
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              退出登录
            </Button>
          )}
        </Space>
      </UserInfo>

      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: collapsed ? '16px' : '16px',
          color: theme.colors.primary,
          fontSize: '16px',
        }}
      />
    </SidebarContainer>
  )
}

export default Sidebar
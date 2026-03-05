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
  DollarOutlined,
  AlertOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import styled from 'styled-components'

import { useUser } from '../../contexts/UserContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage } from '../../contexts/LanguageContext'

const { Sider } = Layout
const { Text } = Typography

const SidebarContainer = styled(Sider)<{ $collapsed: boolean; $background: string; $border: string }>`
  background: ${props => props.$background} !important;
  backdrop-filter: blur(10px);
  border-right: 1px solid ${props => props.$border};
  
  .ant-layout-sider-trigger {
    background: ${props => props.$background} !important;
    border-top: 1px solid ${props => props.$border};
  }
`

const LogoContainer = styled.div<{ $border: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  border-bottom: 1px solid ${props => props.$border};
  margin-bottom: 16px;
`

const LogoText = styled(Text)<{ $collapsed: boolean; $primary: string }>`
  font-size: ${props => props.$collapsed ? '14px' : '18px'};
  font-weight: 600;
  color: ${props => props.$primary};
  letter-spacing: ${props => props.$collapsed ? '0' : '1px'};
  transition: all 0.3s ease;
`

const UserInfo = styled.div<{ $collapsed: boolean; $border: string }>`
  padding: 16px;
  border-top: 1px solid ${props => props.$border};
  margin-top: auto;
  
  .ant-avatar {
    margin-bottom: ${props => props.$collapsed ? '0' : '8px'};
  }
`

const UserName = styled(Text)<{ $collapsed: boolean; $textSecondary: string }>`
  display: ${props => props.$collapsed ? 'none' : 'block'};
  font-size: 14px;
  color: ${props => props.$textSecondary};
  text-align: center;
  margin-bottom: 8px;
`

const MenuContainer = styled(Menu)<{ $primary: string; $textSecondary: string; $border: string }>`
  background: transparent !important;
  border: none !important;
  
  .ant-menu-item {
    margin: 4px 8px !important;
    border-radius: 8px !important;
    
    &:hover {
      background: ${props => props.$primary}20 !important;
      color: ${props => props.$primary} !important;
    }
    
    &.ant-menu-item-selected {
      background: ${props => props.$primary}30 !important;
      color: ${props => props.$primary} !important;
      
      .anticon {
        color: ${props => props.$primary} !important;
      }
    }
    
    .anticon {
      font-size: 16px;
      color: ${props => props.$textSecondary};
    }
  }
`

const CollapseButton = styled(Button)<{ $primary: string }>`
  color: ${props => props.$primary} !important;
  
  &:hover {
    color: ${props => props.$primary} !important;
    background: ${props => props.$primary}20 !important;
  }
`

const LogoutButton = styled(Button)<{ $textSecondary: string; $primary: string }>`
  color: ${props => props.$textSecondary} !important;
  font-size: 14px !important;
  
  &:hover {
    color: ${props => props.$primary} !important;
  }
`

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useUser()
  const { theme } = useTheme()
  const { t } = useLanguage()

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: t('menu.dashboard'),
    },
    {
      key: '/market',
      icon: <LineChartOutlined />,
      label: t('menu.market'),
    },
    {
      key: '/trading',
      icon: <SwapOutlined />,
      label: t('menu.trading'),
    },
    {
      key: '/strategies',
      icon: <RobotOutlined />,
      label: t('menu.strategies'),
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: t('menu.analytics'),
    },
    ...(user?.membership_level === 'pro' || user?.membership_level === 'enterprise' ? [{
      key: '/alerts',
      icon: <AlertOutlined />,
      label: t('menu.alerts'),
    }] : []),
    ...(user?.membership_level === 'pro' || user?.membership_level === 'enterprise' ? [{
      key: '/api-keys',
      icon: <KeyOutlined />,
      label: t('menu.apiKeys'),
    }] : []),
    {
      key: '/pricing',
      icon: <DollarOutlined />,
      label: t('menu.pricing'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: t('menu.settings'),
    },
  ]

  const handleMenuClick = (key: string) => {
    navigate(key)
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <SidebarContainer 
      $collapsed={collapsed} 
      $background={`${theme.colors.background}ee`}
      $border={theme.colors.border}
      collapsible 
      trigger={null} 
      collapsed={collapsed}
    >
      <LogoContainer $border={theme.colors.border}>
        <LogoText $collapsed={collapsed} $primary={theme.colors.primary}>
          {collapsed ? 'FX' : t('appName')}
        </LogoText>
      </LogoContainer>

      <MenuContainer
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        inlineCollapsed={collapsed}
        $primary={theme.colors.primary}
        $textSecondary={theme.colors.textSecondary}
        $border={theme.colors.border}
      />

      <UserInfo $collapsed={collapsed} $border={theme.colors.border}>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          <Avatar 
            size={collapsed ? 32 : 40}
            style={{ backgroundColor: theme.colors.primary }}
          >
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <UserName $collapsed={collapsed} $textSecondary={theme.colors.textSecondary}>
            {user?.username || 'Trader'}
          </UserName>
          {!collapsed && (
            <LogoutButton
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              $textSecondary={theme.colors.textSecondary}
              $primary={theme.colors.primary}
            >
              {t('logout')}
            </LogoutButton>
          )}
        </Space>
      </UserInfo>

      <CollapseButton
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        $primary={theme.colors.primary}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          fontSize: '16px',
        }}
      />
    </SidebarContainer>
  )
}

export default Sidebar

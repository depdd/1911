import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { ThemeProvider } from 'styled-components'
import App from './App'
import { GlobalStyles } from './styles/GlobalStyles'
import { theme } from './styles/theme'
import { AuthProvider } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { LanguageProvider } from './contexts/LanguageContext'
import './i18n'

const antdTheme = {
  token: {
    colorPrimary: '#00d4ff',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#8b5cf6',
    colorTextBase: '#ffffff',
    colorBgBase: '#0a0e1a',
    fontFamily: 'Noto Sans SC, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: 8,
    controlHeight: 40,
  },
  components: {
    Layout: {
      headerBg: 'rgba(10, 14, 26, 0.8)',
      bodyBg: '#0a0e1a',
      siderBg: 'rgba(10, 14, 26, 0.9)',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#e5e7eb',
      itemHoverBg: 'rgba(0, 212, 255, 0.1)',
      itemHoverColor: '#00d4ff',
      itemSelectedBg: 'rgba(0, 212, 255, 0.2)',
      itemSelectedColor: '#00d4ff',
    },
    Card: {
      colorBgContainer: 'rgba(26, 31, 58, 0.6)',
      colorBorder: 'rgba(0, 212, 255, 0.2)',
      borderRadius: 12,
    },
    Table: {
      colorBgContainer: 'rgba(26, 31, 58, 0.6)',
      colorFillAlter: 'rgba(0, 212, 255, 0.05)',
      colorBorder: 'rgba(0, 212, 255, 0.1)',
    },
    Button: {
      colorPrimary: '#00d4ff',
      colorPrimaryHover: '#33ddff',
      colorPrimaryActive: '#0099cc',
      colorBgContainer: 'rgba(26, 31, 58, 0.8)',
      colorBorder: 'rgba(0, 212, 255, 0.3)',
    },
    Input: {
      colorBgContainer: 'rgba(26, 31, 58, 0.8)',
      colorBorder: 'rgba(0, 212, 255, 0.3)',
      colorText: '#ffffff',
      colorTextPlaceholder: '#9ca3af',
    },
    Select: {
      colorBgContainer: 'rgba(26, 31, 58, 0.8)',
      colorBorder: 'rgba(0, 212, 255, 0.3)',
      colorText: '#ffffff',
    },
    Modal: {
      colorBgContainer: 'rgba(26, 31, 58, 0.95)',
      colorBorder: 'rgba(0, 212, 255, 0.3)',
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConfigProvider theme={antdTheme}>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <WebSocketProvider>
              <LanguageProvider>
                <GlobalStyles />
                <App />
              </LanguageProvider>
            </WebSocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
)

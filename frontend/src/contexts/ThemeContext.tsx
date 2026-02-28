import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000,
})

interface ThemeColors {
  primary: string
  primaryLight: string
  primaryDark: string
  secondary: string
  secondaryLight: string
  secondaryDark: string
  success: string
  successLight: string
  successDark: string
  warning: string
  warningLight: string
  warningDark: string
  error: string
  errorLight: string
  errorDark: string
  info: string
  infoLight: string
  infoDark: string
  background: string
  backgroundLight: string
  backgroundLighter: string
  text: string
  textSecondary: string
  textTertiary: string
  textDisabled: string
  border: string
  borderLight: string
  borderDark: string
  shadow: string
  shadowLight: string
  shadowDark: string
}

interface ThemeGradients {
  primary: string
  secondary: string
  background: string
  card: string
  glow: string
}

interface Theme {
  name: 'dark' | 'light'
  colors: ThemeColors
  gradients: ThemeGradients
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
    glow: string
    glowStrong: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
    xl: string
    full: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    xxl: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      md: string
      lg: string
      xl: string
      xxl: string
      heading: string
    }
    fontWeight: {
      light: number
      normal: number
      medium: number
      semibold: number
      bold: number
    }
    lineHeight: {
      tight: number
      normal: number
      relaxed: number
    }
  }
  animations: {
    duration: {
      fast: string
      normal: string
      slow: string
    }
    easing: {
      easeOut: string
      easeIn: string
      easeInOut: string
    }
  }
  breakpoints: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    xxl: string
  }
  zIndex: {
    dropdown: number
    sticky: number
    fixed: number
    modalBackdrop: number
    modal: number
    popover: number
    tooltip: number
  }
}

const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#00d4ff',
    primaryLight: '#33ddff',
    primaryDark: '#0099cc',
    secondary: '#8b5cf6',
    secondaryLight: '#a78bfa',
    secondaryDark: '#7c3aed',
    success: '#10b981',
    successLight: '#34d399',
    successDark: '#059669',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    warningDark: '#d97706',
    error: '#ef4444',
    errorLight: '#f87171',
    errorDark: '#dc2626',
    info: '#3b82f6',
    infoLight: '#60a5fa',
    infoDark: '#2563eb',
    background: '#0a0e1a',
    backgroundLight: '#1a1f3a',
    backgroundLighter: '#2a2f4a',
    text: '#ffffff',
    textSecondary: '#e5e7eb',
    textTertiary: '#9ca3af',
    textDisabled: '#6b7280',
    border: 'rgba(0, 212, 255, 0.2)',
    borderLight: 'rgba(0, 212, 255, 0.1)',
    borderDark: 'rgba(0, 212, 255, 0.3)',
    shadow: 'rgba(0, 212, 255, 0.1)',
    shadowLight: 'rgba(0, 212, 255, 0.05)',
    shadowDark: 'rgba(0, 212, 255, 0.2)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%)',
    secondary: 'linear-gradient(135deg, #8b5cf6 0%, #00d4ff 100%)',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f3a 100%)',
    card: 'linear-gradient(135deg, rgba(26, 31, 58, 0.8) 0%, rgba(42, 47, 74, 0.6) 100%)',
    glow: 'radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%)',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 212, 255, 0.05)',
    md: '0 4px 6px -1px rgba(0, 212, 255, 0.1), 0 2px 4px -1px rgba(0, 212, 255, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 212, 255, 0.1), 0 4px 6px -2px rgba(0, 212, 255, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 212, 255, 0.1), 0 10px 10px -5px rgba(0, 212, 255, 0.04)',
    glow: '0 0 20px rgba(0, 212, 255, 0.3)',
    glowStrong: '0 0 30px rgba(0, 212, 255, 0.5)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '50%',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  typography: {
    fontFamily: '"Noto Sans SC", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
      heading: '32px',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },
  animations: {
    duration: {
      fast: '0.15s',
      normal: '0.3s',
      slow: '0.5s',
    },
    easing: {
      easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  breakpoints: {
    xs: '480px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    xxl: '1600px',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
}

const lightTheme: Theme = {
  ...darkTheme,
  name: 'light',
  colors: {
    primary: '#0066cc',
    primaryLight: '#3388dd',
    primaryDark: '#004499',
    secondary: '#7c3aed',
    secondaryLight: '#9f67ff',
    secondaryDark: '#5b21b6',
    success: '#059669',
    successLight: '#10b981',
    successDark: '#047857',
    warning: '#d97706',
    warningLight: '#f59e0b',
    warningDark: '#b45309',
    error: '#dc2626',
    errorLight: '#ef4444',
    errorDark: '#b91c1c',
    info: '#2563eb',
    infoLight: '#3b82f6',
    infoDark: '#1d4ed8',
    background: '#f5f7fa',
    backgroundLight: '#ffffff',
    backgroundLighter: '#e5e7eb',
    text: '#1f2937',
    textSecondary: '#374151',
    textTertiary: '#6b7280',
    textDisabled: '#9ca3af',
    border: 'rgba(0, 102, 204, 0.2)',
    borderLight: 'rgba(0, 102, 204, 0.1)',
    borderDark: 'rgba(0, 102, 204, 0.3)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowLight: 'rgba(0, 0, 0, 0.05)',
    shadowDark: 'rgba(0, 0, 0, 0.2)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #0066cc 0%, #7c3aed 100%)',
    secondary: 'linear-gradient(135deg, #7c3aed 0%, #0066cc 100%)',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e5e7eb 100%)',
    card: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(245, 247, 250, 0.8) 100%)',
    glow: 'radial-gradient(circle, rgba(0, 102, 204, 0.1) 0%, transparent 70%)',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    glow: '0 0 20px rgba(0, 102, 204, 0.2)',
    glowStrong: '0 0 30px rgba(0, 102, 204, 0.3)',
  },
}

interface ThemeContextType {
  theme: Theme
  setTheme: (themeName: 'dark' | 'light' | 'auto') => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(darkTheme)
  const [isDark, setIsDark] = useState(true)

  const setTheme = (themeName: 'dark' | 'light' | 'auto') => {
    if (themeName === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setThemeState(prefersDark ? darkTheme : lightTheme)
      setIsDark(prefersDark)
    } else if (themeName === 'light') {
      setThemeState(lightTheme)
      setIsDark(false)
    } else {
      setThemeState(darkTheme)
      setIsDark(true)
    }
  }

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const response = await apiClient.get('/settings')
        if (response.data.success) {
          const themeName = response.data.data.theme || 'dark'
          setTheme(themeName)
        }
      } catch (error) {
        console.error('Failed to load theme:', error)
      }
    }
    loadTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'auto') {
        setTheme('auto')
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.body.style.backgroundColor = theme.colors.background
    document.body.style.color = theme.colors.text
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export { darkTheme, lightTheme }
export type { Theme, ThemeColors, ThemeGradients }

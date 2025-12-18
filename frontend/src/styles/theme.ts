export const theme = {
  colors: {
    // 主色调
    primary: '#00d4ff',
    primaryLight: '#33ddff',
    primaryDark: '#0099cc',
    
    // 辅助色
    secondary: '#8b5cf6',
    secondaryLight: '#a78bfa',
    secondaryDark: '#7c3aed',
    
    // 功能色
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
    
    // 背景色
    background: '#0a0e1a',
    backgroundLight: '#1a1f3a',
    backgroundLighter: '#2a2f4a',
    
    // 文本色
    text: '#ffffff',
    textSecondary: '#e5e7eb',
    textTertiary: '#9ca3af',
    textDisabled: '#6b7280',
    
    // 边框色
    border: 'rgba(0, 212, 255, 0.2)',
    borderLight: 'rgba(0, 212, 255, 0.1)',
    borderDark: 'rgba(0, 212, 255, 0.3)',
    
    // 阴影色
    shadow: 'rgba(0, 212, 255, 0.1)',
    shadowLight: 'rgba(0, 212, 255, 0.05)',
    shadowDark: 'rgba(0, 212, 255, 0.2)',
  },
  
  // 渐变
  gradients: {
    primary: 'linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%)',
    secondary: 'linear-gradient(135deg, #8b5cf6 0%, #00d4ff 100%)',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f3a 100%)',
    card: 'linear-gradient(135deg, rgba(26, 31, 58, 0.8) 0%, rgba(42, 47, 74, 0.6) 100%)',
    glow: 'radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%)',
  },
  
  // 阴影
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 212, 255, 0.05)',
    md: '0 4px 6px -1px rgba(0, 212, 255, 0.1), 0 2px 4px -1px rgba(0, 212, 255, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 212, 255, 0.1), 0 4px 6px -2px rgba(0, 212, 255, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 212, 255, 0.1), 0 10px 10px -5px rgba(0, 212, 255, 0.04)',
    glow: '0 0 20px rgba(0, 212, 255, 0.3)',
    glowStrong: '0 0 30px rgba(0, 212, 255, 0.5)',
  },
  
  // 圆角
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '50%',
  },
  
  // 间距
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  // 字体
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
  
  // 动画
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
  
  // 断点
  breakpoints: {
    xs: '480px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    xxl: '1600px',
  },
  
  // Z-index
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
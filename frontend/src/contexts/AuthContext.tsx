import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { User, Account } from '../types'
import { authService } from '../services/authService'

// 状态类型
interface AuthState {
  user: User | null
  account: Account | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// 动作类型
type AuthAction = 
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; account: Account } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }

// 初始状态
const initialState: AuthState = {
  user: null,
  account: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
}

// Reducer函数
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        account: action.payload.account,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        account: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        account: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        account: action.payload
      }
    default:
      return state
  }
}

// Context类型
interface AuthContextType extends AuthState {
  login: (login: string, password: string, server: string) => Promise<void>
  logout: () => Promise<void>
  checkAuthStatus: () => Promise<void>
  clearError: () => void
  updateAccount: (account: Account) => void
}

// 创建Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider组件
interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // 登录
  const login = async (login: string, password: string, server: string): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' })
      
      const response = await authService.login(login, password, server)
      
      if (response.success && response.data) {
        const { user, account } = response.data
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, account } })
      } else {
        throw new Error(response.error || '登录失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败'
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage })
      throw error
    }
  }

  // 登出
  const logout = async (): Promise<void> => {
    try {
      await authService.logout()
      dispatch({ type: 'LOGOUT' })
    } catch (error) {
      console.error('Logout error:', error)
      dispatch({ type: 'LOGOUT' })
    }
  }

  // 检查认证状态
  const checkAuthStatus = async (): Promise<void> => {
    try {
      const response = await authService.checkAuthStatus()
      
      if (response.success && response.data) {
        const { user, account } = response.data
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, account } })
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: '未认证' })
      }
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: '认证检查失败' })
    }
  }

  // 清除错误
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  // 更新账户信息
  const updateAccount = (account: Account): void => {
    dispatch({ type: 'UPDATE_ACCOUNT', payload: account })
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        checkAuthStatus,
        clearError,
        updateAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
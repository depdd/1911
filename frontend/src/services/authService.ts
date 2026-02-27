import axios from 'axios'
import { User, Account, ApiResponse } from '../types'

// API基础配置 - 直接使用绝对路径避免代理问题
const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 处理未认证情况
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface LoginRequest {
  login: string
  password: string
  server: string
}

export interface LoginResponse {
  user: User
  account: Account
  token: string
}

class AuthService {
  /**
   * 登录MT5账户
   */
  async login(login: string, password: string, server: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiClient.post('/api/mt5/connect', {
        login,
        password,
        server,
      })

      if (response.data.success) {
        const { account_info } = response.data
        
        // 创建用户对象
        const user: User = {
          id: account_info.login,
          username: `MT5_${account_info.login}`,
          email: `${account_info.login}@mt5.local`,
          role: 'user',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        }

        // 创建账户对象
        const account: Account = {
          login: account_info.login,
          server: account_info.server,
          balance: account_info.balance,
          equity: account_info.equity,
          margin: account_info.margin,
          freeMargin: account_info.free_margin,
          marginLevel: account_info.margin_level,
          currency: account_info.currency,
          leverage: account_info.leverage,
          profit: account_info.profit,
          credit: account_info.credit,
          company: account_info.company,
        }

        // 保存token
        const token = `mt5_${account_info.login}_${Date.now()}`
        localStorage.setItem('auth_token', token)

        return {
          success: true,
          data: {
            user,
            account,
            token,
          },
        }
      } else {
        return {
          success: false,
          error: response.data.error || '登录失败',
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败',
      }
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/api/mt5/disconnect')
      
      // 清除本地存储
      localStorage.removeItem('auth_token')
      
      return {
        success: response.data.success || true,
        message: response.data.message || '登出成功',
      }
    } catch (error) {
      console.error('Logout error:', error)
      // 即使服务器请求失败，也要清除本地存储
      localStorage.removeItem('auth_token')
      return {
        success: true,
        message: '登出成功',
      }
    }
  }

  /**
   * 检查认证状态
   */
  async checkAuthStatus(): Promise<ApiResponse<{ user: User; account: Account }>> {
    try {
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        return {
          success: false,
          error: '未找到认证信息',
        }
      }

      // 检查MT5连接状态
      const response = await apiClient.get('/api/mt5/status')
      
      if (response.data.connected && response.data.account_info) {
        const account_info = response.data.account_info
        
        // 创建用户对象
        const user: User = {
          id: account_info.login,
          username: `MT5_${account_info.login}`,
          email: `${account_info.login}@mt5.local`,
          role: 'user',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        }

        // 创建账户对象
        const account: Account = {
          login: account_info.login,
          server: account_info.server,
          balance: account_info.balance,
          equity: account_info.equity,
          margin: account_info.margin,
          freeMargin: account_info.free_margin,
          marginLevel: account_info.margin_level,
          currency: account_info.currency,
          leverage: account_info.leverage,
          profit: account_info.profit,
          credit: account_info.credit,
          company: account_info.company,
        }

        return {
          success: true,
          data: { user, account },
        }
      } else {
        // MT5未连接，清除本地token
        localStorage.removeItem('auth_token')
        return {
          success: false,
          error: 'MT5连接已断开',
        }
      }
    } catch (error) {
      console.error('Check auth status error:', error)
      localStorage.removeItem('auth_token')
      return {
        success: false,
        error: error instanceof Error ? error.message : '认证检查失败',
      }
    }
  }

  /**
   * 获取账户信息
   */
  async getAccountInfo(): Promise<ApiResponse<Account>> {
    try {
      const response = await apiClient.get('/api/account/info')
      
      if (response.data) {
        const account_info = response.data
        const account: Account = {
          login: account_info.login,
          server: account_info.server,
          balance: account_info.balance,
          equity: account_info.equity,
          margin: account_info.margin,
          freeMargin: account_info.free_margin,
          marginLevel: account_info.margin_level,
          currency: account_info.currency,
          leverage: account_info.leverage,
          profit: account_info.profit,
          credit: account_info.credit,
          company: account_info.company,
        }

        return {
          success: true,
          data: account,
        }
      } else {
        return {
          success: false,
          error: '无法获取账户信息',
        }
      }
    } catch (error) {
      console.error('Get account info error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取账户信息失败',
      }
    }
  }

  /**
   * 获取账户摘要
   */
  async getAccountSummary(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/api/account/summary')
      return {
        success: response.data ? true : false,
        data: response.data,
        error: response.data ? undefined : '无法获取账户摘要',
      }
    } catch (error) {
      console.error('Get account summary error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取账户摘要失败',
      }
    }
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token')
    return !!token
  }

  /**
   * 获取认证token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  /**
   * 设置认证token
   */
  setToken(token: string): void {
    localStorage.setItem('auth_token', token)
  }

  /**
   * 清除认证信息
   */
  clearAuth(): void {
    localStorage.removeItem('auth_token')
  }
}

// 创建单例实例
export const authService = new AuthService()
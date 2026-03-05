import axios from 'axios'
import i18n from '../i18n'

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('user_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user_token')
      localStorage.removeItem('user_info')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface User {
  id: number
  email: string
  username: string
  membership_level: string
  membership_expire_at: string | null
  is_verified: boolean
  created_at: string
  stats?: {
    accounts_count: number
    strategies_count: number
  }
}

export interface MT5Account {
  id: number
  account_name: string
  login: string
  server: string
  is_active: boolean
  is_primary: boolean
  connection_status: string
  last_connected_at: string | null
  created_at: string
  strategies_count?: number
}

export interface UserStrategy {
  id: number
  strategy_name: string
  template_id: string
  parameters: Record<string, any>
  status: string
  total_trades: number
  total_profit: number
  max_drawdown: number
  win_rate: number
  started_at: string | null
  stopped_at: string | null
  created_at: string
  mt5_account?: {
    id: number
    account_name: string
    login: string
  }
}

export interface PaymentOrder {
  order_no: string
  amount: number
  currency: string
  plan: string
  duration_months: number
  status: string
  payment_method: string
  paid_at: string | null
  created_at: string
}

class UserAuthService {
  async register(email: string, username: string, password: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.post('/api/auth/register', {
        email,
        username,
        password,
      })

      if (response.data.token) {
        localStorage.setItem('user_token', response.data.token)
        localStorage.setItem('user_info', JSON.stringify(response.data.user))
      }

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      }
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
      })

      if (response.data.token) {
        localStorage.setItem('user_token', response.data.token)
        localStorage.setItem('user_info', JSON.stringify(response.data.user))
      }

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      }
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('user_token')
      localStorage.removeItem('user_info')
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get('/api/auth/me')
      return response.data
    } catch (error) {
      return null
    }
  }

  async updateProfile(data: { username?: string }): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      const response = await apiClient.put('/api/auth/me', data)
      return {
        success: true,
        data: response.data.user,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Update failed',
      }
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Password change failed',
      }
    }
  }

  async getMT5Accounts(): Promise<MT5Account[]> {
    try {
      const response = await apiClient.get('/api/accounts')
      return response.data.accounts
    } catch (error) {
      return []
    }
  }

  async addMT5Account(data: {
    account_name: string
    login: string
    password: string
    server: string
    is_primary?: boolean
  }): Promise<{ success: boolean; data?: MT5Account; error?: string }> {
    try {
      const response = await apiClient.post('/api/accounts', data)
      return {
        success: true,
        data: response.data.account,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add account',
      }
    }
  }

  async deleteMT5Account(accountId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.delete(`/api/accounts/${accountId}`)
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete account',
      }
    }
  }

  async testMT5Connection(accountId: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.post(`/api/accounts/${accountId}/test`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Connection test failed',
      }
    }
  }

  async getUserStrategies(): Promise<UserStrategy[]> {
    try {
      const response = await apiClient.get('/api/user-strategies')
      return response.data.strategies
    } catch (error) {
      return []
    }
  }

  async createUserStrategy(data: {
    strategy_name: string
    template_id: string
    mt5_account_id: number
    parameters: Record<string, any>
  }): Promise<{ success: boolean; data?: UserStrategy; error?: string }> {
    try {
      const response = await apiClient.post('/api/user-strategies', data)
      return {
        success: true,
        data: response.data.strategy,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create strategy',
      }
    }
  }

  async startStrategy(strategyId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.post(`/api/user-strategies/${strategyId}/start`)
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to start strategy',
      }
    }
  }

  async stopStrategy(strategyId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.post(`/api/user-strategies/${strategyId}/stop`)
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to stop strategy',
      }
    }
  }

  async deleteStrategy(strategyId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.delete(`/api/user-strategies/${strategyId}`)
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete strategy',
      }
    }
  }

  async getPlans(): Promise<any[]> {
    try {
      const response = await apiClient.get('/api/payment/plans', {
        params: {
          lang: i18n.language
        }
      })
      return response.data.plans
    } catch (error) {
      return []
    }
  }

  async createOrder(plan: string, paymentMethod: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.post('/api/payment/create-order', {
        plan,
        payment_method: paymentMethod,
      })
      return {
        success: true,
        data: response.data.order,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create order',
      }
    }
  }

  async mockPayment(orderNo: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.post(`/api/payment/mock-payment/${orderNo}`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Payment failed',
      }
    }
  }

  async getOrders(): Promise<PaymentOrder[]> {
    try {
      const response = await apiClient.get('/api/payment/orders')
      return response.data.orders
    } catch (error) {
      return []
    }
  }

  async getSubscription(): Promise<{ subscription: any; current_plan: string; limits: any } | null> {
    try {
      const response = await apiClient.get('/api/payment/subscription')
      return response.data
    } catch (error) {
      return null
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('user_token')
  }

  getToken(): string | null {
    return localStorage.getItem('user_token')
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user_info')
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
    return null
  }
}

export const userAuthService = new UserAuthService()

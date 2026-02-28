import axios from 'axios'
import { ApiResponse } from '../types'

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
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

export interface StrategyParameter {
  name: string
  label: string
  type: 'number' | 'select' | 'text'
  min?: number
  max?: number
  step?: number
  options?: string[]
  default: any
  required: boolean
}

export interface StrategyTemplate {
  id: string
  name: string
  description: string
  category: string
  risk_level: 'low' | 'medium' | 'high'
  default_parameters: Record<string, any>
  parameters_schema: StrategyParameter[]
  performance: {
    win_rate: number
    profit_factor: number
    max_drawdown: number
    avg_trade: number
  }
}

export interface StrategyInstance {
  id: number
  strategy_id: string
  name: string
  template_id: string
  parameters: Record<string, any>
  status: 'running' | 'stopped' | 'error'
  created_at: string
  updated_at: string
  runtime?: {
    total_trades: number
    winning_trades: number
    losing_trades: number
    win_rate: number
    total_profit: number
    max_drawdown: number
    current_position: string | null
  }
}

export interface CreateStrategyRequest {
  template_id: string
  name: string
  parameters?: Record<string, any>
}

export interface UpdateStrategyRequest {
  name?: string
  parameters?: Record<string, any>
}

export class StrategyService {
  async getTemplates(): Promise<ApiResponse<{ templates: StrategyTemplate[] }>> {
    try {
      const response = await apiClient.get('/api/strategies/templates')
      return {
        success: true,
        data: { templates: response.data.data }
      }
    } catch (error) {
      console.error('Get templates error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取策略模板失败'
      }
    }
  }

  async getTemplate(templateId: string): Promise<ApiResponse<{ template: StrategyTemplate }>> {
    try {
      const response = await apiClient.get(`/api/strategies/templates/${templateId}`)
      return {
        success: true,
        data: { template: response.data.data }
      }
    } catch (error) {
      console.error('Get template error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取策略模板详情失败'
      }
    }
  }

  async getStrategies(): Promise<ApiResponse<{ strategies: StrategyInstance[] }>> {
    try {
      const response = await apiClient.get('/api/strategies')
      return {
        success: true,
        data: { strategies: response.data.data }
      }
    } catch (error) {
      console.error('Get strategies error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取策略列表失败'
      }
    }
  }

  async getStrategy(strategyId: string): Promise<ApiResponse<{ strategy: StrategyInstance }>> {
    try {
      const response = await apiClient.get(`/api/strategies/${strategyId}`)
      return {
        success: true,
        data: { strategy: response.data.data }
      }
    } catch (error) {
      console.error('Get strategy error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取策略详情失败'
      }
    }
  }

  async createStrategy(data: CreateStrategyRequest): Promise<ApiResponse<{ strategy: StrategyInstance }>> {
    try {
      const response = await apiClient.post('/api/strategies', data)
      return {
        success: true,
        data: { strategy: response.data.data }
      }
    } catch (error) {
      console.error('Create strategy error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建策略失败'
      }
    }
  }

  async updateStrategy(strategyId: string, data: UpdateStrategyRequest): Promise<ApiResponse<{ strategy: StrategyInstance }>> {
    try {
      const response = await apiClient.put(`/api/strategies/${strategyId}`, data)
      return {
        success: true,
        data: { strategy: response.data.data }
      }
    } catch (error) {
      console.error('Update strategy error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新策略失败'
      }
    }
  }

  async deleteStrategy(strategyId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.delete(`/api/strategies/${strategyId}`)
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Delete strategy error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除策略失败'
      }
    }
  }

  async startStrategy(strategyId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(`/api/strategies/${strategyId}/start`)
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Start strategy error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '启动策略失败'
      }
    }
  }

  async stopStrategy(strategyId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(`/api/strategies/${strategyId}/stop`)
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Stop strategy error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '停止策略失败'
      }
    }
  }

  async getPerformance(strategyId: string): Promise<ApiResponse<{ performance: any }>> {
    try {
      const response = await apiClient.get(`/api/strategies/${strategyId}/performance`)
      return {
        success: true,
        data: { performance: response.data.data }
      }
    } catch (error) {
      console.error('Get performance error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取策略表现失败'
      }
    }
  }

  async getStrategyLogs(strategyId: string, limit: number = 100): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get(`/api/strategies/${strategyId}/logs`, {
        params: { limit }
      })
      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      console.error('Get strategy logs error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取策略日志失败'
      }
    }
  }

  async clearStrategyLogs(strategyId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(`/api/strategies/${strategyId}/logs/clear`)
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Clear strategy logs error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '清除策略日志失败'
      }
    }
  }
}

export const strategyService = new StrategyService()

import axios from 'axios'
import { TradeRequest, ApiResponse } from '../types'
// API基础配置 - 设置正确的baseURL指向后端服务
const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export class TradingService {
  /**
   * 下单
   */
  async placeOrder(tradeRequest: TradeRequest): Promise<ApiResponse> {
    try {
      // 直接使用原始请求，后端期望字符串类型的type
      console.log('交易请求开始:', tradeRequest)
      console.log('请求URL:', '/api/trade/order')
      
      const response = await apiClient.post('/api/trade/order', tradeRequest)
      console.log('交易请求成功返回:', response.data)
      return {
        success: response.data.success || false,
        data: response.data,
        error: response.data.error,
      }
    } catch (error: any) {
      console.error('Place order error:', error)
      console.error('错误详情:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      })
      return {
        success: false,
        error: error.response?.data?.error || error.message || '下单失败',
      }
    }
  }

  /**
   * 修改订单
   */
  async modifyOrder(orderId: string, updates: Partial<TradeRequest>): Promise<ApiResponse> {
    try {
      const response = await apiClient.put(`/api/orders/${orderId}`, updates)
      return {
        success: response.data.success || false,
        data: response.data,
        error: response.data.error,
      }
    } catch (error) {
      console.error('Modify order error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '修改订单失败',
      }
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.delete(`/api/orders/${orderId}`)
      return {
        success: response.data.success || false,
        data: response.data,
        error: response.data.error,
      }
    } catch (error) {
      console.error('Cancel order error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '取消订单失败',
      }
    }
  }

  /**
   * 获取市场数据
   */
  async getTickData(symbol: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.get(`/api/market/tick/${symbol}`)
      return {
        success: response.data ? true : false,
        data: response.data,
        error: response.data ? undefined : '无法获取市场数据',
      }
    } catch (error) {
      console.error('Get tick data error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取市场数据失败',
      }
    }
  }

  /**
   * 获取历史K线数据
   */
  async getHistoricalData(
    symbol: string,
    timeframe: string,
    count: number = 1000
  ): Promise<ApiResponse> {
    try {
      const response = await apiClient.get(
        `/api/market/history/${symbol}/${timeframe}?count=${count}`
      )
      return {
        success: response.data ? true : false,
        data: response.data,
        error: response.data ? undefined : '无法获取历史数据',
      }
    } catch (error) {
      console.error('Get historical data error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取历史数据失败',
      }
    }
  }

  /**
   * 获取可用交易品种
   */
  async getSymbols(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get('/api/market/symbols')
      return {
        success: response.data ? true : false,
        data: response.data,
        error: response.data ? undefined : '无法获取交易品种',
      }
    } catch (error) {
      console.error('Get symbols error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取交易品种失败',
      }
    }
  }
}

// 创建单例实例
export const tradingService = new TradingService()
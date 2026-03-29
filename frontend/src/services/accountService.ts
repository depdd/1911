import axios from 'axios'
import { Position, Order, Trade, ApiResponse } from '../types'

// API基础配置 - 直接使用绝对路径避免代理问题
const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 添加请求拦截器，与authService保持一致的认证逻辑
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

// 下划线转驼峰函数
function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item))
  } else if (obj !== null && typeof obj === 'object') {
    const camelObj: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        camelObj[camelKey] = snakeToCamel(obj[key])
      }
    }
    return camelObj
  }
  return obj
}

export class AccountService {
  /**
   * 获取当前持仓
   */
  async getPositions(): Promise<ApiResponse<{ positions: Position[] }>> {
    try {
      const response = await apiClient.get('/api/positions')
      console.log('后端原始positions响应:', response.data)
      
      // 将后端返回的下划线命名转换为驼峰命名
      const positionsData = response.data.positions || []
      const camelPositions = positionsData.map((pos: any) => snakeToCamel(pos))
      
      console.log('转换后的positions数据:', camelPositions)
      
      return {
        success: true,
        data: { positions: camelPositions },
      }
    } catch (error) {
      console.error('Get positions error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取持仓失败',
      }
    }
  }

  /**
   * 获取账户摘要
   */
  async getAccountSummary(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/api/account/summary')
      console.log('后端原始account summary响应:', response.data)
      
      // 注意：后端直接返回了数据对象，没有success标志
      // 转换账户摘要数据的命名格式
      const camelSummary = snakeToCamel(response.data)
      
      console.log('转换后的account summary数据:', camelSummary)
      
      // 封装为前端期望的格式
      return {
        success: true, // 手动设置成功标志
        data: camelSummary, // 直接使用后端返回的数据作为data属性
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
   * 获取当前订单
   */
  async getOrders(): Promise<ApiResponse<{ orders: Order[] }>> {
    try {
      const response = await apiClient.get('/api/orders')
      console.log('后端原始orders响应:', response.data)
      
      // 将后端返回的下划线命名转换为驼峰命名
      const ordersData = response.data.orders || []
      const camelOrders = ordersData.map((order: any) => snakeToCamel(order))
      
      return {
        success: true,
        data: { orders: camelOrders },
      }
    } catch (error) {
      console.error('Get orders error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取订单失败',
      }
    }
  }

  /**
   * 获取历史交易
   */
  async getTrades(days: number = 30): Promise<ApiResponse<{ trades: Trade[] }>> {
    try {
      // 使用正确的API端点获取性能数据
      const response = await apiClient.get(`/api/dashboard/performance?days=${days}`)
      console.log('后端原始performance响应:', response.data)
      
      if (response.data.success && response.data.data) {
        // 从daily_pnl数据中提取交易信息
        const equityCurveData = response.data.data.daily_pnl || []
        
        // 将equity_curve数据转换为Trade[]格式
        const trades = equityCurveData
          .filter((item: any) => item.trade_id !== 'current' && item.symbol) // 过滤掉当前余额数据点
          .map((item: any) => ({
            ticket: item.trade_id || 'unknown',
            symbol: item.symbol,
            type: item.type,
            profit: item.profit,
            tradeTime: new Date(item.trade_time * 1000).toISOString(),
            volume: 0.1, // 假设默认交易量
            openPrice: 0,
            closePrice: 0
          }))
        
        return {
          success: true,
          data: { trades },
        }
      }
      
      // 如果API返回成功但没有数据，返回空数组
      return {
        success: true,
        data: { trades: [] },
      }
    } catch (error) {
      console.error('Get trades error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取交易记录失败',
      }
    }
  }

  /**
   * 获取历史订单
   */
  async getHistoryOrders(days: number = 30): Promise<ApiResponse<{ orders: Order[] }>> {
    try {
      const response = await apiClient.get(`/api/orders/history?days=${days}`)
      console.log('后端原始history orders响应:', response.data)
      
      // 将后端返回的下划线命名转换为驼峰命名
      const ordersData = response.data.orders || []
      const camelOrders = ordersData.map((order: any) => snakeToCamel(order))
      
      return {
        success: true,
        data: {
          orders: camelOrders
        },
      }
    } catch (error) {
      console.error('Get history orders error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取历史订单失败',
      }
    }
  }

  /**
   * 获取资金曲线数据
   */
  async getEquityCurve(days: number = 30): Promise<ApiResponse<{
    equityCurve: Array<{
      date: string
      profit: number
      cumulative: number
      cumulativeProfit: number
      tradeId: string
      tradeTime: number
      symbol?: string
      type?: string
    }>
    dailyPnl: Array<{ date: string; profit: number }>
    totalTrades: number
    totalProfit: number
    winRate: number
    maxDrawdown: number
    profitableTrades: number
    losingTrades: number
  }>> {
    try {
      const response = await apiClient.get(`/api/dashboard/performance?days=${days}`)
      console.log('后端原始performance响应:', response.data)
      
      if (response.data.success && response.data.data) {
        const data = response.data.data
        
        // 转换数据格式
        const equityCurve = (data.equity_curve || []).map((item: any) => ({
          date: item.date,
          profit: item.profit,
          cumulative: item.cumulative,
          cumulativeProfit: item.cumulative_profit,
          tradeId: item.trade_id,
          tradeTime: item.trade_time,
          symbol: item.symbol,
          type: item.type
        }))
        
        const dailyPnl = (data.daily_pnl || []).map((item: any) => ({
          date: item.date,
          profit: item.profit
        }))
        
        return {
          success: true,
          data: {
            equityCurve,
            dailyPnl,
            totalTrades: data.total_trades || 0,
            totalProfit: data.total_profit || 0,
            winRate: data.win_rate || 0,
            maxDrawdown: data.max_drawdown || 0,
            profitableTrades: data.profitable_trades || 0,
            losingTrades: data.losing_trades || 0
          }
        }
      }
      
      return {
        success: true,
        data: {
          equityCurve: [],
          dailyPnl: [],
          totalTrades: 0,
          totalProfit: 0,
          winRate: 0,
          maxDrawdown: 0,
          profitableTrades: 0,
          losingTrades: 0
        }
      }
    } catch (error) {
      console.error('Get equity curve error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取资金曲线失败',
      }
    }
  }

  /**
   * 按日期范围获取资金曲线数据
   */
  async getEquityCurveByDateRange(startDate: string, endDate: string): Promise<ApiResponse<{
    equityCurve: Array<{
      date: string
      profit: number
      cumulative: number
      cumulativeProfit: number
      tradeId: string
      tradeTime: number
      symbol?: string
      type?: string
    }>
    dailyPnl: Array<{ date: string; profit: number }>
    totalTrades: number
    totalProfit: number
    winRate: number
    maxDrawdown: number
    profitableTrades: number
    losingTrades: number
  }>> {
    try {
      const response = await apiClient.get(`/api/dashboard/performance?start_date=${startDate}&end_date=${endDate}`)
      console.log('后端原始performance响应(日期范围):', response.data)
      
      if (response.data.success && response.data.data) {
        const data = response.data.data
        
        const equityCurve = (data.equity_curve || []).map((item: any) => ({
          date: item.date,
          profit: item.profit,
          cumulative: item.cumulative,
          cumulativeProfit: item.cumulative_profit,
          tradeId: item.trade_id,
          tradeTime: item.trade_time,
          symbol: item.symbol,
          type: item.type
        }))
        
        const dailyPnl = (data.daily_pnl || []).map((item: any) => ({
          date: item.date,
          profit: item.profit
        }))
        
        return {
          success: true,
          data: {
            equityCurve,
            dailyPnl,
            totalTrades: data.total_trades || 0,
            totalProfit: data.total_profit || 0,
            winRate: data.win_rate || 0,
            maxDrawdown: data.max_drawdown || 0,
            profitableTrades: data.profitable_trades || 0,
            losingTrades: data.losing_trades || 0
          }
        }
      }
      
      return {
        success: true,
        data: {
          equityCurve: [],
          dailyPnl: [],
          totalTrades: 0,
          totalProfit: 0,
          winRate: 0,
          maxDrawdown: 0,
          profitableTrades: 0,
          losingTrades: 0
        }
      }
    } catch (error) {
      console.error('Get equity curve by date range error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取资金曲线失败',
      }
    }
  }

  /**
   * 平仓指定持仓
   */
  async closePosition(ticket: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(`/api/positions/${ticket}/close`)
      console.log('平仓响应:', response.data)
      
      return {
        success: response.data.success || false,
        data: snakeToCamel(response.data),
        error: response.data.error,
      }
    } catch (error) {
      console.error('Close position error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '平仓失败',
      }
    }
  }

  /**
   * 平仓所有持仓
   */
  async closeAllPositions(): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/api/positions/close_all')
      console.log('全部平仓响应:', response.data)
      
      return {
        success: response.data.success || false,
        data: snakeToCamel(response.data),
        error: response.data.error,
      }
    } catch (error) {
      console.error('Close all positions error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '全部平仓失败',
      }
    }
  }

  /**
   * 获取交易统计
   */
  async getTradingStats(days: number = 30): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/analytics/summary?days=${days}`)
      console.log('交易统计响应:', response.data)
      
      return {
        success: true,
        data: snakeToCamel(response.data),
      }
    } catch (error) {
      console.error('Get trading stats error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取交易统计失败',
      }
    }
  }
}

// 创建单例实例
export const accountService = new AccountService()
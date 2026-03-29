import axios from 'axios'
import { ApiResponse, KlineData, TickData } from '../types'

// API基础配置
const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// WebSocket服务
class WebSocketService {
  private socket: WebSocket | null = null
  private reconnectInterval = 5000
  private maxReconnectAttempts = 10
  private reconnectAttempts = 0
  private isConnected = false
  private isConnecting = false
  private subscriptions = new Set<string>()
  private callbacks = {
    onTick: [] as ((tick: any) => void)[],
    onKline: [] as ((kline: any) => void)[],
    onConnect: [] as (() => void)[],
    onDisconnect: [] as (() => void)[],
    onError: [] as ((error: Error) => void)[],
  }
  
  // 用于跟踪已处理的tick数据 - 优化去重逻辑
  private lastProcessedTicks = new Map<string, { timestamp: number, count: number }>()
  // 添加心跳计时器
  private heartbeatTimer: NodeJS.Timeout | null = null
  // 添加连接计时器
  private connectionTimer: NodeJS.Timeout | null = null
  // 添加时间偏移量（用于服务器时间同步）
  private timeOffset: number = 0
  // 指数退避重连
  private reconnectTimer: NodeJS.Timeout | null = null

  constructor(private wsUrl: string = 'ws://localhost:65534') {}

  connect(): void {
    if (this.isConnected || this.isConnecting) {
      console.log('WebSocket已在连接中或已连接')
      return
    }

    try {
      console.log('正在连接WebSocket服务器...')
      this.isConnecting = true
      
      // 清除旧的连接
      if (this.socket) {
        this.socket.close()
        this.socket = null
      }
      
      this.socket = new WebSocket(this.wsUrl)
      
      this.socket.onopen = () => {
        console.log('WebSocket连接已建立')
        this.isConnected = true
        this.isConnecting = false
        this.reconnectAttempts = 0
        
        // 启动心跳机制
        this.startHeartbeat()
        
        // 重新订阅之前订阅的品种（处理格式：symbol_timeframe）
        this.subscriptions.forEach(subscriptionKey => {
          const [symbol, timeframe] = subscriptionKey.split('_')
          if (symbol && timeframe) {
            setTimeout(() => this.subscribe(symbol, timeframe), 100)
          }
        })
        
        this.callbacks.onConnect.forEach(callback => callback())
      }
      
      this.socket.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data)
          this.handleMessage(rawData)
        } catch (error) {
          console.error('WebSocket消息解析失败:', error)
          this.callbacks.onError.forEach(callback => callback(error as Error))
        }
      }
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket连接已关闭，代码: ${event.code}, 原因: ${event.reason}`)
        this.isConnected = false
        this.isConnecting = false
        
        // 清理心跳
        this.stopHeartbeat()
        
        this.callbacks.onDisconnect.forEach(callback => callback())
        
        // 如果不是正常关闭，尝试重连
        if (event.code !== 1000) {
          this.scheduleReconnect()
        }
      }
      
      this.socket.onerror = (error) => {
        console.error('WebSocket错误:', error)
        this.isConnecting = false
        this.callbacks.onError.forEach(callback => callback(new Error('WebSocket连接错误')))
      }
      
      // 设置连接超时
      this.connectionTimer = setTimeout(() => {
        if (!this.isConnected && this.isConnecting) {
          console.log('WebSocket连接超时')
          this.isConnecting = false
          if (this.socket) {
            this.socket.close()
          }
          this.scheduleReconnect()
        }
      }, 10000)
      
    } catch (error) {
      console.error('WebSocket连接失败:', error)
      this.isConnecting = false
      this.callbacks.onError.forEach(callback => callback(error as Error))
      this.scheduleReconnect()
    }
  }
  
  private handleMessage(data: any): void {
    try {
      if (!data || typeof data !== 'object') {
        console.error('WebSocket消息格式错误:', data)
        return
      }

      const { type, data: payload } = data
      
      if (!type) {
        console.error('WebSocket消息缺少type字段:', data)
        return
      }

      switch (type) {
        case 'tick_data':
          if (!payload || !payload.symbol) {
            console.error('tick_data消息格式错误:', payload)
            return
          }
          
          const standardizedTick = this.standardizeTickData(payload)
          
          this.callbacks.onTick.forEach(callback => {
            try {
              callback(standardizedTick)
            } catch (error) {
              console.error('WebSocketService - 调用onTick回调失败:', error)
            }
          })
          break
          
        case 'kline_data':
          if (!payload || !payload.symbol) {
            console.error('kline_data消息格式错误:', payload)
            return
          }
          
          // 标准化kline数据，确保时间戳格式统一
          const standardizedKline = this.standardizeKlineData(payload)
          
          this.callbacks.onKline.forEach(callback => {
            try {
              callback(standardizedKline)
            } catch (error) {
              console.error('WebSocketService - 调用onKline回调失败:', error)
            }
          })
          break
          
        case 'welcome':
          console.log('WebSocket欢迎消息:', payload?.message || '连接成功')
          break
          
        case 'subscribed':
          console.log('WebSocket订阅确认:', payload)
          break
          
        case 'unsubscribed':
          console.log('WebSocket取消订阅确认:', payload)
          break
          
        case 'error':
          console.error('WebSocket服务器返回错误:', payload)
          this.callbacks.onError.forEach(callback => {
            callback(new Error(payload?.message || 'WebSocket服务器错误'))
          })
          break
          
        case 'pong':
          // 心跳响应，无需处理
          break
          
        default:
          console.log('收到未知类型的WebSocket消息:', type, payload)
      }
    } catch (error) {
      console.error('处理WebSocket消息时发生错误:', error, data)
      this.callbacks.onError.forEach(callback => {
        callback(error as Error)
      })
    }
  }
  
  private standardizeTickData(tickData: any): any {
    const volume = this.normalizeVolume(tickData)
    
    return {
      ...tickData,
      symbol: tickData.symbol || 'UNKNOWN',
      bid: Number(tickData.bid) || 0,
      ask: Number(tickData.ask) || 0,
      time: tickData.time || Math.floor(Date.now() / 1000),
      volume: volume,
      volume_real: volume,
      volumeReal: volume,
    }
  }
  
  private standardizeKlineData(klineData: any): any {
    const volume = this.normalizeVolume(klineData)
    
    return {
      ...klineData,
      symbol: klineData.symbol || 'UNKNOWN',
      time: klineData.time || Math.floor(Date.now() / 1000),
      open: Number(klineData.open) || 0,
      high: Number(klineData.high) || 0,
      low: Number(klineData.low) || 0,
      close: Number(klineData.close) || 0,
      volume: volume,
      volume_real: volume,
    }
  }
  
  private normalizeVolume(data: any): number {
    // 按优先级选择成交量字段
    const volumeSources = [
      data.volume_real,
      data.real_volume,
      data.volumeReal,
      data.volume,
      data.amount,
      0 // 默认值
    ]
    
    // 找到第一个有效值
    for (const vol of volumeSources) {
      const numVol = Number(vol)
      if (!isNaN(numVol) && numVol >= 0) {
        return numVol
      }
    }
    
    return 0
  }
  
  // @ts-ignore - reserved for future use
  private _isDuplicateTick(_tickData: any): boolean {
    return false
  }
  
  // @ts-ignore - reserved for future use
  private _recordProcessedTick(_tickData: any): void {
    // reserved for future use
  }
  
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }))
        } catch (error) {
          console.error('发送心跳失败:', error)
        }
      }
    }, 30000) // 每30秒发送一次心跳
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连')
      return
    }
    
    // 指数退避重连策略
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // 最大30秒
    )
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`尝试重新连接 (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})，延迟: ${delay}ms`)
      this.reconnectAttempts++
      this.connect()
    }, delay)
  }
  
  subscribe(symbol: string, timeframe: string = 'M1'): void {
    const subscriptionKey = `${symbol}_${timeframe}`
    this.subscriptions.add(subscriptionKey)
    
    if (!this.isConnected) {
      console.warn('WebSocket未连接，稍后连接成功后自动订阅')
      return
    }
    
    // 如果正在连接中，延迟订阅
    if (this.isConnecting) {
      setTimeout(() => this.subscribe(symbol, timeframe), 1000)
      return
    }
    
    const subscription = {
      type: 'subscribe',
      data: {
        channels: ['ticks', 'klines'],
        symbol: symbol,
        timeframe: timeframe
      }
    }
    
    try {
      this.socket?.send(JSON.stringify(subscription))
      console.log(`订阅品种: ${symbol}, 时间框架: ${timeframe}`)
    } catch (error) {
      console.error('发送订阅消息失败:', error)
    }
  }
  
  unsubscribe(symbol: string, timeframe: string = 'M1'): void {
    const subscriptionKey = `${symbol}_${timeframe}`
    this.subscriptions.delete(subscriptionKey)
    
    if (!this.isConnected) return
    
    const unsubscribe = {
      type: 'unsubscribe',
      data: {
        channels: ['ticks', 'klines'],
        symbol: symbol,
        timeframe: timeframe
      }
    }
    
    try {
      this.socket?.send(JSON.stringify(unsubscribe))
      console.log(`取消订阅品种: ${symbol}, 时间框架: ${timeframe}`)
    } catch (error) {
      console.error('发送取消订阅消息失败:', error)
    }
  }
  
  onTick(callback: (tick: any) => void): () => void {
    // 确保同一个回调不会重复添加
    const existingIndex = this.callbacks.onTick.findIndex(cb => cb === callback)
    if (existingIndex === -1) {
      this.callbacks.onTick.push(callback)
    }
    
    return () => {
      const index = this.callbacks.onTick.indexOf(callback)
      if (index > -1) {
        this.callbacks.onTick.splice(index, 1)
      }
    }
  }
  
  onKline(callback: (kline: any) => void): () => void {
    const existingIndex = this.callbacks.onKline.findIndex(cb => cb === callback)
    if (existingIndex === -1) {
      this.callbacks.onKline.push(callback)
    }
    
    return () => {
      const index = this.callbacks.onKline.indexOf(callback)
      if (index > -1) {
        this.callbacks.onKline.splice(index, 1)
      }
    }
  }
  
  onConnect(callback: () => void): () => void {
    const existingIndex = this.callbacks.onConnect.findIndex(cb => cb === callback)
    if (existingIndex === -1) {
      this.callbacks.onConnect.push(callback)
    }
    
    return () => {
      const index = this.callbacks.onConnect.indexOf(callback)
      if (index > -1) {
        this.callbacks.onConnect.splice(index, 1)
      }
    }
  }
  
  onDisconnect(callback: () => void): () => void {
    const existingIndex = this.callbacks.onDisconnect.findIndex(cb => cb === callback)
    if (existingIndex === -1) {
      this.callbacks.onDisconnect.push(callback)
    }
    
    return () => {
      const index = this.callbacks.onDisconnect.indexOf(callback)
      if (index > -1) {
        this.callbacks.onDisconnect.splice(index, 1)
      }
    }
  }
  
  onError(callback: (error: Error) => void): () => void {
    const existingIndex = this.callbacks.onError.findIndex(cb => cb === callback)
    if (existingIndex === -1) {
      this.callbacks.onError.push(callback)
    }
    
    return () => {
      const index = this.callbacks.onError.indexOf(callback)
      if (index > -1) {
        this.callbacks.onError.splice(index, 1)
      }
    }
  }
  
  disconnect(): void {
    // 清理所有计时器
    this.stopHeartbeat()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
    
    // 关闭WebSocket连接
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    
    this.isConnected = false
    this.isConnecting = false
    this.subscriptions.clear()
    this.lastProcessedTicks.clear()
    this.reconnectAttempts = 0
    
    console.log('WebSocket已断开连接')
  }
  
  getConnectionStatus(): boolean {
    return this.isConnected
  }
  
  getConnectionInfo(): {
    isConnected: boolean
    isConnecting: boolean
    reconnectAttempts: number
    maxReconnectAttempts: number
    subscribedSymbols: string[]
  } {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      subscribedSymbols: Array.from(this.subscriptions),
    }
  }
  
  // 添加服务器时间同步方法
  async syncServerTime(): Promise<void> {
    try {
      const response = await axios.get('http://localhost:5000/api/server-time', { timeout: 5000 })
      if (response.data && response.data.timestamp) {
        const serverTime = response.data.timestamp
        const clientTime = Date.now()
        const roundTripTime = response.headers['x-response-time'] ? 
          parseInt(response.headers['x-response-time']) : 50
        
        // 计算时间偏移（假设网络延迟是对称的）
        this.timeOffset = serverTime - clientTime + roundTripTime / 2
        console.log(`时间同步完成: 服务器时间偏移 ${this.timeOffset}ms`)
      }
    } catch (error) {
      console.warn('时间同步失败，使用本地时间:', error)
    }
  }
}

// 创建WebSocket服务单例
const webSocketService = new WebSocketService('ws://localhost:65534')

export class MarketService {
  private wsService = webSocketService
  
  constructor() {
    // 自动连接WebSocket
    this.wsService.connect()
    
    // 定期同步服务器时间（每小时一次）
    this.wsService.syncServerTime()
    setInterval(() => this.wsService.syncServerTime(), 3600000)
  }
  
  /**
   * 获取交易品种列表
   */
  async getSymbols(): Promise<ApiResponse<{
    all_symbols: string[]
    forex_pairs: string[]
    commodities: string[]
    indices: string[]
    total_count: number
  }>> {
    try {
      const response = await apiClient.get('/api/market/symbols')
      return {
        success: response.data.success || false,
        data: response.data.data,
        error: response.data.error,
      }
    } catch (error: any) {
      console.error('Get symbols error:', error)
      return {
        success: false,
        error: error.response?.data?.error || error.message || '获取交易品种失败',
      }
    }
  }

  /**
   * 获取Tick数据
   */
  async getTickData(symbol: string): Promise<ApiResponse<TickData>> {
    try {
      const response = await apiClient.get(`/api/market/tick/${symbol}`)
      return {
        success: response.data.success || false,
        data: response.data.data,
        error: response.data.error,
      }
    } catch (error: any) {
      console.error(`Get tick data error for ${symbol}:`, error)
      return {
        success: false,
        error: error.response?.data?.error || error.message || '获取Tick数据失败',
      }
    }
  }

  /**
   * 获取历史K线数据
   */
  async getHistoryKlineData(
    symbol: string,
    timeframe: string,
    count: number = 100
  ): Promise<ApiResponse<{
    symbol: string
    timeframe: string
    data: KlineData[]
    count: number
  }>> {
    try {
      const response = await apiClient.get(`/api/market/history/${symbol}/${timeframe}?count=${count}`)
      
      return {
        success: response.data.success || false,
        data: response.data.data,
        error: response.data.error,
      }
    } catch (error: any) {
      console.error(`Get history Kline data error for ${symbol} ${timeframe}:`, error)
      return {
        success: false,
        error: error.response?.data?.error || error.message || '获取历史K线数据失败',
      }
    }
  }
  
  /**
   * 获取服务器时间
   */
  async getServerTime(): Promise<ApiResponse<{ timestamp: number }>> {
    try {
      const response = await apiClient.get('/api/server-time')
      return {
        success: response.data.success || false,
        data: response.data.data,
        error: response.data.error,
      }
    } catch (error: any) {
      console.error('Get server time error:', error)
      return {
        success: false,
        error: error.response?.data?.error || error.message || '获取服务器时间失败',
      }
    }
  }
  
  /**
   * WebSocket相关方法
   */
  subscribeToSymbol(symbol: string, timeframe: string = 'M1'): void {
    console.log(`MarketService - 订阅品种: ${symbol}, 时间框架: ${timeframe}`)
    this.wsService.subscribe(symbol, timeframe)
  }
  
  unsubscribeFromSymbol(symbol: string, timeframe: string = 'M1'): void {
    console.log(`MarketService - 取消订阅品种: ${symbol}, 时间框架: ${timeframe}`)
    this.wsService.unsubscribe(symbol, timeframe)
  }
  
  onTick(callback: (tick: any) => void): () => void {
    return this.wsService.onTick(callback)
  }
  
  onKline(callback: (kline: any) => void): () => void {
    return this.wsService.onKline(callback)
  }
  
  onConnect(callback: () => void): () => void {
    return this.wsService.onConnect(callback)
  }
  
  onDisconnect(callback: () => void): () => void {
    return this.wsService.onDisconnect(callback)
  }
  
  onError(callback: (error: Error) => void): () => void {
    return this.wsService.onError(callback)
  }
  
  getConnectionStatus(): boolean {
    return this.wsService.getConnectionStatus()
  }
  
  getConnectionInfo(): {
    isConnected: boolean
    isConnecting: boolean
    reconnectAttempts: number
    maxReconnectAttempts: number
    subscribedSymbols: string[]
  } {
    return this.wsService.getConnectionInfo()
  }
  
  // 添加手动重连方法
  reconnect(): void {
    console.log('MarketService - 手动重连WebSocket')
    this.wsService.disconnect()
    setTimeout(() => this.wsService.connect(), 1000)
  }
  
  // 添加断开连接方法
  disconnect(): void {
    console.log('MarketService - 断开WebSocket连接')
    this.wsService.disconnect()
  }
  
  // 同步服务器时间
  async syncServerTime(): Promise<void> {
    await this.wsService.syncServerTime()
  }
}

export default new MarketService()
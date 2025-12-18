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
  
  // 用于跟踪已处理的tick数据
  private lastProcessedTicks = new Map<string, { timestamp: number, count: number }>()

  constructor(private wsUrl: string = 'ws://localhost:65534') {}

  connect(): void {
    if (this.isConnected || this.isConnecting) {
      console.log('WebSocket已在连接中或已连接')
      return
    }

    try {
      console.log('正在连接WebSocket服务器...')
      this.isConnecting = true
      this.socket = new WebSocket(this.wsUrl)
      
      this.socket.onopen = () => {
        console.log('WebSocket连接已建立')
        this.isConnected = true
        this.isConnecting = false
        this.reconnectAttempts = 0
        
        // 重新订阅之前订阅的品种（处理格式：symbol_timeframe）
        this.subscriptions.forEach(subscriptionKey => {
          const [symbol, timeframe] = subscriptionKey.split('_')
          this.subscribe(symbol, timeframe)
        })
        
        this.callbacks.onConnect.forEach(callback => callback())
      }
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('WebSocket消息解析失败:', error)
          this.callbacks.onError.forEach(callback => callback(error as Error))
        }
      }
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket连接已关闭，代码: ${event.code}, 原因: ${event.reason}`)
        this.isConnected = false
        this.isConnecting = false
        this.callbacks.onDisconnect.forEach(callback => callback())
        this.scheduleReconnect()
      }
      
      this.socket.onerror = (error) => {
        console.error('WebSocket错误:', error)
        this.isConnecting = false
        this.callbacks.onError.forEach(callback => callback(new Error('WebSocket连接错误')))
      }
      
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

      console.log(`WebSocketService - 收到${type}消息:`, payload)

      switch (type) {
        case 'tick_data':
          if (!payload || !payload.symbol) {
            console.error('tick_data消息格式错误:', payload)
            return
          }
          
          // 标准化tick数据，确保时间戳格式统一
          const standardizedTick = this.standardizeTickData(payload)
          
          // 检查是否是重复的tick（防止同一个tick被处理多次）
          if (this.isDuplicateTick(standardizedTick)) {
            console.log('检测到重复的tick数据，跳过处理:', {
              symbol: standardizedTick.symbol,
              time: standardizedTick.time,
              timestamp: standardizedTick.timestamp
            })
            return
          }
          
          console.log('WebSocketService - 处理标准化的tick_data消息:', {
            symbol: standardizedTick.symbol,
            time: standardizedTick.time,
            bid: standardizedTick.bid,
            ask: standardizedTick.ask,
            timestamp: standardizedTick.timestamp,
            volume: standardizedTick.volume
          })
          
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
          
          console.log('WebSocketService - 处理标准化的kline_data消息:', {
            symbol: standardizedKline.symbol,
            time: standardizedKline.time,
            open: standardizedKline.open,
            high: standardizedKline.high,
            low: standardizedKline.low,
            close: standardizedKline.close,
            volume: standardizedKline.volume
          })
          
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
    // 关键修复：统一时间戳处理逻辑
    let timestamp: number
    let time: number
    
    // 优先使用tickData中的time字段（这应该是Redis中的秒级时间戳）
    if (tickData.time && typeof tickData.time === 'number') {
      // 从monitor_redis_ticks.py可以看到，Redis存储的是秒级时间戳
      time = tickData.time  // 秒级时间戳
      timestamp = time * 1000  // 转换为毫秒级
    } else {
      // 如果没有time字段，使用当前时间
      time = Math.floor(Date.now() / 1000)
      timestamp = Date.now()
    }
    
    // 返回标准化的tick数据
    return {
      ...tickData,
      symbol: tickData.symbol || 'UNKNOWN',
      bid: Number(tickData.bid) || 0,
      ask: Number(tickData.ask) || 0,
      timestamp: timestamp, // 毫秒级时间戳
      time: time, // 秒级时间戳
      volume: tickData.volume || 0,
      volume_real: tickData.volume_real || 0,
    }
  }
  
  private standardizeKlineData(klineData: any): any {
    // 标准化kline数据，确保时间戳格式统一
    let time: number
    
    // 确保time是数字格式
    if (klineData.time && typeof klineData.time === 'object' && klineData.time instanceof Date) {
      // 如果是Date对象，转换为秒级时间戳
      time = Math.floor(klineData.time.getTime() / 1000)
    } else if (klineData.time && typeof klineData.time === 'number') {
      time = klineData.time
    } else if (klineData.time && typeof klineData.time === 'string') {
      // 如果是字符串，尝试解析为Date对象
      const date = new Date(klineData.time)
      if (!isNaN(date.getTime())) {
        // 如果是有效的日期字符串，转换为秒级时间戳
        time = Math.floor(date.getTime() / 1000)
      } else {
        // 尝试直接解析为数字
        time = Number(klineData.time)
      }
    } else {
      // 如果没有time字段或无法解析，使用当前时间的K线开始时间
      const now = Date.now()
      time = Math.floor(now / 60000) * 60  // 默认分钟级K线
    }
    
    // 确保最终time是有效的数字，如果不是则使用当前时间
    if (isNaN(time)) {
      const now = Date.now()
      time = Math.floor(now / 60000) * 60  // 默认分钟级K线
    }
    
    // 优先使用转换后的成交量单位，与历史数据保持一致
    const volume = Number(klineData.volume_real) || Number(klineData.volume) || Number(klineData.volumeReal) || Number(klineData.real_volume) || Number(klineData.realVolume) || Number(klineData.amount) || 0
    
    // 返回标准化的kline数据
    return {
      ...klineData,
      symbol: klineData.symbol || 'UNKNOWN',
      time: time, // 确保是数字格式的时间戳
      open: Number(klineData.open) || 0,
      high: Number(klineData.high) || 0,
      low: Number(klineData.low) || 0,
      close: Number(klineData.close) || 0,
      volume: volume, // 优先使用转换后的成交量单位
      volume_real: Number(klineData.volume_real) || Number(klineData.volumeReal) || Number(klineData.real_volume) || Number(klineData.realVolume) || Number(klineData.amount) || volume,
      real_volume: Number(klineData.real_volume) || Number(klineData.realVolume) || Number(klineData.volume_real) || Number(klineData.volumeReal) || Number(klineData.amount) || volume
    }
  }
  
  private isDuplicateTick(tickData: any): boolean {
    const key = `${tickData.symbol}_${tickData.timestamp}`  // 使用毫秒级时间戳作为键
    const lastTick = this.lastProcessedTicks.get(key)
    
    if (lastTick) {
      // 相同毫秒级时间戳的tick，可能是重复的
      return true
    }
    
    // 更新最后处理的tick
    this.lastProcessedTicks.set(key, {
      timestamp: tickData.timestamp,
      count: 1  // 新的tick数据，计数从1开始
    })
    
    // 清理旧的记录（避免内存泄漏）
    if (this.lastProcessedTicks.size > 500) {  // 增加容量以处理更高频率的tick数据
      const oldestKey = this.lastProcessedTicks.keys().next().value
      if (oldestKey) {
        this.lastProcessedTicks.delete(oldestKey)
      }
    }
    
    return false
  }
  
  subscribe(symbol: string, timeframe: string = 'M1'): void {
    if (!this.isConnected) {
      console.warn('WebSocket未连接，稍后重试订阅')
      this.subscriptions.add(`${symbol}_${timeframe}`)
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
    
    this.socket?.send(JSON.stringify(subscription))
    this.subscriptions.add(`${symbol}_${timeframe}`)
  }
  
  unsubscribe(symbol: string, timeframe: string = 'M1'): void {
    if (!this.isConnected) return
    
    const unsubscribe = {
      type: 'unsubscribe',
      data: {
        channels: ['ticks', 'klines'],
        symbol: symbol,
        timeframe: timeframe
      }
    }
    
    this.socket?.send(JSON.stringify(unsubscribe))
    this.subscriptions.delete(`${symbol}_${timeframe}`)
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
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连')
      return
    }
    
    setTimeout(() => {
      console.log(`尝试重新连接 (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
      this.reconnectAttempts++
      this.connect()
    }, this.reconnectInterval)
  }
  
  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    this.isConnected = false
    this.isConnecting = false
    this.subscriptions.clear()
    this.lastProcessedTicks.clear()
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
}

// 创建WebSocket服务单例，使用正确的端口
const webSocketService = new WebSocketService('ws://localhost:65534')

export class MarketService {
  private wsService = webSocketService
  
  constructor() {
    // 自动连接WebSocket
    this.wsService.connect()
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
}

export default new MarketService()
// 全局类型定义

export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: string
  lastLogin?: string
}

export interface Account {
  login: string
  server: string
  balance: number
  equity: number
  margin: number
  freeMargin: number
  marginLevel: number
  currency: string
  leverage: number
  profit: number
  credit: number
  company: string
}

export interface Position {
  ticket: string
  symbol: string
  type: 'buy' | 'sell'
  volume: number
  openPrice: number
  currentPrice: number
  sl: number
  tp: number
  profit: number
  swap: number
  commission: number
  openTime: string
  magicNumber: number
  comment: string
}

export interface Order {
  ticket: string
  symbol: string
  type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop'
  volume: number
  price: number
  sl: number
  tp: number
  currentVolume: number
  openTime: string
  expirationTime?: string
  magicNumber: number
  comment: string
  status: 'pending' | 'filled' | 'cancelled'
}

export interface Trade {
  ticket: string
  orderTicket: string
  positionTicket: string
  symbol: string
  type: 'buy' | 'sell' | 'balance' | 'credit'
  volume: number
  price: number
  profit: number
  swap: number
  commission: number
  magicNumber: number
  comment: string
  tradeTime: string
}

export interface TickData {
  symbol: string
  time: number
  bid: number
  ask: number
  last: number
  volume: number
  timeMsc: number
  flags: number
  volumeReal: number
}

export interface KlineData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  spread?: number
  realVolume?: number
}

export interface Strategy {
  id: string
  name: string
  description: string
  filePath: string
  parameters: Record<string, any>
  isActive: boolean
  isPublic: boolean
  createdBy: string
  performanceData?: StrategyPerformance
  createdAt: string
  updatedAt: string
}

export interface StrategyPerformance {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalProfit: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  sharpeRatio: number
}

export interface StrategyExecution {
  id: string
  strategyId: string
  accountId: string
  parameters: Record<string, any>
  status: 'running' | 'stopped' | 'paused' | 'error'
  startTime?: string
  endTime?: string
  totalTrades: number
  totalProfit: number
  maxDrawdown: number
  createdAt: string
  updatedAt: string
}

export interface TradingStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalProfit: number
  grossProfit: number
  grossLoss: number
  winRate: number
  profitFactor: number
  maxDrawdown: number
  sharpeRatio: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  consecutiveWins: number
  consecutiveLosses: number
}

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

export interface WebSocketState {
  isConnected: boolean
  messages: WebSocketMessage[]
  subscriptions: string[]
}

export interface AppState {
  auth: {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
  }
  websocket: WebSocketState
  mt5: {
    isConnected: boolean
    account: Account | null
    positions: Position[]
    orders: Order[]
  }
  market: {
    symbols: string[]
    tickData: Record<string, TickData>
    klineData: Record<string, KlineData[]>
  }
  strategies: {
    list: Strategy[]
    executions: StrategyExecution[]
  }
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 分页响应类型
export interface PaginatedResponse<T = any> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 图表配置类型
export interface ChartConfig {
  symbol: string
  timeframe: string
  indicators: string[]
  theme: 'dark' | 'light'
}

// 策略参数类型
export interface StrategyParameters {
  [key: string]: string | number | boolean
}

// 交易请求类型
export interface TradeRequest {
  symbol: string
  type: 'buy' | 'sell'
  volume: number
  price?: number
  sl?: number
  tp?: number
  comment?: string
  magicNumber?: number
}

// 风险设置类型
export interface RiskSettings {
  maxPositions: number
  riskPercentage: number
  maxDailyLoss: number
  maxDrawdown: number
  useStopLoss: boolean
  useTakeProfit: boolean
}

// 用户设置类型
export interface UserSettings {
  theme: 'dark' | 'light'
  language: 'zh' | 'en'
  timezone: string
  chartSettings: ChartConfig
  notificationSettings: {
    email: boolean
    push: boolean
    sound: boolean
  }
  riskSettings: RiskSettings
}

// MarketService接口
export interface MarketService {
  getSymbols(): Promise<ApiResponse<{
    all_symbols: string[]
    forex_pairs: string[]
    commodities: string[]
    indices: string[]
    total_count: number
  }>>
  
  getTickData(symbol: string): Promise<ApiResponse<TickData>>
  
  getHistoryKlineData(
    symbol: string,
    timeframe: string,
    count?: number
  ): Promise<ApiResponse<{
    symbol: string
    timeframe: string
    data: KlineData[]
    count: number
  }>>
  
  subscribeToSymbol(symbol: string): void
  
  unsubscribeFromSymbol(symbol: string): void
  
  onTick(callback: (tick: any) => void): void
  
  onKline(callback: (kline: any) => void): void
  
  onConnect(callback: () => void): void
  
  onDisconnect(callback: () => void): void
  
  getConnectionStatus(): boolean
}
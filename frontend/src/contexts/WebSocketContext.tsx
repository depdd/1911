import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode, useCallback } from 'react'
import { WebSocketMessage, WebSocketState } from '../types'

// 状态类型
interface WebSocketContextState extends WebSocketState {
  connect: (url: string) => void
  disconnect: () => void
  sendMessage: (message: WebSocketMessage) => void
  subscribe: (channel: string) => void
  unsubscribe: (channel: string) => void
}

// 动作类型
type WebSocketAction =
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT_SUCCESS' }
  | { type: 'CONNECT_FAILURE'; payload: string }
  | { type: 'DISCONNECT' }
  | { type: 'MESSAGE_RECEIVED'; payload: WebSocketMessage }
  | { type: 'MESSAGE_SENT'; payload: WebSocketMessage }
  | { type: 'SUBSCRIBE'; payload: string }
  | { type: 'UNSUBSCRIBE'; payload: string }
  | { type: 'CLEAR_MESSAGES' }

// 初始状态
const initialState: WebSocketState = {
  isConnected: false,
  messages: [],
  subscriptions: []
}

// Reducer函数
const webSocketReducer = (state: WebSocketState, action: WebSocketAction): WebSocketState => {
  switch (action.type) {
    case 'CONNECT_START':
      return {
          ...state,
          isConnected: false
        }
    case 'CONNECT_SUCCESS':
      return {
        ...state,
        isConnected: true
      }
    case 'CONNECT_FAILURE':
      return {
        ...state,
        isConnected: false
      }
    case 'DISCONNECT':
      return {
        ...state,
        isConnected: false,
        subscriptions: []
      }
    case 'MESSAGE_RECEIVED':
      return {
        ...state,
        messages: [...state.messages.slice(-99), action.payload] // 保留最近100条消息
      }
    case 'MESSAGE_SENT':
      return {
        ...state,
        messages: [...state.messages.slice(-99), action.payload]
      }
    case 'SUBSCRIBE':
      return {
        ...state,
        subscriptions: [...new Set([...state.subscriptions, action.payload])]
      }
    case 'UNSUBSCRIBE':
      return {
        ...state,
        subscriptions: state.subscriptions.filter(sub => sub !== action.payload)
      }
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: []
      }
    default:
      return state
  }
}

// Context
const WebSocketContext = createContext<WebSocketContextState | undefined>(undefined)

// Provider组件
interface WebSocketProviderProps {
  children: ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(webSocketReducer, initialState)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000

  // 发送消息
  const sendMessage = useCallback((message: WebSocketMessage): void => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
        dispatch({ type: 'MESSAGE_SENT', payload: message })
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
      }
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [dispatch])

  // 连接WebSocket
  const connect = useCallback((url: string): void => {
    try {
      dispatch({ type: 'CONNECT_START' })
      
      wsRef.current = new WebSocket(url)
      
      wsRef.current.onopen = () => {
        dispatch({ type: 'CONNECT_SUCCESS' })
        reconnectAttempts.current = 0
        
        // 重新订阅之前的频道
        state.subscriptions.forEach(channel => {
          sendMessage({
            type: 'subscribe',
            data: { channels: [channel] },
            timestamp: new Date().toISOString()
          })
        })
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          dispatch({ type: 'MESSAGE_RECEIVED', payload: message })
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code)
        dispatch({ type: 'DISCONNECT' })
        
        // 自动重连逻辑
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(url)
          }, reconnectDelay)
        }
      }
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        dispatch({ type: 'CONNECT_FAILURE', payload: 'WebSocket connection failed' })
      }
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      dispatch({ type: 'CONNECT_FAILURE', payload: 'Failed to create WebSocket connection' })
    }
  }, [dispatch, sendMessage, state.subscriptions])

  // 断开连接
  const disconnect = (): void => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    dispatch({ type: 'DISCONNECT' })
  }

  // 订阅频道
  const subscribe = useCallback((channel: string): void => {
    dispatch({ type: 'SUBSCRIBE', payload: channel })
    
    if (state.isConnected) {
      const subscribeMsg = {
        type: 'subscribe',
        data: { channels: [channel] },
        timestamp: new Date().toISOString()
      }
      sendMessage(subscribeMsg)
    }
  }, [dispatch, sendMessage, state.isConnected])

  // 取消订阅
  const unsubscribe = useCallback((channel: string): void => {
    dispatch({ type: 'UNSUBSCRIBE', payload: channel })
    
    if (state.isConnected) {
      sendMessage({
        type: 'unsubscribe',
        data: { channels: [channel] },
        timestamp: new Date().toISOString()
      })
    }
  }, [dispatch, sendMessage, state.isConnected])

  // 清理
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      disconnect()
    }
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        sendMessage,
        subscribe,
        unsubscribe
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

// Hook
export const useWebSocket = (): WebSocketContextState => {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
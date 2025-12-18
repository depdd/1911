import { useState, useEffect, useRef, useCallback } from 'react'
import { WebSocketMessage } from '../types'

interface WebSocketHook {
  connected: boolean
  socket: WebSocket | null
  sendMessage: (message: any) => void
  lastMessage: WebSocketMessage | null
}

export const useWebSocket = (url: string = 'ws://localhost:65534'): WebSocketHook => {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  // 发送消息函数
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
    }
  }, [])

  useEffect(() => {
    // 创建WebSocket连接
    const socket = new WebSocket(url)
    socketRef.current = socket

    // 连接打开事件
    socket.addEventListener('open', () => {
      console.log('WebSocket connected')
      setConnected(true)
    })

    // 接收消息事件
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage
        setLastMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    })

    // 连接关闭事件
    socket.addEventListener('close', () => {
      console.log('WebSocket disconnected')
      setConnected(false)
    })

    // 连接错误事件
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error)
      setConnected(false)
    })

    // 清理函数
    return () => {
      socket.close()
      socketRef.current = null
      setConnected(false)
    }
  }, [url])

  return {
    connected,
    socket: socketRef.current,
    sendMessage,
    lastMessage,
  }
}

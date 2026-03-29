import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface CacheItem {
  key: string
  element: ReactNode
}

interface KeepAliveContextType {
  getCache: (key: string) => CacheItem | undefined
  setCache: (key: string, element: ReactNode) => void
  clearCache: (key: string) => void
  clearAllCache: () => void
  activeKey: string
}

const KeepAliveContext = createContext<KeepAliveContextType | undefined>(undefined)

export const useKeepAlive = () => {
  const context = useContext(KeepAliveContext)
  if (!context) {
    throw new Error('useKeepAlive must be used within KeepAliveProvider')
  }
  return context
}

interface KeepAliveProviderProps {
  children: ReactNode
}

export const KeepAliveProvider: React.FC<KeepAliveProviderProps> = ({ children }) => {
  const [caches, setCaches] = useState<Map<string, CacheItem>>(new Map())
  const [activeKey, setActiveKey] = useState<string>('')
  const location = useLocation()
  const prevPathRef = useRef<string>('')

  useEffect(() => {
    const currentPath = location.pathname
    if (currentPath !== prevPathRef.current) {
      setActiveKey(currentPath)
      prevPathRef.current = currentPath
    }
  }, [location.pathname])

  const getCache = useCallback((key: string) => {
    return caches.get(key)
  }, [caches])

  const setCache = useCallback((key: string, element: ReactNode) => {
    setCaches(prev => {
      const newCaches = new Map(prev)
      newCaches.set(key, { key, element })
      return newCaches
    })
  }, [])

  const clearCache = useCallback((key: string) => {
    setCaches(prev => {
      const newCaches = new Map(prev)
      newCaches.delete(key)
      return newCaches
    })
  }, [])

  const clearAllCache = useCallback(() => {
    setCaches(new Map())
  }, [])

  return (
    <KeepAliveContext.Provider
      value={{
        getCache,
        setCache,
        clearCache,
        clearAllCache,
        activeKey
      }}
    >
      {children}
      {Array.from(caches.values()).map(item => (
        <div
          key={item.key}
          style={{
            display: activeKey === item.key ? 'block' : 'none',
            position: activeKey === item.key ? 'relative' : 'absolute',
            left: activeKey === item.key ? 0 : -9999,
            top: 0,
            width: '100%',
            height: activeKey === item.key ? 'auto' : 0,
            overflow: 'hidden'
          }}
        >
          {item.element}
        </div>
      ))}
    </KeepAliveContext.Provider>
  )
}

interface KeepAliveRouteProps {
  pageKey: string
  children: ReactNode
}

export const KeepAliveRoute: React.FC<KeepAliveRouteProps> = ({ pageKey, children }) => {
  const { setCache, activeKey } = useKeepAlive()
  const isInitialized = useRef(false)

  useEffect(() => {
    if (!isInitialized.current) {
      setCache(pageKey, children)
      isInitialized.current = true
    }
  }, [pageKey, children, setCache])

  useEffect(() => {
    if (isInitialized.current && activeKey === pageKey) {
      setCache(pageKey, children)
    }
  }, [children, pageKey, setCache, activeKey])

  return null
}

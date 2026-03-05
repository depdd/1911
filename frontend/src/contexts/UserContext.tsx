import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { userAuthService, User, MT5Account, UserStrategy } from '../services/userAuthService'

interface UserContextType {
  user: User | null
  mt5Accounts: MT5Account[]
  strategies: UserStrategy[]
  isAuthenticated: boolean
  isLoading: boolean
  subscription: any | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshAccounts: () => Promise<void>
  refreshStrategies: () => Promise<void>
  refreshSubscription: () => Promise<void>
  addMT5Account: (data: any) => Promise<{ success: boolean; data?: MT5Account; error?: string }>
  deleteMT5Account: (id: number) => Promise<{ success: boolean; error?: string }>
  createStrategy: (data: any) => Promise<{ success: boolean; data?: UserStrategy; error?: string }>
  startStrategy: (id: number) => Promise<{ success: boolean; error?: string }>
  stopStrategy: (id: number) => Promise<{ success: boolean; error?: string }>
  deleteStrategy: (id: number) => Promise<{ success: boolean; error?: string }>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [mt5Accounts, setMT5Accounts] = useState<MT5Account[]>([])
  const [strategies, setStrategies] = useState<UserStrategy[]>([])
  const [subscription, setSubscription] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  useEffect(() => {
    const initAuth = async () => {
      if (userAuthService.isAuthenticated()) {
        const storedUser = userAuthService.getStoredUser()
        if (storedUser) {
          setUser(storedUser)
        }
        
        const currentUser = await userAuthService.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
        } else {
          setUser(null)
          userAuthService.logout()
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  useEffect(() => {
    if (user) {
      refreshAccounts()
      refreshStrategies()
      refreshSubscription()
    }
  }, [user])

  const login = async (email: string, password: string) => {
    const result = await userAuthService.login(email, password)
    if (result.success && result.data) {
      setUser(result.data.user)
    }
    return result
  }

  const register = async (email: string, username: string, password: string) => {
    const result = await userAuthService.register(email, username, password)
    if (result.success && result.data) {
      setUser(result.data.user)
    }
    return result
  }

  const logout = async () => {
    await userAuthService.logout()
    setUser(null)
    setMT5Accounts([])
    setStrategies([])
  }

  const refreshUser = async () => {
    const currentUser = await userAuthService.getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
    }
  }

  const refreshAccounts = async () => {
    const accounts = await userAuthService.getMT5Accounts()
    setMT5Accounts(accounts)
  }

  const refreshStrategies = async () => {
    const userStrategies = await userAuthService.getUserStrategies()
    setStrategies(userStrategies)
  }

  const refreshSubscription = async () => {
    const subData = await userAuthService.getSubscription()
    setSubscription(subData)
  }

  const addMT5Account = async (data: any) => {
    const result = await userAuthService.addMT5Account(data)
    if (result.success) {
      await refreshAccounts()
    }
    return result
  }

  const deleteMT5Account = async (id: number) => {
    const result = await userAuthService.deleteMT5Account(id)
    if (result.success) {
      await refreshAccounts()
    }
    return result
  }

  const createStrategy = async (data: any) => {
    const result = await userAuthService.createUserStrategy(data)
    if (result.success) {
      await refreshStrategies()
    }
    return result
  }

  const startStrategy = async (id: number) => {
    const result = await userAuthService.startStrategy(id)
    if (result.success) {
      await refreshStrategies()
    }
    return result
  }

  const stopStrategy = async (id: number) => {
    const result = await userAuthService.stopStrategy(id)
    if (result.success) {
      await refreshStrategies()
    }
    return result
  }

  const deleteStrategy = async (id: number) => {
    const result = await userAuthService.deleteStrategy(id)
    if (result.success) {
      await refreshStrategies()
    }
    return result
  }

  return (
    <UserContext.Provider
      value={{
        user,
        mt5Accounts,
        strategies,
        isAuthenticated,
        isLoading,
        subscription,
        login,
        register,
        logout,
        refreshUser,
        refreshAccounts,
        refreshStrategies,
        refreshSubscription,
        addMT5Account,
        deleteMT5Account,
        createStrategy,
        startStrategy,
        stopStrategy,
        deleteStrategy,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import i18n from 'i18next'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000,
})

interface LanguageContextType {
  language: string
  setLanguage: (lang: string) => void
  t: (key: string, options?: any) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState(i18n.language)

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    setLanguageState(lang)
  }

  const t = (key: string, options?: any): string => {
    return String(i18n.t(key, options))
  }

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const response = await apiClient.get('/settings')
        if (response.data.success) {
          const savedLang = response.data.data.language || 'zh'
          setLanguage(savedLang)
        }
      } catch (error) {
        console.error('Failed to load language:', error)
      }
    }
    loadLanguage()
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

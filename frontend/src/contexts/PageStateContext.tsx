import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react'

interface PageState {
  scrollPosition: number
  formData?: Record<string, any>
  filters?: Record<string, any>
  customState?: Record<string, any>
}

interface PageStateContextType {
  getPageState: (pageKey: string) => PageState | undefined
  setPageState: (pageKey: string, state: Partial<PageState>) => void
  clearPageState: (pageKey: string) => void
  clearAllPageStates: () => void
  mountedPages: React.MutableRefObject<Set<string>>
}

const PageStateContext = createContext<PageStateContextType | undefined>(undefined)

export const usePageState = () => {
  const context = useContext(PageStateContext)
  if (!context) {
    throw new Error('usePageState must be used within a PageStateProvider')
  }
  return context
}

interface PageStateProviderProps {
  children: ReactNode
}

export const PageStateProvider: React.FC<PageStateProviderProps> = ({ children }) => {
  const pageStates = useRef<Map<string, PageState>>(new Map())
  const mountedPages = useRef<Set<string>>(new Set())

  const getPageState = useCallback((pageKey: string) => {
    return pageStates.current.get(pageKey)
  }, [])

  const setPageState = useCallback((pageKey: string, state: Partial<PageState>) => {
    const currentState = pageStates.current.get(pageKey) || {
      scrollPosition: 0,
      formData: {},
      filters: {},
      customState: {}
    }
    
    pageStates.current.set(pageKey, {
      ...currentState,
      ...state,
      formData: { ...currentState.formData, ...state.formData },
      filters: { ...currentState.filters, ...state.filters },
      customState: { ...currentState.customState, ...state.customState }
    })
  }, [])

  const clearPageState = useCallback((pageKey: string) => {
    pageStates.current.delete(pageKey)
    mountedPages.current.delete(pageKey)
  }, [])

  const clearAllPageStates = useCallback(() => {
    pageStates.current.clear()
    mountedPages.current.clear()
  }, [])

  return (
    <PageStateContext.Provider
      value={{
        getPageState,
        setPageState,
        clearPageState,
        clearAllPageStates,
        mountedPages
      }}
    >
      {children}
    </PageStateContext.Provider>
  )
}

export function withPageState<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pageKey: string
) {
  return function WithPageStateComponent(props: P) {
    const { getPageState, setPageState, mountedPages } = usePageState()
    
    return (
      <WrappedComponent
        {...props}
        pageState={getPageState(pageKey)}
        onPageStateChange={(state: Partial<PageState>) => setPageState(pageKey, state)}
        isMounted={mountedPages.current.has(pageKey)}
      />
    )
  }
}

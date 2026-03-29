import React, { useRef, ReactNode } from 'react'

interface KeepAliveProps {
  children: ReactNode
  pageKey: string
  active: boolean
}

const KeepAliveItem: React.FC<KeepAliveProps> = ({ children, active }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      style={{
        display: active ? 'block' : 'none',
        height: active ? 'auto' : 0,
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  )
}

export default KeepAliveItem

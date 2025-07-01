import React, { ReactNode } from 'react'

interface BaseLayoutProps {
  children: ReactNode
  className?: string
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {children}
    </div>
  )
}
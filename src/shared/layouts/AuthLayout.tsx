import React, { ReactNode } from 'react'
import { BaseLayout } from './BaseLayout'

interface AuthLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title = "RunClub App",
  subtitle = "Member Portal"
}) => {
  return (
    <BaseLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>
        
        {/* Content */}
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </div>
    </BaseLayout>
  )
}
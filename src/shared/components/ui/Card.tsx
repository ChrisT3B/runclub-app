import React, { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  className?: string
  actions?: ReactNode
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  title, 
  className = '',
  actions
}) => {
  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
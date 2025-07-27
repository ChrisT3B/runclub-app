import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AppLogo } from '../../../shared/components/ui/AppLogo'
import type { LoginCredentials } from '../types'

interface LoginFormProps {
  onSuccess?: () => void
  onForgotPassword?: () => void
  onRegister?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  onForgotPassword,
  onRegister
}) => {
  const { state, login } = useAuth()
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
         console.log('🔐 Attempting login...'); // Add this line
      await login(credentials)
      onSuccess?.()
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '0 auto', 
      padding: '40px 20px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      {/* Enhanced Header Section with Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <AppLogo 
            size="large"
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'contain'
            }}
          />
        </div>
        
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: '700', 
          color: 'var(--red-primary)', 
          margin: '0 0 8px 0',
          fontFamily: 'var(--font-family-sans)',
          letterSpacing: '-0.025em'
        }}>
          Run Alcester Bookings
        </h1>
        <p style={{ 
          color: 'var(--gray-600)', 
          fontSize: '16px',
          margin: '0',
          fontWeight: '400'
        }}>
          Welcome back! Sign in to your account
        </p>
      </div>

      {/* Login Form Card */}
      <div className="card" style={{ 
        border: '2px solid var(--red-primary)',
        boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.1), 0 10px 10px -5px rgba(220, 38, 38, 0.04)'
      }}>
        <div className="card-content">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={credentials.email}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your email address"
                style={{ 
                  borderColor: 'var(--gray-300)',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={credentials.password}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your password"
                style={{ 
                  borderColor: 'var(--gray-300)',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
            </div>

            {state.error && (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                color: '#dc2626', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                <strong>⚠️ Error:</strong> {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={state.loading}
              className="btn btn-primary"
              style={{ 
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                background: state.loading ? 'var(--gray-400)' : 'var(--red-primary)',
                borderColor: state.loading ? 'var(--gray-400)' : 'var(--red-primary)',
                cursor: state.loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!state.loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(220, 38, 38, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (!state.loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {state.loading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              )}
              {state.loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '20px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={onForgotPassword}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--red-primary)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#b91c1c'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--red-primary)'}
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={onRegister}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--red-primary)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#b91c1c'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--red-primary)'}
              >
                Create Account →
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '30px',
        color: 'var(--gray-500)',
        fontSize: '12px'
      }}>
        <p style={{ margin: '0 0 4px 0' }}>© 2025 Run Alcester. All rights reserved.</p>
        <p style={{ margin: '0' }}>Questions? Contact us at runalcester@gmail.com</p>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
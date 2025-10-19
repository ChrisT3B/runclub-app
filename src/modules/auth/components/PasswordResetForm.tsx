// src/modules/auth/components/PasswordResetForm.tsx
// STYLED VERSION - Matches app design system

import React, { useState, useEffect } from 'react'
import { supabase } from '../../../services/supabase'

interface PasswordResetFormProps {
  onSuccess?: () => void
  onBack?: () => void
}
console.log('🔄 PasswordResetForm styled'); // Your unique identifier
export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ 
  onSuccess, 
  onBack 
}) => {
  console.log('🔄 PasswordResetForm component loaded 1509'); // Your unique identifier
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false)

  useEffect(() => {
    // Check for any valid session - don't overthink the URL parsing
    const checkSession = async () => {
      try {
        console.log('🔍 Checking for any valid session...');
        
        // Wait a moment for Supabase to process the redirect
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📊 Session check result:', { 
          hasSession: !!session, 
          error: error?.message,
          userEmail: session?.user?.email
        });
        
        if (session && session.user) {
          console.log('✅ Found valid session for password reset');
          setIsValidSession(true);
        } else {
          console.log('❌ No valid session found');
          setError('Invalid or expired reset link. Please request a new password reset.');
          setIsValidSession(false);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setError('Failed to verify reset link. Please try again.');
        setIsValidSession(false);
      } finally {
        setSessionCheckComplete(true);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Attempting password update...')

      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        console.error('❌ Password update failed:', error)
        setError(error.message || 'Failed to update password')
        return
      }

      console.log('✅ Password updated successfully')
      onSuccess?.()

    } catch (error) {
      console.error('❌ Password update failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  // Still checking session
  if (!sessionCheckComplete) {
    return (
      <div style={{ 
        maxWidth: '400px', 
        margin: '0 auto', 
        padding: '40px 20px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          color: 'var(--gray-900)', 
          marginBottom: '24px' 
        }}>
          Verifying Reset Link
        </h2>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '16px' 
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid var(--red-primary)',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
        <p style={{ color: 'var(--gray-600)' }}>
          Please wait while we verify your reset link...
        </p>
      </div>
    )
  }

  // Invalid session
  if (isValidSession === false) {
    return (
      <div style={{ 
        maxWidth: '400px', 
        margin: '0 auto', 
        padding: '40px 20px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          color: 'var(--gray-900)', 
          marginBottom: '24px' 
        }}>
          Reset Link Expired
        </h2>
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          color: '#dc2626', 
          padding: '12px', 
          borderRadius: '8px', 
          marginBottom: '16px' 
        }}>
          {error}
        </div>
        <button
          onClick={onBack}
          className="btn btn-primary"
        >
          Request New Reset Link
        </button>
      </div>
    )
  }

  // Valid session - show password reset form
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
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: 'var(--red-primary)', 
          margin: '0 0 8px 0',
          fontFamily: 'var(--font-family-sans)'
        }}>
          Set New Password
        </h1>
        <p style={{ 
          color: 'var(--gray-600)', 
          fontSize: '16px',
          margin: '0'
        }}>
          Choose a strong password for your account
        </p>
      </div>

      {/* Form Card */}
      <div className="card" style={{ 
        border: '2px solid var(--red-primary)',
        boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.1)'
      }}>
        <div className="card-content">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                New Password
              </label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your new password"
                style={{ 
                  borderColor: 'var(--gray-300)',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
              <p style={{ 
                marginTop: '4px', 
                fontSize: '12px', 
                color: 'var(--gray-500)' 
              }}>
                Must be 8+ characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Confirm your new password"
                style={{ 
                  borderColor: 'var(--gray-300)',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
            </div>

            {error && (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                color: '#dc2626', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Help Section */}
      <div style={{ 
        textAlign: 'center',
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid var(--gray-200)'
      }}>
        <p style={{ 
          color: 'var(--gray-500)', 
          fontSize: '12px',
          margin: '0 0 8px 0'
        }}>
          Having trouble?
        </p>
        <a 
          href="mailto:support@runalcester.co.uk" 
          style={{
            color: 'var(--red-primary)',
            fontSize: '12px',
            textDecoration: 'none'
          }}
        >
          Contact support for help
        </a>
      </div>
    </div>
  )
}
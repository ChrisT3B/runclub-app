// src/modules/auth/components/PasswordResetForm.tsx
// CLEAN VERSION - TypeScript warnings fixed

import React, { useState, useEffect } from 'react'
import { supabase } from '../../../services/supabase'

interface PasswordResetFormProps {
  onSuccess?: () => void
  onBack?: () => void
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ 
  onSuccess, 
  onBack 
}) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValidSession, setIsValidSession] = useState(false)

  useEffect(() => {
    // Check for recovery session
    const checkSession = async () => {
      try {
        // First, clear any potentially cached session that might interfere
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data.user) {
          // Only sign out if it's not a recovery session
          const urlParams = new URLSearchParams(window.location.search);
          const type = urlParams.get('type');
          const accessToken = urlParams.get('access_token');
          
          if (type !== 'recovery' || !accessToken) {
            await supabase.auth.signOut();
          }
        }
        
        // Check for recovery parameters in URL
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        
        console.log('Password reset params:', { type, hasAccessToken: !!accessToken });
        
        if (type === 'recovery' && accessToken && refreshToken) {
          // Set the session using the tokens from URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Recovery session error:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setIsValidSession(false);
          } else {
            console.log('Valid recovery session established');
            setIsValidSession(true);
          }
        } else {
          // Fallback: Check if we have a valid password reset session
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setIsValidSession(true)
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.')
            setIsValidSession(false);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        setError('Failed to verify reset link. Please try again.');
        setIsValidSession(false);
      }
    }
    
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /\W/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setError('Password must contain uppercase, lowercase, number, and special character')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      // Sign out after password update to force fresh login
      await supabase.auth.signOut()
      onSuccess?.()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  if (!isValidSession && error) {
    return (
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6">Reset Link Expired</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={onBack}
          className="text-primary-600 hover:text-primary-500"
        >
          Request New Reset Link
        </button>
      </div>
    )
  }

  // Show loading state while checking session
  if (!isValidSession && !error) {
    return (
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6">Verifying Reset Link</h2>
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
        <p className="text-gray-600">Please wait while we verify your reset link...</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">Set New Password</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            type="password"
            id="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter your new password"
          />
          <p className="mt-1 text-xs text-gray-500">
            Must be 8+ characters with uppercase, lowercase, number, and special character
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Confirm your new password"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
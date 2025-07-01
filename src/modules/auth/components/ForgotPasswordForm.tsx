import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface ForgotPasswordFormProps {
  onBack?: () => void
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const { state, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await resetPassword(email)
      setIsSubmitted(true)
    } catch (error) {
      console.error('Password reset error:', error)
    }
  }

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6">Check Your Email</h2>
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          We've sent a password reset link to {email}
        </div>
        <p className="text-gray-600 mb-4">
          Check your email and follow the instructions to reset your password.
        </p>
        <button
          onClick={onBack}
          className="text-primary-600 hover:text-primary-500"
        >
          Back to login
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter your email address"
          />
        </div>

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={state.loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            Back to login
          </button>
        </div>
      </form>
    </div>
  )
}
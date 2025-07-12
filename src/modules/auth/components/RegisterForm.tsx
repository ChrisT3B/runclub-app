import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { RegistrationData } from '../types/index'

interface RegisterFormProps {
  onSuccess?: () => void
  onLogin?: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onSuccess, 
  onLogin 
}) => {
  const { state, register } = useAuth()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    healthConditions: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await register(formData)
      // If we get here, registration was successful (shouldn't happen with email verification)
      setRegisteredEmail(formData.email)
      setShowSuccessMessage(true)
    } catch (error: any) {
      console.error('Registration error:', error)
      
      // Check if the error is about email verification (this is actually success!)
      if (error.message && error.message.includes('check your email')) {
        setRegisteredEmail(formData.email)
        setShowSuccessMessage(true)
      }
      // For other errors, form will stay visible and show the error
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  // Show success message instead of form
  if (showSuccessMessage) {
    return (
      <div style={{ 
        maxWidth: '500px', 
        margin: '0 auto', 
        padding: '40px 20px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        {/* Success Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            background: '#dcfce7',
            color: '#16a34a',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '40px',
            border: '3px solid #16a34a'
          }}>
            ✅
          </div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: 'var(--red-primary)', 
            margin: '0 0 16px 0' 
          }}>
            Registration Successful!
          </h1>
        </div>

        {/* Success Message Card */}
        <div className="card" style={{ border: '2px solid #16a34a', marginBottom: '30px' }}>
          <div className="card-content">
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#16a34a', 
              marginBottom: '16px' 
            }}>
              📧 Please Check Your Email
            </h2>
            <p style={{ 
              color: 'var(--gray-700)', 
              lineHeight: '1.6',
              marginBottom: '16px' 
            }}>
              Thank you for registering with RunClub! We've sent a verification email to:
            </p>
            <div style={{
              background: 'var(--gray-50)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--gray-200)',
              fontWeight: '600',
              color: 'var(--red-primary)',
              marginBottom: '16px'
            }}>
              {registeredEmail}
            </div>
            <p style={{ 
              color: 'var(--gray-600)', 
              fontSize: '14px',
              lineHeight: '1.5' 
            }}>
              Please click the verification link in your email to activate your account. 
              Once verified, you'll be able to sign in and start your running journey with us!
            </p>
            
            <div style={{
              background: 'var(--red-light)',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '20px',
              fontSize: '14px',
              color: 'var(--red-primary)'
            }}>
              💡 <strong>Tip:</strong> Check your spam folder if you don't see the email within a few minutes.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onLogin}
            className="btn btn-primary"
            style={{ padding: '12px 24px' }}
          >
            ← Back to Sign In
          </button>
          <button
            onClick={() => {
              setShowSuccessMessage(false)
              setFormData({
                email: '',
                password: '',
                fullName: '',
                phone: '',
                emergencyContactName: '',
                emergencyContactPhone: '',
                healthConditions: '',
              })
            }}
            className="btn btn-secondary"
            style={{ padding: '12px 24px' }}
          >
            Register Another Account
          </button>
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '40px',
          color: 'var(--gray-500)',
          fontSize: '12px'
        }}>
          <p>Need help? Contact us at runalcester@gmail.com</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '0 auto', 
      padding: '40px 20px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          background: 'var(--red-primary)',
          color: 'white',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '32px',
          fontWeight: 'bold'
        }}>
          🏃‍♂️
        </div>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: 'var(--red-primary)', 
          margin: '0 0 8px 0' 
        }}>
          Join RunClub
        </h1>
        <p style={{ 
          color: 'var(--gray-600)', 
          fontSize: '16px',
          margin: '0' 
        }}>
          Start your running journey with us today
        </p>
      </div>

      {/* Registration Form Card */}
      <div className="card" style={{ border: '2px solid var(--red-primary)' }}>
        <div className="card-content">
          <form onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'var(--red-primary)', 
                marginBottom: '16px',
                borderBottom: '2px solid var(--red-light)',
                paddingBottom: '8px'
              }}>
                📝 Personal Information
              </h3>
              
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your full name"
                  style={{ 
                    borderColor: 'var(--gray-300)',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="your.email@example.com"
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
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Create a secure password"
                  style={{ 
                    borderColor: 'var(--gray-300)',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                />
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--gray-500)', 
                  marginTop: '4px',
                  background: 'var(--gray-50)',
                  padding: '6px 8px',
                  borderRadius: '4px'
                }}>
                  💡 Must include: 8+ characters, uppercase, lowercase, number & special character
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="07123 456789"
                  style={{ 
                    borderColor: 'var(--gray-300)',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                />
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'var(--red-primary)', 
                marginBottom: '16px',
                borderBottom: '2px solid var(--red-light)',
                paddingBottom: '8px'
              }}>
                🚨 Emergency Contact *
              </h3>
              
              <div style={{ 
                background: 'var(--gray-50)', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid var(--gray-200)'
              }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" htmlFor="emergencyContactName">
                    Emergency Contact Name *
                  </label>
                  <input
                    type="text"
                    id="emergencyContactName"
                    name="emergencyContactName"
                    required
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Full name of emergency contact"
                    style={{ 
                      borderColor: 'var(--gray-300)',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label" htmlFor="emergencyContactPhone">
                    Emergency Contact Phone *
                  </label>
                  <input
                    type="tel"
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    required
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="07123 456789"
                    style={{ 
                      borderColor: 'var(--gray-300)',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'var(--red-primary)', 
                marginBottom: '16px',
                borderBottom: '2px solid var(--red-light)',
                paddingBottom: '8px'
              }}>
                🏥 Medical Information (Optional)
              </h3>
              
              <div className="form-group">
                <label className="form-label" htmlFor="healthConditions">
                  Medical Conditions / Allergies
                </label>
                <textarea
                  id="healthConditions"
                  name="healthConditions"
                  value={formData.healthConditions}
                  onChange={handleInputChange}
                  className="form-input"
                  rows={3}
                  placeholder="Any medical conditions, allergies, or medications we should know about..."
                  style={{ 
                    borderColor: 'var(--gray-300)',
                    transition: 'all 0.15s ease',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--red-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                />
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--gray-500)', 
                  marginTop: '4px',
                  background: 'var(--gray-50)',
                  padding: '6px 8px',
                  borderRadius: '4px'
                }}>
                  🔒 This information is kept confidential and only used for safety purposes
                </div>
              </div>
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
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                background: state.loading ? 'var(--gray-400)' : 'var(--red-primary)',
                borderColor: state.loading ? 'var(--gray-400)' : 'var(--red-primary)',
                cursor: state.loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
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
              {state.loading ? 'Creating Account...' : '🏃‍♂️ Join RunClub'}
            </button>

            <div style={{ 
              textAlign: 'center',
              marginTop: '20px'
            }}>
              <button
                type="button"
                onClick={onLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--red-primary)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ← Already have an account? Sign in
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
        <p>© 2025 RunClub. All rights reserved.</p>
        <p>Questions? Contact us at runalcester@gmail.com</p>
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
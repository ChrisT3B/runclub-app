import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { RegistrationData } from '../types/index'
import { InputSanitizer } from '../../../utils/inputSanitizer'

export const C25kRegisterForm: React.FC = () => {
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
    isC25kParticipant: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanFormData = InputSanitizer.sanitizeFormData(formData)
    // Ensure the C25k flag survives sanitization
    cleanFormData.isC25kParticipant = true
    try {
      await register(cleanFormData)
      setRegisteredEmail(formData.email)
      setShowSuccessMessage(true)
    } catch (error: any) {
      console.error('Registration error:', error)
      if (error.message && error.message.includes('check your email')) {
        setRegisteredEmail(formData.email)
        setShowSuccessMessage(true)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

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
            color: '#1e40af',
            margin: '0 0 16px 0'
          }}>
            Registration Successful!
          </h1>
        </div>

        <div className="card" style={{ border: '2px solid #16a34a', marginBottom: '30px' }}>
          <div className="card-content">
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#16a34a',
              marginBottom: '16px'
            }}>
              Please Check Your Email
            </h2>
            <p style={{
              color: 'var(--gray-700)',
              lineHeight: '1.6',
              marginBottom: '16px'
            }}>
              Thank you for signing up for Couch to 5K with Run Alcester! We've sent a verification email to:
            </p>
            <div style={{
              background: 'var(--gray-50)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--gray-200)',
              fontWeight: '600',
              color: '#1e40af',
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
              Once verified, you'll be able to sign in and see your C25K runs!
            </p>

            <div style={{
              background: '#dbeafe',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '20px',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              Check your spam folder if you don't see the email within a few minutes.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/"
            className="btn btn-primary"
            style={{ padding: '12px 24px', textDecoration: 'none' }}
          >
            Go to Sign In
          </a>
        </div>

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
      {/* C25k Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          background: '#1e40af',
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
          🏃
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1e40af',
          margin: '0 0 8px 0'
        }}>
          Couch to 5K
        </h1>
        <p style={{
          color: 'var(--gray-600)',
          fontSize: '16px',
          margin: '0 0 4px 0'
        }}>
          with Run Alcester
        </p>
        <p style={{
          color: 'var(--gray-500)',
          fontSize: '14px',
          margin: '0'
        }}>
          Register to join our Couch to 5K programme
        </p>
      </div>

      {/* C25k Info Banner */}
      <div style={{
        background: '#dbeafe',
        border: '2px solid #93c5fd',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <p style={{
          color: '#1e40af',
          fontWeight: '600',
          margin: '0 0 8px 0',
          fontSize: '16px'
        }}>
          Welcome to Couch to 5K!
        </p>
        <p style={{
          color: '#1e3a8a',
          margin: '0',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          Create your account below to get started. Once registered, you'll be able to see and book onto C25K runs.
        </p>
      </div>

      {/* Registration Form Card */}
      <div className="card" style={{ border: '2px solid #1e40af' }}>
        <div className="card-content">
          <form onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e40af',
                marginBottom: '16px',
                borderBottom: '2px solid #dbeafe',
                paddingBottom: '8px'
              }}>
                Personal Information
              </h3>

              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="your.email@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                />
                <div style={{
                  fontSize: '12px',
                  color: 'var(--gray-500)',
                  marginTop: '4px',
                  background: 'var(--gray-50)',
                  padding: '6px 8px',
                  borderRadius: '4px'
                }}>
                  Must include: 8+ characters, uppercase, lowercase, number &amp; special character
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="07123 456789"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e40af',
                marginBottom: '16px',
                borderBottom: '2px solid #dbeafe',
                paddingBottom: '8px'
              }}>
                Emergency Contact *
              </h3>

              <div style={{
                background: 'var(--gray-50)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--gray-200)'
              }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" htmlFor="emergencyContactName">Emergency Contact Name *</label>
                  <input
                    type="text"
                    id="emergencyContactName"
                    name="emergencyContactName"
                    required
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Full name of emergency contact"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label" htmlFor="emergencyContactPhone">Emergency Contact Phone *</label>
                  <input
                    type="tel"
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    required
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="07123 456789"
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e40af',
                marginBottom: '16px',
                borderBottom: '2px solid #dbeafe',
                paddingBottom: '8px'
              }}>
                Medical Information (Optional)
              </h3>

              <div className="form-group">
                <label className="form-label" htmlFor="healthConditions">Medical Conditions / Allergies</label>
                <textarea
                  id="healthConditions"
                  name="healthConditions"
                  value={formData.healthConditions}
                  onChange={handleInputChange}
                  className="form-input"
                  rows={3}
                  placeholder="Any medical conditions, allergies, or medications we should know about..."
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
                <div style={{
                  fontSize: '12px',
                  color: 'var(--gray-500)',
                  marginTop: '4px',
                  background: 'var(--gray-50)',
                  padding: '6px 8px',
                  borderRadius: '4px'
                }}>
                  This information is kept confidential and only used for safety purposes
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
                <strong>Error:</strong> {state.error}
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
                background: state.loading ? 'var(--gray-400)' : '#1e40af',
                borderColor: state.loading ? 'var(--gray-400)' : '#1e40af',
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
              {state.loading ? 'Creating Account...' : 'Join Couch to 5K'}
            </button>

            <div style={{
              textAlign: 'center',
              marginTop: '20px'
            }}>
              <a
                href="/"
                style={{
                  color: '#1e40af',
                  textDecoration: 'underline',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Already have an account? Sign in
              </a>
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
        <p>&copy; 2025 Run Alcester. All rights reserved.</p>
        <p>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1e40af', textDecoration: 'underline' }}
          >
            Digital Privacy Policy
          </a>
        </p>
        <p>Questions? Contact us at runalcester@gmail.com</p>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

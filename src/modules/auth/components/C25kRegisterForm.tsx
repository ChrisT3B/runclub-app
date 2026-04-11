import React, { useState } from 'react'
import { C25kRegistrationForm } from './C25kRegistrationForm'
import { C25kRegistrationService } from '../../../services/c25kRegistrationService'
import { C25kRegistrationFormData } from '../../../types/c25k'

/**
 * Public C25k registration page (mounted at /c25k)
 * Wraps the C25kRegistrationForm with auth signup logic
 */
export const C25kRegisterForm: React.FC = () => {
  const [showSuccess, setShowSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const handleSubmit = async (formData: C25kRegistrationFormData) => {
    const result = await C25kRegistrationService.registerNewC25kParticipant(formData)
    if (result.success) {
      setRegisteredEmail(formData.email)
      setShowSuccess(true)
    } else {
      throw new Error(result.error || 'Registration failed')
    }
  }

  if (showSuccess) {
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
            ✓
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
              background: '#fef3c7',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '20px',
              fontSize: '14px',
              color: '#92400e'
            }}>
              <strong>Next steps:</strong> Your registration is now pending payment confirmation.
              If you selected bank transfer, please ensure you've sent the £30 to the account details shown on the form.
              An admin will confirm your payment and you'll be all set!
            </div>

            <div style={{
              background: '#dbeafe',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '12px',
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

  return <C25kRegistrationForm onSubmit={handleSubmit} />
}

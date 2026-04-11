import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { C25kRegistrationForm } from './C25kRegistrationForm'
import { C25kRegistrationService } from '../../../services/c25kRegistrationService'
import { C25kRegistrationFormData } from '../../../types/c25k'

/**
 * C25k registration page (mounted at /c25k)
 * Detects if user is already logged in:
 *   - Logged in: pre-fills data, skips password, uses registerExistingMember
 *   - Not logged in: full form with password, uses registerNewC25kParticipant
 */
export const C25kRegisterForm: React.FC = () => {
  const { state } = useAuth()
  const [showSuccess, setShowSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [checking, setChecking] = useState(true)

  const isLoggedIn = state.isAuthenticated && !!state.member
  const member = state.member

  // Check if existing member is already registered
  useEffect(() => {
    const check = async () => {
      if (isLoggedIn && member?.id) {
        const registered = await C25kRegistrationService.isAlreadyRegistered(member.id)
        setAlreadyRegistered(registered)
      }
      setChecking(false)
    }
    // Wait for auth to initialise before checking
    if (state.isInitialized) {
      check()
    }
  }, [isLoggedIn, member?.id, state.isInitialized])

  const [isDetectedExisting, setIsDetectedExisting] = useState(false)

  const handleSubmit = async (formData: C25kRegistrationFormData, detectedMemberId?: string) => {
    if (isLoggedIn && member?.id) {
      // Logged-in existing member
      const result = await C25kRegistrationService.registerExistingMember(member.id, formData)
      if (result.success) {
        setRegisteredEmail(formData.email)
        setIsDetectedExisting(true)
        setShowSuccess(true)
      } else {
        throw new Error(result.error || 'Registration failed')
      }
    } else if (detectedMemberId) {
      // Detected existing member via email lookup (not logged in)
      const result = await C25kRegistrationService.registerExistingMember(detectedMemberId, formData)
      if (result.success) {
        setRegisteredEmail(formData.email)
        setIsDetectedExisting(true)
        setShowSuccess(true)
      } else {
        throw new Error(result.error || 'Registration failed')
      }
    } else {
      // New member — create auth account
      const result = await C25kRegistrationService.registerNewC25kParticipant(formData)
      if (result.success) {
        setRegisteredEmail(formData.email)
        setIsDetectedExisting(false)
        setShowSuccess(true)
      } else {
        throw new Error(result.error || 'Registration failed')
      }
    }
  }

  // Still loading auth state
  if (!state.isInitialized || checking) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-600)' }}>
        Loading...
      </div>
    )
  }

  // Already registered
  if (alreadyRegistered) {
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
        <div style={{
          background: 'var(--info-color, #3b82f6)',
          color: 'white',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '32px'
        }}>
          ✓
        </div>
        <h2 style={{ color: 'var(--info-color, #1e40af)', marginBottom: '16px' }}>Already Registered</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '24px', lineHeight: '1.6' }}>
          You're already registered for the C25k 2026 programme!
          Your registration is being processed by the admin team.
        </p>
        <a href="/" className="action-btn action-btn--primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Back to App
        </a>
      </div>
    )
  }

  // Success state
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
            color: 'var(--success-color)',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '40px',
            border: '3px solid var(--success-color)'
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

        <div className="card" style={{ border: '2px solid var(--success-color)', marginBottom: '30px' }}>
          <div className="card-content">
            {(isLoggedIn || isDetectedExisting) ? (
              <>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--success-color)', marginBottom: '16px' }}>
                  C25k Registration Complete
                </h2>
                <p style={{ color: 'var(--gray-700)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Thank you for registering for Couch to 5K 2026 with Run Alcester!
                </p>
                <div className="member-list-alert member-list-alert--info" style={{ textAlign: 'left' }}>
                  <strong>What happens next?</strong><br />
                  An admin will review your registration and confirm your payment.
                  Log in to the app to see further information about C25K.
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--success-color)', marginBottom: '16px' }}>
                  Please Check Your Email
                </h2>
                <p style={{ color: 'var(--gray-700)', lineHeight: '1.6', marginBottom: '16px' }}>
                  Thank you for signing up for Couch to 5K with Run Alcester! We've sent a verification email to:
                </p>
                <div style={{
                  background: 'var(--gray-50)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--gray-200)',
                  fontWeight: '600',
                  color: '#1e40af',
                  marginBottom: '16px'
                }}>
                  {registeredEmail}
                </div>
                <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-sm)', lineHeight: '1.5' }}>
                  Please click the verification link in your email to activate your account.
                  Once verified, you'll be able to sign in and see your C25K runs!
                </p>
                <div className="urgent-alert" style={{ marginTop: '20px', textAlign: 'left' }}>
                  <div className="urgent-alert__content">
                    <div className="urgent-alert__title">Next steps</div>
                    <div className="urgent-alert__message">
                      Your registration is now pending payment confirmation.
                      Please ensure you've sent the £30 to the account details shown on the form.
                    </div>
                  </div>
                </div>
                <div className="member-list-alert member-list-alert--info" style={{ marginTop: '12px', textAlign: 'left' }}>
                  Check your spam folder if you don't see the email within a few minutes.
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/" className="action-btn action-btn--primary" style={{ textDecoration: 'none' }}>
            {(isLoggedIn || isDetectedExisting) ? 'Sign In' : 'Go to Sign In'}
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--gray-500)', fontSize: 'var(--font-xs)' }}>
          <p>Need help? Contact us at runalcester@gmail.com</p>
        </div>
      </div>
    )
  }

  // Registration form — adapts based on logged-in state
  return (
    <C25kRegistrationForm
      onSubmit={handleSubmit}
      isExistingMember={isLoggedIn}
      existingMemberData={isLoggedIn && member ? {
        full_name: member.full_name,
        email: member.email,
        phone: member.phone,
        emergency_contact_name: member.emergency_contact_name,
        emergency_contact_phone: member.emergency_contact_phone,
        ea_urn: member.ea_urn
      } : undefined}
    />
  )
}

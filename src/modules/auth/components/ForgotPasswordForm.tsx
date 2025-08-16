// Updated ForgotPasswordForm.tsx to match LoginForm styling
// File: src/modules/auth/components/ForgotPasswordForm.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppLogo } from '../../../shared/components/ui/AppLogo';

interface ForgotPasswordFormProps {
  onBack?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailValid, setEmailValid] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Email validation
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(emailRegex.test(email));
  }, [email]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailValid || cooldown > 0) return;

    setIsLoading(true);
    setError('');
    
    try {
      const result = await resetPassword(email);
      
      if (result.error) {
        setError(result.error.message);
      } else {
        setIsSubmitted(true);
        setCooldown(60); // 60-second cooldown
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await resetPassword(email);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend email.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
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
        {/* Success Header with Logo */}
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
                width: '80px',
                height: '80px',
                objectFit: 'contain'
              }}
            />
          </div>
          
          <div style={{
            width: '64px',
            height: '64px',
            background: '#dcfce7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <div style={{ fontSize: '24px' }}>✓</div>
          </div>
          
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: 'var(--gray-900)', 
            margin: '0 0 8px 0',
            fontFamily: 'var(--font-family-sans)'
          }}>
            Check Your Email
          </h2>
          <p style={{ 
            color: 'var(--gray-600)', 
            fontSize: '16px',
            margin: '0 0 4px 0'
          }}>
            We've sent a password reset link to
          </p>
          <p style={{ 
            color: 'var(--gray-900)', 
            fontSize: '16px',
            fontWeight: '600',
            margin: '0'
          }}>
            {email}
          </p>
        </div>

        {/* Instructions Card */}
        <div className="card" style={{ 
          border: '1px solid #dbeafe',
          background: '#eff6ff',
          marginBottom: '30px'
        }}>
          <div className="card-content" style={{ padding: '20px' }}>
            <h3 style={{ 
              fontWeight: '600', 
              color: '#1e40af', 
              margin: '0 0 12px 0',
              fontSize: '16px'
            }}>
              What's next?
            </h3>
            <ol style={{ 
              color: '#1e40af', 
              fontSize: '14px',
              margin: '0',
              paddingLeft: '20px',
              lineHeight: '1.6'
            }}>
              <li style={{ marginBottom: '4px' }}>Check your email inbox (and spam folder)</li>
              <li style={{ marginBottom: '4px' }}>Click the reset link in the email</li>
              <li style={{ marginBottom: '4px' }}>Create your new password</li>
              <li>Sign in with your new password</li>
            </ol>
          </div>
        </div>

        {/* Resend Section */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <p style={{ 
            color: 'var(--gray-600)', 
            fontSize: '14px',
            margin: '0 0 12px 0'
          }}>
            Didn't receive the email?
          </p>
          
          {cooldown > 0 ? (
            <p style={{ 
              color: 'var(--gray-500)', 
              fontSize: '14px',
              margin: '0'
            }}>
              Resend available in {cooldown}s
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={isLoading}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--red-primary)',
                textDecoration: 'underline',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: isLoading ? 0.5 : 1,
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.color = '#b91c1c')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.color = 'var(--red-primary)')}
            >
              {isLoading ? 'Sending...' : 'Resend reset email'}
            </button>
          )}
          
          {error && (
            <div style={{ 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              color: '#dc2626', 
              padding: '12px', 
              borderRadius: '8px', 
              marginTop: '12px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-500)',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gray-700)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray-500)'}
          >
            Back to login
          </button>
        </div>

        {/* Help Section */}
        <div style={{ 
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px solid var(--gray-200)'
        }}>
          <p style={{ 
            color: 'var(--gray-500)', 
            fontSize: '12px',
            margin: '0 0 8px 0'
          }}>
            Still having trouble?
          </p>
          <a 
            href="mailto:support@runalcester.co.uk" 
            style={{
              color: 'var(--red-primary)',
              fontSize: '12px',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Contact support for help
          </a>
        </div>
      </div>
    );
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
      {/* Header Section with Logo */}
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
          Reset Your Password
        </h1>
        <p style={{ 
          color: 'var(--gray-600)', 
          fontSize: '16px',
          margin: '0',
          fontWeight: '400'
        }}>
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      {/* Form Card */}
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
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="Enter your email address"
                  style={{ 
                    borderColor: email && emailValid ? '#10b981' : email ? '#ef4444' : 'var(--gray-300)',
                    paddingRight: email ? '40px' : '12px',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = email && emailValid ? '#10b981' : email ? '#ef4444' : 'var(--red-primary)'}
                  onBlur={(e) => e.target.style.borderColor = email && emailValid ? '#10b981' : email ? '#ef4444' : 'var(--gray-300)'}
                />
                {/* Email validation icon */}
                {email && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {emailValid ? (
                      <div style={{ color: '#10b981', fontSize: '16px' }}>✓</div>
                    ) : (
                      <div style={{ color: '#ef4444', fontSize: '16px' }}>✗</div>
                    )}
                  </div>
                )}
              </div>
              {email && !emailValid && (
                <p style={{ 
                  color: '#ef4444', 
                  fontSize: '12px',
                  margin: '4px 0 0 0'
                }}>
                  Please enter a valid email address
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                color: '#dc2626', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <div style={{ marginTop: '1px', fontSize: '16px' }}>⚠️</div>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!emailValid || isLoading || cooldown > 0}
              className="btn btn-primary"
              style={{ 
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                background: (!emailValid || isLoading || cooldown > 0) ? 'var(--gray-400)' : 'var(--red-primary)',
                borderColor: (!emailValid || isLoading || cooldown > 0) ? 'var(--gray-400)' : 'var(--red-primary)',
                cursor: (!emailValid || isLoading || cooldown > 0) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (emailValid && !isLoading && cooldown === 0) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(220, 38, 38, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (emailValid && !isLoading && cooldown === 0) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isLoading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              )}
              {isLoading ? 'Sending Reset Link...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send Reset Link'}
            </button>

            {/* Back to Login */}
            <div style={{ 
              textAlign: 'center',
              marginTop: '20px'
            }}>
              <button
                type="button"
                onClick={onBack}
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
                ← Back to login
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
  );
};
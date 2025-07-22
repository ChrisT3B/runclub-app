// src/modules/auth/components/EmailVerificationHandler.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorModal } from '../../../shared/components/ui/ErrorModal';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  token?: string;
  type?: string;
}

export const EmailVerificationHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, verifyEmailMutation } = useAuth();
  const hasRunRef = useRef(false); // Prevent double execution
  
  const [status, setStatus] = useState<'validating' | 'verifying' | 'success' | 'error'>('validating');
  const [message, setMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [validationDetails, setValidationDetails] = useState<string>('');

  // Validate the verification URL and token
  const validateVerificationRequest = (): ValidationResult => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const currentUrl = window.location.href;

    // Log for debugging
    console.log('🔍 Email verification validation:', {
      currentUrl,
      token: token ? `${token.substring(0, 10)}...` : 'missing',
      type,
      searchParams: Object.fromEntries(searchParams.entries())
    });

    // Check if this is actually a verification request
    if (!token && !type) {
      return {
        isValid: false,
        error: 'This page is for email verification only. Redirecting to login...'
      };
    }

    // Validate token exists and format
    if (!token) {
      return {
        isValid: false,
        error: 'Verification token is missing from the URL.'
      };
    }

    // Validate token format (should be a long hex string)
    if (!/^[a-f0-9]{40,}$/i.test(token)) {
      return {
        isValid: false,
        error: 'Invalid verification token format. The token appears to be corrupted.'
      };
    }

    // Validate type parameter
    if (!type) {
      return {
        isValid: false,
        error: 'Verification type is missing from the URL.'
      };
    }

    if (type !== 'signup') {
      return {
        isValid: false,
        error: `Invalid verification type: "${type}". Expected "signup".`
      };
    }

    // Check if token looks expired (basic check)
    if (token.length < 40) {
      return {
        isValid: false,
        error: 'Verification token appears to be incomplete or corrupted.'
      };
    }

    return {
      isValid: true,
      token,
      type
    };
  };

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasRunRef.current) {
      console.log('🔍 EmailVerificationHandler already ran, skipping...');
      return;
    }
    hasRunRef.current = true;
    console.log('🔍 EmailVerificationHandler running for first time');

    const handleVerification = async () => {
      // Step 1: Validate the request
      const validation = validateVerificationRequest();
      
      if (!validation.isValid) {
        setStatus('error');
        setMessage(validation.error || 'Invalid verification request');
        setValidationDetails(`URL: ${window.location.href}`);
        setShowErrorModal(true);
        
        // Auto-redirect after 5 seconds for non-verification URLs
        if (!searchParams.get('token') && !searchParams.get('type')) {
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 3000);
        }
        return;
      }

      // Step 2: Proceed with verification
      setStatus('verifying');
      setMessage('Verifying your email address...');

      try {
        console.log('🔍 Attempting email verification with validated token');
        
        const result = await verifyEmail(validation.token!);
        
        if (result.success) {
          console.log('✅ Email verification successful');
          setStatus('success');
          setMessage('Email verified successfully! Your account is now active.');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/', { 
              replace: true,
              state: { message: 'Email verified! You can now sign in.' }
            });
          }, 3000);
        } else {
          console.error('❌ Email verification failed:', result.message);
          setStatus('error');
          setMessage(result.message);
          setValidationDetails('The verification token may have expired or already been used.');
          setShowErrorModal(true);
        }
      } catch (error) {
        console.error('💥 Unexpected verification error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during verification.');
        setValidationDetails('Please try registering again or contact support.');
        setShowErrorModal(true);
      }
    };

    handleVerification();
  }, []); // Empty dependency array - run only once

  // Loading state during validation
  if (status === 'validating') {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h2 style={{ color: 'var(--red-primary)', marginBottom: '16px' }}>
              Validating Request
            </h2>
            <p style={{ color: 'var(--gray-600)' }}>
              Checking verification details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state during verification
  if (status === 'verifying') {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <h2 style={{ color: 'var(--red-primary)', marginBottom: '16px' }}>
              Verifying Your Email
            </h2>
            <p style={{ color: 'var(--gray-600)' }}>
              Please wait while we confirm your account...
            </p>
            {verifyEmailMutation.isPending && (
              <div style={{ marginTop: '16px' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: 'var(--green-600, #059669)', marginBottom: '16px' }}>
              Email Verified!
            </h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
              {message}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginBottom: '24px' }}>
              Redirecting you to login in 3 seconds...
            </p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="btn btn-primary"
              style={{ padding: '12px 24px' }}
            >
              Sign In Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state (fallback)
  return (
    <>
      <div className="auth-layout">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ color: 'var(--red-primary)', marginBottom: '16px' }}>
              Verification Failed
            </h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
              We couldn't verify your email address.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="btn btn-primary"
                style={{ padding: '12px 24px' }}
              >
                Back to Login
              </button>
              <button
                onClick={() => setShowErrorModal(true)}
                className="btn btn-secondary"
                style={{ padding: '12px 24px' }}
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>

      <ErrorModal
        isOpen={showErrorModal}
        title="Email Verification Failed"
        message={`${message}${validationDetails ? `\n\nDetails: ${validationDetails}` : ''}`}
        onClose={() => {
          setShowErrorModal(false);
          navigate('/', { replace: true });
        }}
      />
    </>
  );
};
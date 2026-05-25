import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BookingService } from '../../admin/services/bookingService';

interface DogBookingModalProps {
  isOpen: boolean;
  memberId: string;
  dogPolicyAlreadyAccepted: boolean;
  onConfirmWithoutDog: () => void;
  onConfirmWithDog: () => void;
  onCancel: () => void;
}

type ModalStep = 'ask_dog' | 'policy_acceptance';

export const DogBookingModal: React.FC<DogBookingModalProps> = ({
  isOpen,
  memberId,
  dogPolicyAlreadyAccepted,
  onConfirmWithoutDog,
  onConfirmWithDog,
  onCancel
}) => {
  const [step, setStep] = useState<ModalStep>('ask_dog');
  const [policyChecked1, setPolicyChecked1] = useState(false);
  const [policyChecked2, setPolicyChecked2] = useState(false);
  const [policyChecked3, setPolicyChecked3] = useState(false);
  const [policyUrl, setPolicyUrl] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('ask_dog');
      setPolicyChecked1(false);
      setPolicyChecked2(false);
      setPolicyChecked3(false);
      setError('');
      setAccepting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    BookingService.getDogPolicyUrl().then(url => {
      setPolicyUrl(url);
    });
  }, []);

  const handleBringingDog = () => {
    if (dogPolicyAlreadyAccepted) {
      onConfirmWithDog();
    } else {
      setStep('policy_acceptance');
    }
  };

  const allDeclarationsChecked = policyChecked1 && policyChecked2 && policyChecked3;

  const handleAcceptAndBook = async () => {
    if (!allDeclarationsChecked) return;

    try {
      setAccepting(true);
      setError('');
      await BookingService.acceptDogPolicy(memberId);
      onConfirmWithDog();
    } catch (err) {
      setError('Failed to record policy acceptance. Please try again.');
      setAccepting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={!accepting ? onCancel : undefined}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            paddingTop: '32px',
            maxWidth: '500px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            animation: 'dogModalSlideIn 0.3s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top-right close (acts as Cancel) */}
          <button
            type="button"
            onClick={onCancel}
            disabled={accepting}
            aria-label="Cancel"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--gray-500)',
              cursor: accepting ? 'not-allowed' : 'pointer',
              opacity: accepting ? 0.5 : 1
            }}
          >
            <X size={20} />
          </button>

          {step === 'ask_dog' && (
            <>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  🐕
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--gray-900)',
                  fontFamily: 'var(--font-heading)'
                }}>
                  Dog-Friendly Run
                </h3>
              </div>

              {/* Body */}
              <div style={{
                marginBottom: '24px',
                color: 'var(--gray-700)',
                lineHeight: '1.5',
                fontFamily: 'var(--font-body)'
              }}>
                This run is designated as dog-friendly. Are you planning to bring a dog?
              </div>

              {/* Actions: left = less likely (outlined), right = primary (red) */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'nowrap'
              }}>
                <button
                  type="button"
                  onClick={handleBringingDog}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: 'var(--info-color)',
                    color: 'white',
                    border: '1px solid var(--info-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    lineHeight: '1.2'
                  }}
                >
                  Yes, I'm bringing a dog
                </button>
                <button
                  type="button"
                  onClick={onConfirmWithoutDog}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: 'var(--red-primary)',
                    color: 'white',
                    border: '1px solid var(--red-primary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    lineHeight: '1.2'
                  }}
                >
                  No, just me
                </button>
              </div>
            </>
          )}

          {step === 'policy_acceptance' && (
            <>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  📋
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--gray-900)',
                  fontFamily: 'var(--font-heading)'
                }}>
                  Dog Policy Acceptance
                </h3>
              </div>

              {/* Body */}
              <div style={{
                marginBottom: '16px',
                color: 'var(--gray-700)',
                lineHeight: '1.5',
                fontFamily: 'var(--font-body)'
              }}>
                Before bringing a dog to a club run, you must confirm the following:
              </div>

              {/* Declarations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {[
                  { checked: policyChecked1, set: setPolicyChecked1, label: 'I have read and understood the Run Alcester Dog Policy' },
                  { checked: policyChecked2, set: setPolicyChecked2, label: 'I hold valid Third-Party Public Liability insurance covering my dog' },
                  { checked: policyChecked3, set: setPolicyChecked3, label: "I will comply with Run Leader instructions at all times and accept full personal liability for my dog's actions" }
                ].map((d, i) => (
                  <label
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--gray-700)',
                      lineHeight: '1.5'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={d.checked}
                      onChange={e => d.set(e.target.checked)}
                      style={{ marginTop: '3px', flexShrink: 0, width: '16px', height: '16px', accentColor: '#dc2626', cursor: 'pointer' }}
                    />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>

              {policyUrl && (
                <a
                  href={policyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: '#dc2626',
                    textDecoration: 'underline'
                  }}
                >
                  View Full Dog Policy ↗
                </a>
              )}

              {error && (
                <div style={{
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#dc2626'
                }}>
                  {error}
                </div>
              )}

              {/* Actions: left = back, right = primary (red) */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'nowrap'
              }}>
                <button
                  type="button"
                  onClick={() => setStep('ask_dog')}
                  disabled={accepting}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: 'white',
                    color: 'var(--gray-800)',
                    border: '1px solid var(--gray-400)',
                    borderRadius: '6px',
                    cursor: accepting ? 'not-allowed' : 'pointer',
                    opacity: accepting ? 0.6 : 1,
                    lineHeight: '1.2'
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAndBook}
                  disabled={!allDeclarationsChecked || accepting}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: allDeclarationsChecked && !accepting ? 'var(--red-primary)' : 'var(--gray-400)',
                    color: 'white',
                    border: `1px solid ${allDeclarationsChecked && !accepting ? 'var(--red-primary)' : 'var(--gray-400)'}`,
                    borderRadius: '6px',
                    cursor: allDeclarationsChecked && !accepting ? 'pointer' : 'not-allowed',
                    lineHeight: '1.2'
                  }}
                >
                  {accepting ? 'Saving…' : 'Accept & Book'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dogModalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

// src/modules/admin/components/EAApplicationSettingsModal.tsx
// Admin modal for managing EA application settings

import React, { useState, useEffect } from 'react';
import { AffiliatedMemberService } from '../../membership/services/affiliatedMemberService';

interface EAApplicationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  membershipYear: string;
  onSettingsUpdated?: () => void;
}

export const EAApplicationSettingsModal: React.FC<EAApplicationSettingsModalProps> = ({
  isOpen,
  onClose,
  membershipYear,
  onSettingsUpdated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    applications_open: false,
    open_date: '',
    close_date: '',
    marathon_ballot_deadline: '',
    first_claim_fee: 30.0,
    second_claim_fee: 12.0,
    uk_athletics_affiliation_fee: 19.0,
    notes: '',
  });

  useEffect(() => {
    if (isOpen && membershipYear) {
      loadSettings();
    }
  }, [isOpen, membershipYear]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const settings = await AffiliatedMemberService.getApplicationSettings(membershipYear);
      if (settings) {
        setFormData({
          applications_open: settings.applications_open || false,
          open_date: settings.open_date ? settings.open_date.split('T')[0] : '',
          close_date: settings.close_date ? settings.close_date.split('T')[0] : '',
          marathon_ballot_deadline: settings.marathon_ballot_deadline
            ? settings.marathon_ballot_deadline.split('T')[0]
            : '',
          first_claim_fee: settings.first_claim_fee || 30.0,
          second_claim_fee: settings.second_claim_fee || 12.0,
          uk_athletics_affiliation_fee: settings.uk_athletics_affiliation_fee || 19.0,
          notes: settings.notes || '',
        });
      } else {
        // Default values for new year
        setFormData({
          applications_open: false,
          open_date: '',
          close_date: '',
          marathon_ballot_deadline: '',
          first_claim_fee: 30.0,
          second_claim_fee: 12.0,
          uk_athletics_affiliation_fee: 19.0,
          notes: '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData(prev => ({
        ...prev,
        [name]: numValue,
      }));
    }
  };

  const validateForm = (): string | null => {
    if (formData.first_claim_fee <= 0) {
      return 'First claim fee must be greater than 0';
    }
    if (formData.second_claim_fee <= 0) {
      return 'Second claim fee must be greater than 0';
    }
    if (formData.uk_athletics_affiliation_fee <= 0) {
      return 'UK Athletics affiliation fee must be greater than 0';
    }
    if (formData.uk_athletics_affiliation_fee > formData.first_claim_fee) {
      return 'UK Athletics fee cannot be greater than the 1st Claim fee';
    }
    if (formData.open_date && formData.close_date) {
      if (new Date(formData.open_date) >= new Date(formData.close_date)) {
        return 'Close date must be after open date';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await AffiliatedMemberService.updateApplicationSettings(membershipYear, {
        applications_open: formData.applications_open,
        open_date: formData.open_date || undefined,
        close_date: formData.close_date || undefined,
        marathon_ballot_deadline: formData.marathon_ballot_deadline || undefined,
        first_claim_fee: formData.first_claim_fee,
        second_claim_fee: formData.second_claim_fee,
        uk_athletics_affiliation_fee: formData.uk_athletics_affiliation_fee,
        notes: formData.notes || undefined,
      });

      setSuccess('Settings saved successfully!');
      onSettingsUpdated?.();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '24px 24px 0 24px',
            borderBottom: '1px solid var(--gray-200)',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <h2
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '20px',
                  fontWeight: '600',
                  color: 'var(--gray-900)',
                }}
              >
                EA Application Settings
              </h2>
              <p
                style={{
                  margin: '0 0 16px 0',
                  color: 'var(--gray-600)',
                  fontSize: '14px',
                }}
              >
                Membership Year: {membershipYear}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--gray-500)',
                padding: '0',
                marginLeft: '16px',
              }}
              aria-label="Close modal"
            >
              x
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '0 24px 24px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--gray-600)' }}>Loading settings...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                  }}
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                  }}
                >
                  {success}
                </div>
              )}

              {/* Application Window Status */}
              <div style={{ marginBottom: '24px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--gray-900)',
                    marginBottom: '12px',
                  }}
                >
                  Application Window Status
                </h4>
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="applications_open"
                      checked={formData.applications_open === true}
                      onChange={() =>
                        setFormData(prev => ({ ...prev, applications_open: true }))
                      }
                    />
                    <span
                      style={{
                        color: formData.applications_open ? '#166534' : 'var(--gray-700)',
                        fontWeight: formData.applications_open ? '500' : '400',
                      }}
                    >
                      Open
                    </span>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="applications_open"
                      checked={formData.applications_open === false}
                      onChange={() =>
                        setFormData(prev => ({ ...prev, applications_open: false }))
                      }
                    />
                    <span
                      style={{
                        color: !formData.applications_open ? '#dc2626' : 'var(--gray-700)',
                        fontWeight: !formData.applications_open ? '500' : '400',
                      }}
                    >
                      Closed
                    </span>
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div style={{ marginBottom: '24px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--gray-900)',
                    marginBottom: '12px',
                  }}
                >
                  Application Dates (Optional)
                </h4>

                <div className="form-group">
                  <label className="form-label" htmlFor="open_date">
                    Open Date
                  </label>
                  <input
                    type="date"
                    id="open_date"
                    name="open_date"
                    value={formData.open_date}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="close_date">
                    Close Date
                  </label>
                  <input
                    type="date"
                    id="close_date"
                    name="close_date"
                    value={formData.close_date}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="marathon_ballot_deadline">
                    Marathon Ballot Deadline
                  </label>
                  <input
                    type="date"
                    id="marathon_ballot_deadline"
                    name="marathon_ballot_deadline"
                    value={formData.marathon_ballot_deadline}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                  <small style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                    Last date for EA affiliation to qualify for London Marathon ballot
                  </small>
                </div>
              </div>

              {/* Membership Fees */}
              <div style={{ marginBottom: '24px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--gray-900)',
                    marginBottom: '12px',
                  }}
                >
                  Membership Fees
                </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                  }}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="first_claim_fee">
                      1st Claim Fee
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '8px 12px',
                          background: 'var(--gray-100)',
                          border: '1px solid var(--gray-300)',
                          borderRight: 'none',
                          borderRadius: '6px 0 0 6px',
                          color: 'var(--gray-600)',
                        }}
                      >
                        £
                      </span>
                      <input
                        type="number"
                        id="first_claim_fee"
                        name="first_claim_fee"
                        value={formData.first_claim_fee}
                        onChange={handleNumberChange}
                        className="form-input"
                        step="0.01"
                        min="0"
                        required
                        style={{ borderRadius: '0 6px 6px 0' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="second_claim_fee">
                      2nd Claim Fee
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '8px 12px',
                          background: 'var(--gray-100)',
                          border: '1px solid var(--gray-300)',
                          borderRight: 'none',
                          borderRadius: '6px 0 0 6px',
                          color: 'var(--gray-600)',
                        }}
                      >
                        £
                      </span>
                      <input
                        type="number"
                        id="second_claim_fee"
                        name="second_claim_fee"
                        value={formData.second_claim_fee}
                        onChange={handleNumberChange}
                        className="form-input"
                        step="0.01"
                        min="0"
                        required
                        style={{ borderRadius: '0 6px 6px 0' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label" htmlFor="uk_athletics_affiliation_fee">
                    UK Athletics Affiliation Fee (included in 1st Claim)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', maxWidth: '200px' }}>
                    <span
                      style={{
                        padding: '8px 12px',
                        background: 'var(--gray-100)',
                        border: '1px solid var(--gray-300)',
                        borderRight: 'none',
                        borderRadius: '6px 0 0 6px',
                        color: 'var(--gray-600)',
                      }}
                    >
                      £
                    </span>
                    <input
                      type="number"
                      id="uk_athletics_affiliation_fee"
                      name="uk_athletics_affiliation_fee"
                      value={formData.uk_athletics_affiliation_fee}
                      onChange={handleNumberChange}
                      className="form-input"
                      step="0.01"
                      min="0"
                      required
                      style={{ borderRadius: '0 6px 6px 0' }}
                    />
                  </div>
                  <small style={{ color: 'var(--gray-600)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    This fee is shown in the membership information card
                  </small>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="notes">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="form-input"
                    rows={3}
                    placeholder="Internal notes about this membership year..."
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--gray-200)',
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={isSaving}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                  style={{ flex: 1 }}
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EAApplicationSettingsModal;

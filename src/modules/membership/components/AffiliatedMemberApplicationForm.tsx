// src/modules/membership/components/AffiliatedMemberApplicationForm.tsx
// EA Affiliated Member Application Form

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { AffiliatedMemberService } from '../services/affiliatedMemberService';
import { MembershipInformationCard } from './MembershipInformationCard';
import { AffiliatedMemberCard } from './AffiliatedMemberCard';
import {
  EAApplicationSettings,
  AffiliatedMemberApplication,
  ApplicationFormData,
  TitleOption,
  MembershipType,
  SexAtBirth,
} from '../../../types/affiliatedMember';

interface AffiliatedMemberApplicationFormProps {
  onBack?: () => void;
}

export const AffiliatedMemberApplicationForm: React.FC<AffiliatedMemberApplicationFormProps> = ({
  onBack,
}) => {
  const { state } = useAuth();
  const member = state.member;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [settings, setSettings] = useState<EAApplicationSettings | null>(null);
  const [existingApplication, setExistingApplication] = useState<AffiliatedMemberApplication | null>(null);
  const [currentYear, setCurrentYear] = useState('');
  const [isRenewal, setIsRenewal] = useState(false);
  const [showPreviousClub, setShowPreviousClub] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [isAffiliatedCurrentYear, setIsAffiliatedCurrentYear] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ApplicationFormData>({
    title: '' as TitleOption,
    date_of_birth: '',
    sex_at_birth: '' as SexAtBirth,
    address_postcode: '',
    nationality: '',
    membership_type: 'first_claim' as MembershipType,
    ea_urn_at_application: '',
    previous_club_name: '',
    has_health_conditions: false,
    health_conditions_details: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_number: '',
    additional_info: '',
    payment_reference: '',
    payment_method: 'bank_transfer',
    declaration_amateur: false,
    declaration_own_risk: false,
    declaration_data_privacy: false,
    declaration_policies: false,
    payment_sent_confirmed: false,
    payment_reference_confirmed: false,
  });

  useEffect(() => {
    loadInitialData();
  }, [member?.id]);

  const loadInitialData = async () => {
    if (!member?.id) return;

    setIsLoading(true);
    setError('');

    try {
      // Get current membership year
      const year = await AffiliatedMemberService.getCurrentMembershipYear();
      setCurrentYear(year);

      // Get application settings
      const appSettings = await AffiliatedMemberService.getApplicationSettings(year);
      setSettings(appSettings);

      // Check for existing application
      const existingApp = await AffiliatedMemberService.getMemberApplication(member.id, year);
      setExistingApplication(existingApp);

      // Check if member is already affiliated for this year
      const affiliatedThisYear = member.is_paid_member === true && member.ea_affiliation_year === year;
      setIsAffiliatedCurrentYear(affiliatedThisYear);

      // Check if this is a renewal (has been affiliated before, but not for current year)
      const renewal = member.is_paid_member === true && !affiliatedThisYear;
      setIsRenewal(renewal);

      // Pre-populate form with member data
      const surname = member.full_name?.split(' ').pop() || '';
      const paymentRef = '25MEM' + surname.substring(0, 5).toUpperCase();

      setFormData(prev => ({
        ...prev,
        title: (member.title as TitleOption) || '',
        date_of_birth: member.date_of_birth || '',
        sex_at_birth: (member.sex_at_birth as SexAtBirth) || '',
        address_postcode: member.address_postcode || '',
        nationality: member.nationality || '',
        ea_urn_at_application: renewal ? (member.ea_urn || '') : '',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_relationship: member.emergency_contact_relationship || '',
        emergency_contact_number: member.emergency_contact_phone || '',
        has_health_conditions: !!member.health_conditions,
        health_conditions_details: member.health_conditions || '',
        payment_reference: paymentRef,
      }));

    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load application data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleHealthConditionsChange = (hasConditions: boolean) => {
    setFormData(prev => ({
      ...prev,
      has_health_conditions: hasConditions,
      health_conditions_details: hasConditions ? prev.health_conditions_details : '',
    }));
  };

  const handlePreviousClubChange = (hasPreviousClub: boolean) => {
    setShowPreviousClub(hasPreviousClub);
    if (!hasPreviousClub) {
      setFormData(prev => ({
        ...prev,
        previous_club_name: '',
      }));
    }
  };

  const validateAge = (): boolean => {
    if (!formData.date_of_birth) return false;

    const dob = new Date(formData.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())
      ? age - 1
      : age;

    return actualAge >= 16;
  };

  const validateForm = (): string | null => {
    if (!formData.title) return 'Please select a title';
    if (!formData.date_of_birth) return 'Date of birth is required';
    if (!validateAge()) return 'You must be at least 16 years old to apply';
    if (!formData.sex_at_birth) return 'Sex at birth is required';
    if (!formData.address_postcode) return 'Address and postcode is required';
    if (!formData.nationality) return 'Nationality is required';
    if (!formData.membership_type) return 'Membership type is required';
    if (!formData.emergency_contact_name) return 'Emergency contact name is required';
    if (!formData.emergency_contact_relationship) return 'Emergency contact relationship is required';
    if (!formData.emergency_contact_number) return 'Emergency contact number is required';
    if (formData.emergency_contact_number.replace(/\D/g, '').length < 10) {
      return 'Emergency contact number must be at least 10 digits';
    }
    if (!formData.payment_reference) return 'Payment reference is required';
    if (!formData.declaration_amateur) return 'You must accept the amateur declaration';
    if (!formData.declaration_own_risk) return 'You must accept the own risk declaration';
    if (!formData.declaration_data_privacy) return 'You must accept the data privacy declaration';
    if (!formData.declaration_policies) return 'You must accept the policies declaration';
    if (!formData.payment_sent_confirmed) return 'Please confirm you have sent the payment';
    if (!formData.payment_reference_confirmed) return 'Please confirm the payment reference is correct';

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

    if (!member?.id) {
      setError('User not found. Please log in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const application = await AffiliatedMemberService.submitApplication(member.id, formData);
      setSuccess(`Application submitted successfully! Your application ID is ${application.id.substring(0, 8)}...`);
      setExistingApplication(application);
    } catch (err: any) {
      console.error('Failed to submit application:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-content" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--gray-600)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Already affiliated for current year - show affiliated member card
  if (isAffiliatedCurrentYear) {
    return (
      <AffiliatedMemberCard
        membershipType={member?.ea_membership_type as 'first_claim' | 'second_claim'}
        eaUrn={member?.ea_urn}
        eaYear={currentYear}
        onBack={onBack}
      />
    );
  }

  // Applications closed - show info card with applications closed message
  if (!settings?.applications_open) {
    return (
      <>
        <MembershipInformationCard settings={settings} />
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Apply for Membership</h3>
          </div>
          <div className="card-content">
            <div
              style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <p style={{ color: '#92400e', fontSize: '16px', marginBottom: '8px' }}>
                Applications are currently closed.
              </p>
              <p style={{ color: '#92400e', fontSize: '14px' }}>
                Please check back later for the next application window.
              </p>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="btn btn-secondary"
                style={{ marginTop: '24px' }}
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // Existing application - show status
  if (existingApplication && existingApplication.status !== 'cancelled') {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">EA Membership Application</h3>
          <p className="card-description">Membership Year: {currentYear}</p>
        </div>
        <div className="card-content">
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

          <div
            style={{
              background: 'var(--gray-50)',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <h4 style={{ marginBottom: '16px', color: 'var(--gray-900)' }}>
              Application Status
            </h4>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Submitted: </span>
              <span>{new Date(existingApplication.created_at).toLocaleDateString()}</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Status: </span>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background:
                    existingApplication.status === 'submitted'
                      ? '#fef3c7'
                      : existingApplication.status === 'payment_confirmed'
                      ? '#dbeafe'
                      : '#dcfce7',
                  color:
                    existingApplication.status === 'submitted'
                      ? '#92400e'
                      : existingApplication.status === 'payment_confirmed'
                      ? '#1d4ed8'
                      : '#166534',
                }}
              >
                {existingApplication.status === 'submitted'
                  ? 'Awaiting Payment Confirmation'
                  : existingApplication.status === 'payment_confirmed'
                  ? 'Payment Confirmed - EA Registration Pending'
                  : 'EA Confirmed'}
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Payment Reference: </span>
              <strong>{existingApplication.payment_reference}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Membership Type: </span>
              <span>
                {existingApplication.membership_type === 'first_claim' ? '1st Claim' : '2nd Claim'} -
                £{existingApplication.membership_fee.toFixed(2)}
              </span>
            </div>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="btn btn-secondary"
              style={{ marginTop: '24px' }}
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Application form with info card above
  return (
    <>
      {/* Membership Information Card */}
      <MembershipInformationCard settings={settings} />

      {/* Apply Button or Application Form */}
      {!showApplicationForm ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Apply for Membership</h3>
            <p className="card-description">
              {isRenewal
                ? `Renew your EA membership for ${currentYear}`
                : `Join England Athletics affiliated membership for ${currentYear}`}
            </p>
          </div>
          <div className="card-content">
            <button
              className="btn btn-primary"
              onClick={() => setShowApplicationForm(true)}
              style={{ width: '100%', padding: '16px', fontSize: '16px' }}
            >
              {isRenewal ? 'Renew Membership' : 'Apply for Membership'}
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '12px' }}
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">EA Membership Application</h3>
            <p className="card-description">
              Apply for England Athletics affiliated membership for {currentYear}
            </p>
          </div>

          <div className="card-content">
            {/* Important Notice */}
            <div
              style={{
                background: '#dbeafe',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <p style={{ color: '#1d4ed8', fontWeight: '500', marginBottom: '4px' }}>
                Important Notice
              </p>
              <p style={{ color: '#1d4ed8', fontSize: '14px', margin: 0 }}>
                Membership runs from 1st April to 31st March. Part-year subscriptions are not available.
              </p>
            </div>

            {/* Renewal Banner */}
            {isRenewal && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <p style={{ color: '#166534', margin: 0 }}>
                  This is a renewal for {currentYear}. Your current EA URN has been pre-filled.
                </p>
              </div>
            )}

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

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div style={{ marginBottom: '32px' }}>
            <h4
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--gray-200)',
              }}
            >
              Personal Information
            </h4>

            {/* Display-only fields */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              <div>
                <label className="form-label">Full Name</label>
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--gray-100)',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {member?.full_name}
                </div>
              </div>
              <div>
                <label className="form-label">Email</label>
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--gray-100)',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {member?.email}
                </div>
              </div>
              <div>
                <label className="form-label">Phone</label>
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--gray-100)',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {member?.phone || 'Not set'}
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="title">
                  Title *
                </label>
                <select
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                >
                  <option value="">Select...</option>
                  <option value="mr">Mr</option>
                  <option value="mrs">Mrs</option>
                  <option value="ms">Ms</option>
                  <option value="miss">Miss</option>
                  <option value="dr">Dr</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="date_of_birth">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  id="date_of_birth"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
                <small style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                  Must be 16 or over
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Sex at Birth *</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="sex_at_birth"
                      value="male"
                      checked={formData.sex_at_birth === 'male'}
                      onChange={handleInputChange}
                    />
                    Male
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="sex_at_birth"
                      value="female"
                      checked={formData.sex_at_birth === 'female'}
                      onChange={handleInputChange}
                    />
                    Female
                  </label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="address_postcode">
                Address & Postcode *
              </label>
              <textarea
                id="address_postcode"
                name="address_postcode"
                value={formData.address_postcode}
                onChange={handleInputChange}
                className="form-input"
                rows={2}
                required
                placeholder="Your full address including postcode"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="nationality">
                Nationality *
              </label>
              <input
                type="text"
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                className="form-input"
                required
                placeholder="e.g. British"
              />
            </div>
          </div>

          {/* Membership Details */}
          <div style={{ marginBottom: '32px' }}>
            <h4
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--gray-200)',
              }}
            >
              Membership Details
            </h4>

            <div className="form-group">
              <label className="form-label">Membership Type *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    padding: '12px',
                    border: `2px solid ${formData.membership_type === 'first_claim' ? 'var(--red-primary)' : 'var(--gray-300)'}`,
                    borderRadius: '8px',
                    background: formData.membership_type === 'first_claim' ? 'var(--red-light)' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="membership_type"
                    value="first_claim"
                    checked={formData.membership_type === 'first_claim'}
                    onChange={handleInputChange}
                    style={{ marginTop: '4px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>
                      1st Claim - £{settings?.first_claim_fee?.toFixed(2) || '30.00'}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                      Run Alcester is your primary club for competitions
                    </div>
                  </div>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    padding: '12px',
                    border: `2px solid ${formData.membership_type === 'second_claim' ? 'var(--red-primary)' : 'var(--gray-300)'}`,
                    borderRadius: '8px',
                    background: formData.membership_type === 'second_claim' ? 'var(--red-light)' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="membership_type"
                    value="second_claim"
                    checked={formData.membership_type === 'second_claim'}
                    onChange={handleInputChange}
                    style={{ marginTop: '4px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>
                      2nd Claim - £{settings?.second_claim_fee?.toFixed(2) || '12.00'}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                      You have another primary club registered with EA
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* EA URN for renewals or previous club members */}
            {(isRenewal || showPreviousClub) && (
              <div className="form-group">
                <label className="form-label" htmlFor="ea_urn_at_application">
                  EA URN {isRenewal ? '(from previous membership)' : '(if known)'}
                </label>
                <input
                  type="text"
                  id="ea_urn_at_application"
                  name="ea_urn_at_application"
                  value={formData.ea_urn_at_application}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Your England Athletics URN"
                />
              </div>
            )}

            {/* Previous club question */}
            {!isRenewal && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    Have you been registered with another EA affiliated club?
                  </label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="has_previous_club"
                        checked={showPreviousClub}
                        onChange={() => handlePreviousClubChange(true)}
                      />
                      Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="has_previous_club"
                        checked={!showPreviousClub}
                        onChange={() => handlePreviousClubChange(false)}
                      />
                      No
                    </label>
                  </div>
                </div>

                {showPreviousClub && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="previous_club_name">
                      Previous Club Name
                    </label>
                    <input
                      type="text"
                      id="previous_club_name"
                      name="previous_club_name"
                      value={formData.previous_club_name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Name of your previous club"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Health & Safety */}
          <div style={{ marginBottom: '32px' }}>
            <h4
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--gray-200)',
              }}
            >
              Health & Safety
            </h4>

            <div className="form-group">
              <label className="form-label">
                Do you have any health conditions we should be aware of?
              </label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="has_health_conditions"
                    checked={formData.has_health_conditions}
                    onChange={() => handleHealthConditionsChange(true)}
                  />
                  Yes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="has_health_conditions"
                    checked={!formData.has_health_conditions}
                    onChange={() => handleHealthConditionsChange(false)}
                  />
                  No
                </label>
              </div>
            </div>

            {formData.has_health_conditions && (
              <div className="form-group">
                <label className="form-label" htmlFor="health_conditions_details">
                  Health Conditions Details
                </label>
                <textarea
                  id="health_conditions_details"
                  name="health_conditions_details"
                  value={formData.health_conditions_details}
                  onChange={handleInputChange}
                  className="form-input"
                  rows={3}
                  placeholder="Please provide details of any health conditions, allergies, or medical information..."
                />
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div style={{ marginBottom: '32px' }}>
            <h4
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--gray-200)',
              }}
            >
              Emergency Contact
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="emergency_contact_name">
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="emergency_contact_relationship">
                  Relationship *
                </label>
                <input
                  type="text"
                  id="emergency_contact_relationship"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  placeholder="e.g. Spouse, Parent, Friend"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="emergency_contact_number">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  id="emergency_contact_number"
                  name="emergency_contact_number"
                  value={formData.emergency_contact_number}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  placeholder="e.g. 07123 456789"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div style={{ marginBottom: '32px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="additional_info">
                Additional Information (Optional)
              </label>
              <textarea
                id="additional_info"
                name="additional_info"
                value={formData.additional_info}
                onChange={handleInputChange}
                className="form-input"
                rows={3}
                placeholder="Any other information you'd like to share..."
              />
            </div>
          </div>

          {/* Payment Section */}
          <div style={{ marginBottom: '32px' }}>
            <h4
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--gray-200)',
              }}
            >
              Payment
            </h4>

            <div
              style={{
                background: 'var(--gray-50)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <p style={{ fontWeight: '600', marginBottom: '12px', color: 'var(--gray-900)' }}>
                Bank Transfer Details
              </p>
              <div style={{ fontSize: '14px', color: 'var(--gray-700)' }}>
                <p style={{ margin: '4px 0' }}>
                  <strong>Account Name:</strong> Run Alcester
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Sort Code:</strong> 30-96-97
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Account Number:</strong> 54037468
                </p>
                <p style={{ margin: '8px 0 0 0' }}>
                  <strong>Amount:</strong> £
                  {formData.membership_type === 'first_claim'
                    ? settings?.first_claim_fee?.toFixed(2) || '30.00'
                    : settings?.second_claim_fee?.toFixed(2) || '12.00'}
                </p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="payment_reference">
                Payment Reference *
              </label>
              <input
                type="text"
                id="payment_reference"
                name="payment_reference"
                value={formData.payment_reference}
                onChange={handleInputChange}
                className="form-input"
                required
                style={{ fontWeight: '600' }}
              />
              <small style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                Use this exact reference when making your bank transfer
              </small>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="payment_sent_confirmed"
                  checked={formData.payment_sent_confirmed}
                  onChange={handleInputChange}
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '14px' }}>
                  I confirm I have sent payment via bank transfer
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="payment_reference_confirmed"
                  checked={formData.payment_reference_confirmed}
                  onChange={handleInputChange}
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '14px' }}>
                  I confirm the payment reference shown above is correct
                </span>
              </label>
            </div>
          </div>

          {/* Declarations */}
          <div style={{ marginBottom: '32px' }}>
            <h4
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--gray-200)',
              }}
            >
              Declarations
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="declaration_amateur"
                  checked={formData.declaration_amateur}
                  onChange={handleInputChange}
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '14px' }}>
                  I am declaring that I am an amateur as defined by the eligibility rule of UK Athletics
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="declaration_own_risk"
                  checked={formData.declaration_own_risk}
                  onChange={handleInputChange}
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '14px' }}>
                  I take part in the club's activities at my own risk and that I will be responsible for
                  my own safety whilst out running with the club or when I take part in events as a club
                  member
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="declaration_data_privacy"
                  checked={formData.declaration_data_privacy}
                  onChange={handleInputChange}
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '14px' }}>
                  Personal information will not be disclosed to any third party with the exception of
                  England Athletics for affiliation or registering purposes. All athletes will be
                  registered with EA
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="declaration_policies"
                  checked={formData.declaration_policies}
                  onChange={handleInputChange}
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '14px' }}>
                  I understand that a copy of the Health & Safety policy, Constitution, Risk Assessments
                  and Byelaws are available and agree to abide by these
                </span>
              </label>
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
              onClick={() => setShowApplicationForm(false)}
              className="btn btn-secondary"
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
      )}
    </>
  );
};

export default AffiliatedMemberApplicationForm;

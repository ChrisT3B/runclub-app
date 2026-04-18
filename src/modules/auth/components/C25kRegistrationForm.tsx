import React, { useState } from 'react';
import { C25kRegistrationFormData } from '../../../types/c25k';
import { C25kRegistrationService } from '../../../services/c25kRegistrationService';

interface ExistingMemberData {
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  ea_urn?: string;
  member_id?: string;
}

interface C25kRegistrationFormProps {
  invitationEmail?: string;
  onSubmit: (data: C25kRegistrationFormData, detectedMemberId?: string) => Promise<void>;
  onCancel?: () => void;
  isExistingMember?: boolean;
  existingMemberData?: ExistingMemberData;
}

const HEALTH_QUESTIONS = [
  {
    key: 'heart_condition' as const,
    text: 'Has your doctor ever said that you have a heart condition OR high blood pressure?'
  },
  {
    key: 'chest_pain' as const,
    text: 'Do you feel pain in your chest at rest, during your activities of daily living, OR when you do physical activity?'
  },
  {
    key: 'dizziness_loss_consciousness' as const,
    text: 'Do you lose balance because of dizziness OR have you lost consciousness in the last 12 months? (Answer NO if associated with over-breathing during vigorous exercise)'
  },
  {
    key: 'chronic_medical_condition' as const,
    text: 'Have you ever been diagnosed with another chronic medical condition (other than heart disease or high blood pressure)?'
  },
  {
    key: 'prescribed_medications' as const,
    text: 'Are you currently taking prescribed medications for a chronic medical condition?'
  },
  {
    key: 'bone_joint_soft_tissue' as const,
    text: 'Do you currently have (or have had within the past 12 months) a bone, joint, or soft tissue problem that could be made worse by becoming more physically active? (Answer NO if past problem does not limit current ability)'
  },
  {
    key: 'medically_supervised_only' as const,
    text: 'Has your doctor ever said that you should only do medically supervised physical activity?'
  }
];

export const C25kRegistrationForm: React.FC<C25kRegistrationFormProps> = ({
  invitationEmail,
  onSubmit,
  onCancel,
  isExistingMember = false,
  existingMemberData
}) => {
  const [formData, setFormData] = useState<C25kRegistrationFormData>({
    title: '',
    full_name: existingMemberData?.full_name || '',
    date_of_birth: '',
    sex_at_birth: 'male',
    address_postcode: '',
    email: invitationEmail || existingMemberData?.email || '',
    phone: existingMemberData?.phone || '',
    is_existing_member: false,
    ea_urn: '',
    health_screening: {
      heart_condition: false,
      chest_pain: false,
      dizziness_loss_consciousness: false,
      chronic_medical_condition: false,
      prescribed_medications: false,
      bone_joint_soft_tissue: false,
      medically_supervised_only: false,
      additional_info: ''
    },
    emergency_contact_name: existingMemberData?.emergency_contact_name || '',
    emergency_contact_relationship: '',
    emergency_contact_phone: existingMemberData?.emergency_contact_phone || '',
    additional_info: '',
    payment_type: 'bank_transfer',
    accepted_terms: false,
    password: '',
    confirm_password: ''
  });

  // Track which health questions have been explicitly answered
  const [healthAnswered, setHealthAnswered] = useState<Record<string, boolean>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Existing member detection via email
  const [detectedMemberId, setDetectedMemberId] = useState<string | undefined>(existingMemberData?.member_id);
  const [detectedExisting, setDetectedExisting] = useState(isExistingMember || false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [lastCheckedEmail, setLastCheckedEmail] = useState('');

  const handleEmailBlur = async () => {
    if (isExistingMember || !formData.email || !formData.email.includes('@')) return;

    // Rate limit: don't re-check the same email
    const emailLower = formData.email.toLowerCase().trim();
    if (emailLower === lastCheckedEmail) return;
    setLastCheckedEmail(emailLower);

    setCheckingEmail(true);
    try {
      const result = await C25kRegistrationService.checkExistingMember(formData.email);
      if (result.exists && result.member_id) {
        setDetectedExisting(true);
        setDetectedMemberId(result.member_id);
        // Pre-fill fields from existing member data
        setFormData(prev => ({
          ...prev,
          full_name: result.full_name || prev.full_name,
          phone: result.phone || prev.phone,
          emergency_contact_name: result.emergency_contact_name || prev.emergency_contact_name,
          emergency_contact_phone: result.emergency_contact_phone || prev.emergency_contact_phone
        }));
      } else {
        setDetectedExisting(false);
        setDetectedMemberId(undefined);
      }
    } catch {
      // Silently fail — just treat as new member
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const setHealthAnswer = (key: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      health_screening: {
        ...prev.health_screening,
        [key]: value
      }
    }));
    setHealthAnswered(prev => ({ ...prev, [key]: true }));
    if (errors[`health_${key}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`health_${key}`];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.full_name) newErrors.full_name = 'Full name is required';
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    if (!formData.address_postcode) newErrors.address_postcode = 'Address & postcode is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.emergency_contact_name) newErrors.emergency_contact_name = 'Emergency contact name is required';
    if (!formData.emergency_contact_relationship) newErrors.emergency_contact_relationship = 'Emergency contact relationship is required';
    if (!formData.emergency_contact_phone) newErrors.emergency_contact_phone = 'Emergency contact number is required';

    // All health questions must be explicitly answered
    for (const q of HEALTH_QUESTIONS) {
      if (!healthAnswered[q.key]) {
        newErrors[`health_${q.key}`] = 'Please answer this question';
      }
    }

    // Password validation (only for new members, not detected existing)
    if (!isExistingMember && !detectedExisting) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    }

    if (!formData.accepted_terms) {
      newErrors.accepted_terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.querySelector(`[name="${firstErrorKey}"], [data-field="${firstErrorKey}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData, detectedMemberId);
    } catch (error: any) {
      console.error('Registration error:', error);
      setErrors({ submit: error.message || 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allHealthScreeningNo =
    !formData.health_screening.heart_condition &&
    !formData.health_screening.chest_pain &&
    !formData.health_screening.dizziness_loss_consciousness &&
    !formData.health_screening.chronic_medical_condition &&
    !formData.health_screening.prescribed_medications &&
    !formData.health_screening.bone_joint_soft_tissue &&
    !formData.health_screening.medically_supervised_only;

  const allQuestionsAnswered = HEALTH_QUESTIONS.every(q => healthAnswered[q.key]);
  const anyHealthScreeningYes = allQuestionsAnswered && !allHealthScreeningNo;

  const errorStyle = { color: '#dc2626', fontSize: '12px', marginTop: '4px' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontWeight: '600' };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--gray-300)',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px' }}>
      {/* Programme Info Header */}
      <div style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: '28px' }}>
          Run Alcester Couch to 5K 2026
        </h1>
        <p style={{ margin: '0 0 16px 0', color: '#3b82f6', fontSize: '16px', lineHeight: '1.6' }}>
          12-week programme starting <strong>Monday 27th April 2026</strong>
        </p>

        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '16px' }}>
            Programme Details
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#3b82f6', fontSize: '14px', lineHeight: '1.8' }}>
            <li><strong>Cost:</strong> £30 (just £2.50 per week!)</li>
            <li><strong>Places:</strong> Only 12 available - first-come, first-served</li>
            <li><strong>Schedule:</strong> Monday 7pm, Wednesday 7pm (track), Friday 6pm</li>
            <li><strong>Induction:</strong> 23rd April 2026, 6:15pm at Alcester Town Hall</li>
            <li><strong>On completion:</strong> Medal, Run Alcester T-Shirt, Parkrun graduation</li>
          </ul>
        </div>

        <div style={{
          padding: '12px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#92400e'
        }}>
          <strong>Existing/returning members:</strong> Your fee may be waived — the admin will confirm after reviewing your registration
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Details */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '20px', color: 'var(--gray-800)' }}>
            Personal Details
          </h2>

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Title *</label>
            <select
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              style={inputStyle}
            >
              <option value="">Select title</option>
              <option value="mr">Mr</option>
              <option value="mrs">Mrs</option>
              <option value="ms">Ms</option>
              <option value="miss">Miss</option>
              <option value="dr">Dr</option>
              <option value="other">Other</option>
            </select>
            {errors.title && <p style={errorStyle}>{errors.title}</p>}
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Full Name *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              required
              style={inputStyle}
            />
            {errors.full_name && <p style={errorStyle}>{errors.full_name}</p>}
          </div>

          {/* Date of Birth */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Date of Birth *</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleInputChange}
              required
              style={inputStyle}
            />
            {errors.date_of_birth && <p style={errorStyle}>{errors.date_of_birth}</p>}
          </div>

          {/* Sex at Birth */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Sex at Birth *</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="sex_at_birth"
                  value="male"
                  checked={formData.sex_at_birth === 'male'}
                  onChange={handleInputChange}
                  style={{ marginRight: '8px' }}
                />
                Male
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="sex_at_birth"
                  value="female"
                  checked={formData.sex_at_birth === 'female'}
                  onChange={handleInputChange}
                  style={{ marginRight: '8px' }}
                />
                Female
              </label>
            </div>
          </div>

          {/* Address & Postcode */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Address & Postcode *</label>
            <textarea
              name="address_postcode"
              value={formData.address_postcode}
              onChange={handleInputChange}
              required
              rows={3}
              placeholder="Street address and postcode"
              style={{ ...inputStyle, fontFamily: 'inherit' }}
            />
            {errors.address_postcode && <p style={errorStyle}>{errors.address_postcode}</p>}
          </div>

          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleEmailBlur}
              required
              style={inputStyle}
            />
            {checkingEmail && (
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                Checking email...
              </p>
            )}
            {detectedExisting && !isExistingMember && (
              <p style={{ fontSize: '12px', color: 'var(--success-color, #10b981)', marginTop: '4px', fontWeight: '500' }}>
                ✓ We found your account — your details have been pre-filled
              </p>
            )}
            {invitationEmail && (
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                Pre-filled from your invitation
              </p>
            )}
            {errors.email && <p style={errorStyle}>{errors.email}</p>}
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Telephone *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              placeholder="07700 900000"
              style={inputStyle}
            />
            {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
          </div>

        </section>

        {/* Health Screening Section */}
        <section style={{
          marginBottom: '32px',
          padding: '24px',
          background: '#fef3c7',
          border: '2px solid #fbbf24',
          borderRadius: '8px'
        }}>
          <h2 style={{ marginBottom: '8px', fontSize: '20px', color: '#92400e' }}>
            Health Screening
          </h2>
          <p style={{ marginBottom: '16px', fontSize: '14px', color: '#78350f', lineHeight: '1.6' }}>
            Please answer the following questions honestly. If you answer YES to any question,
            our physiotherapist will contact you to discuss further.
          </p>

          {HEALTH_QUESTIONS.map((question, index) => (
            <div
              key={question.key}
              data-field={`health_${question.key}`}
              style={{
                marginBottom: '20px',
                padding: '16px',
                background: 'white',
                borderRadius: '6px',
                border: errors[`health_${question.key}`] ? '2px solid #dc2626' : '1px solid transparent'
              }}
            >
              <p style={{ marginBottom: '12px', fontWeight: '500', color: 'var(--gray-800)' }}>
                {index + 1}. {question.text}
              </p>
              <div style={{ display: 'flex', gap: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`health_${question.key}`}
                    checked={healthAnswered[question.key] && formData.health_screening[question.key] === true}
                    onChange={() => setHealthAnswer(question.key, true)}
                    style={{ marginRight: '8px' }}
                  />
                  Yes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`health_${question.key}`}
                    checked={healthAnswered[question.key] && formData.health_screening[question.key] === false}
                    onChange={() => setHealthAnswer(question.key, false)}
                    style={{ marginRight: '8px' }}
                  />
                  No
                </label>
              </div>
              {errors[`health_${question.key}`] && (
                <p style={{ ...errorStyle, marginTop: '8px' }}>{errors[`health_${question.key}`]}</p>
              )}
            </div>
          ))}

          {/* Health Screening Result Messages */}
          {allQuestionsAnswered && allHealthScreeningNo && (
            <div style={{
              padding: '16px',
              background: '#dcfce7',
              border: '1px solid #22c55e',
              borderRadius: '6px',
              marginTop: '16px'
            }}>
              <p style={{ margin: 0, color: '#166534', fontSize: '14px', lineHeight: '1.6' }}>
                <strong>Answered all NO:</strong> You are cleared for physical activity.
                Start slowly and build up gradually. Follow the programme guidance.
              </p>
            </div>
          )}

          {anyHealthScreeningYes && (
            <div style={{
              padding: '16px',
              background: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              marginTop: '16px'
            }}>
              <p style={{ margin: 0, color: '#991b1b', fontSize: '14px', lineHeight: '1.6' }}>
                <strong>You answered YES to one or more questions:</strong> Our physiotherapist
                will be in touch to discuss your responses before confirming your place.
              </p>
            </div>
          )}
        </section>

        {/* Emergency Contact Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '8px', fontSize: '20px', color: 'var(--gray-800)' }}>
            Emergency Contact
          </h2>
          <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--gray-600)' }}>
            We ask all runners to carry ICE (In Case of Emergency) details on all LIRF-led runs.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Emergency Contact Name *</label>
            <input
              type="text"
              name="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={handleInputChange}
              required
              style={inputStyle}
            />
            {errors.emergency_contact_name && <p style={errorStyle}>{errors.emergency_contact_name}</p>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Emergency Contact Relationship *</label>
            <input
              type="text"
              name="emergency_contact_relationship"
              value={formData.emergency_contact_relationship}
              onChange={handleInputChange}
              required
              placeholder="e.g., Spouse, Parent, Sibling"
              style={inputStyle}
            />
            {errors.emergency_contact_relationship && <p style={errorStyle}>{errors.emergency_contact_relationship}</p>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Emergency Contact Number *</label>
            <input
              type="tel"
              name="emergency_contact_phone"
              value={formData.emergency_contact_phone}
              onChange={handleInputChange}
              required
              placeholder="07700 900001"
              style={inputStyle}
            />
            {errors.emergency_contact_phone && <p style={errorStyle}>{errors.emergency_contact_phone}</p>}
          </div>
        </section>

        {/* Additional Info */}
        <section style={{ marginBottom: '32px' }}>
          <div>
            <label style={labelStyle}>
              Other information you think we should know to support you
            </label>
            <textarea
              name="additional_info"
              value={formData.additional_info}
              onChange={handleInputChange}
              rows={4}
              placeholder="Any other health conditions, injuries, or information that would help us support your running journey..."
              style={{ ...inputStyle, fontFamily: 'inherit' }}
            />
          </div>
        </section>

        {/* Password Section (only for new members, hidden for detected existing) */}
        {!isExistingMember && !detectedExisting && (
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '20px', color: 'var(--gray-800)' }}>
              Account Password
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={8}
                style={inputStyle}
              />
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                Must include: 8+ characters, uppercase, lowercase, number &amp; special character
              </p>
              {errors.password && <p style={errorStyle}>{errors.password}</p>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Confirm Password *</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                required
                style={inputStyle}
              />
              {errors.confirm_password && <p style={errorStyle}>{errors.confirm_password}</p>}
            </div>
          </section>
        )}

        {/* Payment Section */}
        <section style={{
          marginBottom: '32px',
          padding: '24px',
          background: '#f0f9ff',
          border: '2px solid #3b82f6',
          borderRadius: '8px'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '20px', color: '#1e40af' }}>
            Payment Information
          </h2>

          <div style={{
              padding: '16px',
              background: 'white',
              border: '1px solid #bfdbfe',
              borderRadius: '6px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e40af' }}>
                Bank Transfer Details
              </h3>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: '600', color: '#1e40af' }}>Amount:</td>
                    <td style={{ padding: '4px 0' }}>£30.00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: '600', color: '#1e40af' }}>Account Name:</td>
                    <td style={{ padding: '4px 0' }}>Run Alcester</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: '600', color: '#1e40af' }}>Sort Code:</td>
                    <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>30 96 97</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: '600', color: '#1e40af' }}>Account Number:</td>
                    <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>54037468</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: '600', color: '#1e40af' }}>Reference:</td>
                    <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>C25K [Your Name]</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#3b82f6' }}>
                Please complete payment <strong>before</strong> submitting this form to secure your place.
              </p>
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: '#fef3c7',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: '#92400e'
              }}>
                <strong>Existing/returning members:</strong> Do not pay yet — the club will confirm if your fee is waived. You will be contacted if payment is required.
              </div>
            </div>
        </section>

        {/* Terms and Conditions */}
        <section style={{ marginBottom: '32px' }}>
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'start',
              cursor: 'pointer',
              padding: '16px',
              background: 'var(--gray-50)',
              border: `2px solid ${formData.accepted_terms ? '#22c55e' : 'var(--gray-300)'}`,
              borderRadius: '6px'
            }}>
              <input
                type="checkbox"
                name="accepted_terms"
                checked={formData.accepted_terms}
                onChange={handleInputChange}
                required
                style={{ marginRight: '12px', marginTop: '4px', flexShrink: 0 }}
              />
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <strong>I understand and accept that: *</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>I take part in the club's activities at my own risk</li>
                  <li>I am responsible for my own safety whilst running</li>
                  <li>I have read the Health & Safety policy, Constitution, Risk Assessments and Byelaws available on the club website</li>
                  <li>A copy of my responses will be emailed to me</li>
                </ul>
              </div>
            </label>
            {errors.accepted_terms && <p style={errorStyle}>{errors.accepted_terms}</p>}
          </div>
        </section>

        {/* Submit */}
        <div style={{ textAlign: 'center' }}>
          {errors.submit && (
            <p style={{ color: '#dc2626', marginBottom: '16px' }}>{errors.submit}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '16px 48px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Registering...' : (isExistingMember ? 'Submit C25k Registration' : 'Complete C25k Registration')}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                marginLeft: '16px',
                padding: '16px 48px',
                background: 'transparent',
                color: 'var(--gray-600)',
                border: '2px solid var(--gray-300)',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Footer (only for public page) */}
      {!isExistingMember && (
        <div style={{
          textAlign: 'center',
          marginTop: '30px',
          color: 'var(--gray-500)',
          fontSize: '12px'
        }}>
          <p>Need help? Contact us at runalcester@gmail.com</p>
          <p>
            <a href="/" style={{ color: '#1e40af', textDecoration: 'underline' }}>
              Already have an account? Sign in
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

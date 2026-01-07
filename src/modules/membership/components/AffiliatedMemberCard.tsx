// src/modules/membership/components/AffiliatedMemberCard.tsx
// Card shown to affiliated members with their status and EA resources

import React from 'react';

interface AffiliatedMemberCardProps {
  membershipType?: 'first_claim' | 'second_claim';
  eaUrn?: string;
  eaYear?: string;
  onBack?: () => void;
}

export const AffiliatedMemberCard: React.FC<AffiliatedMemberCardProps> = ({
  membershipType,
  eaUrn,
  eaYear,
  onBack,
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Your Membership Status</h3>
      </div>
      <div className="card-content">
        {/* Status badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
        }}>
          <span style={{
            background: '#dcfce7',
            color: '#166534',
            padding: '6px 16px',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600',
          }}>
            EA Affiliated {eaYear}
          </span>
        </div>

        {/* Membership details grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '4px' }}>
              Membership Year
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)' }}>
              {eaYear || 'Not set'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '4px' }}>
              Membership Type
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)' }}>
              {membershipType === 'first_claim' ? '1st Claim' :
                membershipType === 'second_claim' ? '2nd Claim' : 'Not set'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '4px' }}>
              EA URN
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', fontFamily: 'monospace' }}>
              {eaUrn || 'Not set'}
            </div>
          </div>
        </div>

        {/* EA Resources section */}
        <div style={{
          backgroundColor: 'var(--gray-50)',
          padding: '16px',
          borderRadius: '8px',
          borderLeft: '4px solid var(--red-primary)'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--gray-900)'
          }}>
            England Athletics Resources
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a
              href="https://myathleticsportal.englandathletics.org/Account/Login"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '10px 16px',
                width: 'fit-content'
              }}
            >
              My Athletics Portal (Login)
            </a>

            <a
              href="https://www.englandathletics.org/take-part/athlete-registration/benefits/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '10px 16px',
                width: 'fit-content'
              }}
            >
              Membership Benefits Information
            </a>
          </div>
        </div>

        {/* Back button */}
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
};

export default AffiliatedMemberCard;

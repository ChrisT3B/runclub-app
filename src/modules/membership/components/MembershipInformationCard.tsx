// src/modules/membership/components/MembershipInformationCard.tsx
// Information card shown to non-members explaining membership benefits

import React from 'react';
import { EAApplicationSettings } from '../../../types/affiliatedMember';

interface MembershipInformationCardProps {
  settings: EAApplicationSettings | null;
}

export const MembershipInformationCard: React.FC<MembershipInformationCardProps> = ({ settings }) => {
  const firstClaimFee = settings?.first_claim_fee || 30;
  const secondClaimFee = settings?.second_claim_fee || 12;
  const ukAthleticsFee = settings?.uk_athletics_affiliation_fee || 19;
  const clubFee = firstClaimFee - ukAthleticsFee;

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h3 className="card-title">Why Become a Member?</h3>
      </div>
      <div className="card-content">
        <p style={{ marginBottom: '16px', color: 'var(--gray-700)' }}>
          It is not mandatory to be a member of Run Alcester to run with us, but there are some benefits to doing so:
        </p>

        <ul style={{
          marginBottom: '20px',
          paddingLeft: '24px',
          color: 'var(--gray-700)',
          lineHeight: '1.8'
        }}>
          <li>50% Discount on club track sessions</li>
          <li>Reduced race entry fees</li>
          <li>London Marathon Club place ballot entry</li>
        </ul>

        <p style={{ marginBottom: '16px', color: 'var(--gray-700)' }}>
          Find out more from England Athletics on the benefits of affiliation{' '}
          <a
            href="https://www.englandathletics.org/take-part/athlete-registration/benefits/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--red-primary)',
              textDecoration: 'underline',
              fontWeight: '500'
            }}
          >
            here
          </a>
        </p>

        <div style={{
          backgroundColor: 'var(--gray-50)',
          padding: '16px',
          borderRadius: '8px',
          borderLeft: '4px solid var(--red-primary)'
        }}>
          <p style={{
            margin: '0 0 12px 0',
            fontWeight: '600',
            color: 'var(--gray-900)'
          }}>
            Our membership year runs from April to March for a single annual payment
          </p>

          {/* 1st Claim explanation */}
          <p style={{ margin: '0 0 12px 0', color: 'var(--gray-700)' }}>
            <strong>FULL membership (1st Claim) is £{firstClaimFee.toFixed(2)} per annum.</strong> This fee includes UK Athletics affiliation fee (£{ukAthleticsFee.toFixed(2)}) with the remaining £{clubFee.toFixed(2)} used to train run leaders and coaches, and ensure we have all policies, processes and equipment in place to support you.
          </p>

          {/* 2nd Claim explanation */}
          <p style={{ margin: '0 0 12px 0', color: 'var(--gray-700)' }}>
            <strong>2nd Claim membership is £{secondClaimFee.toFixed(2)} per annum.</strong> This is for runners who are already registered with another EA affiliated club as their primary club. The EA affiliation fee is paid through your primary club.
          </p>

          <p style={{ margin: 0, color: 'var(--gray-700)', fontStyle: 'italic' }}>
            Run Alcester is a not for profit club - all funds are invested back into the club.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MembershipInformationCard;

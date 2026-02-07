# Club Membership Page - Enhancement Work Package

## Overview
Enhance the Club Membership page (formerly "EA Membership") to show informative cards before the application form:
- **Non-members:** Show benefits and membership information card
- **Affiliated members:** Show links to England Athletics resources

---

## TASK 1: Update Application Settings Schema

### Database Migration
Add column for UK Athletics affiliation fee to settings table:

```sql
-- Add UK Athletics affiliation fee to settings
ALTER TABLE ea_application_settings
ADD COLUMN IF NOT EXISTS uk_athletics_affiliation_fee DECIMAL(10,2) DEFAULT 19.00;

-- Update existing 2025-2026 record
UPDATE ea_application_settings
SET uk_athletics_affiliation_fee = 19.00
WHERE membership_year = '2025-2026';

-- Add comment
COMMENT ON COLUMN ea_application_settings.uk_athletics_affiliation_fee IS 'UK Athletics affiliation fee included in 1st claim membership (£19 default)';
```

**File:** Create new migration file `03_add_uk_athletics_fee.sql`

---

## TASK 2: Update TypeScript Types

### File: `src/types/affiliatedMember.ts`

Add to `EAApplicationSettings` interface:

```typescript
export interface EAApplicationSettings {
  id: string;
  membership_year: string;
  applications_open: boolean;
  open_date?: string;
  close_date?: string;
  marathon_ballot_deadline?: string;
  first_claim_fee: number;
  second_claim_fee: number;
  uk_athletics_affiliation_fee: number; // NEW
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

---

## TASK 3: Update Admin Settings Modal

### File: `src/modules/admin/components/EAApplicationSettingsModal.tsx`

Add UK Athletics fee field in the Membership Fees section:

```tsx
{/* Membership Fees Section */}
<div style={{ marginBottom: '24px' }}>
  <h4 style={{ 
    fontSize: '16px', 
    fontWeight: '600', 
    color: 'var(--gray-900)', 
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--gray-200)'
  }}>
    Membership Fees
  </h4>
  
  <div className="form-group">
    <label className="form-label" htmlFor="firstClaimFee">
      1st Claim Fee
    </label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '18px', fontWeight: '500' }}>£</span>
      <input
        type="number"
        id="firstClaimFee"
        name="firstClaimFee"
        value={formData.firstClaimFee}
        onChange={handleInputChange}
        className="form-input"
        step="0.01"
        min="0"
        required
        style={{ width: '120px' }}
      />
    </div>
  </div>

  <div className="form-group">
    <label className="form-label" htmlFor="secondClaimFee">
      2nd Claim Fee
    </label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '18px', fontWeight: '500' }}>£</span>
      <input
        type="number"
        id="secondClaimFee"
        name="secondClaimFee"
        value={formData.secondClaimFee}
        onChange={handleInputChange}
        className="form-input"
        step="0.01"
        min="0"
        required
        style={{ width: '120px' }}
      />
    </div>
  </div>

  {/* NEW FIELD */}
  <div className="form-group">
    <label className="form-label" htmlFor="ukAthleticsAffiliationFee">
      UK Athletics Affiliation Fee (included in 1st Claim)
    </label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '18px', fontWeight: '500' }}>£</span>
      <input
        type="number"
        id="ukAthleticsAffiliationFee"
        name="ukAthleticsAffiliationFee"
        value={formData.ukAthleticsAffiliationFee}
        onChange={handleInputChange}
        className="form-input"
        step="0.01"
        min="0"
        required
        style={{ width: '120px' }}
      />
    </div>
    <small style={{ color: 'var(--gray-600)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
      This fee is shown in the membership information card
    </small>
  </div>
</div>
```

Update state management:
```typescript
const [formData, setFormData] = useState({
  // ... existing fields ...
  firstClaimFee: settings?.first_claim_fee || 30.00,
  secondClaimFee: settings?.second_claim_fee || 12.00,
  ukAthleticsAffiliationFee: settings?.uk_athletics_affiliation_fee || 19.00, // NEW
});
```

---

## TASK 4: Update Club Membership Page

### File: `src/modules/membership/components/AffiliatedMemberApplicationForm.tsx`
(Or whatever the main Club Membership page component is called)

**Restructure the page to show informational cards based on membership status:**

```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { 
  getApplicationSettings, 
  getCurrentMembershipYear,
  getMemberApplication 
} from '../services/affiliatedMemberService';
import { EAApplicationSettings, AffiliatedMemberApplication } from '../../../types/affiliatedMember';

export const ClubMembershipPage: React.FC = () => {
  const { state } = useAuth();
  const [settings, setSettings] = useState<EAApplicationSettings | null>(null);
  const [currentYear, setCurrentYear] = useState<string>('');
  const [pendingApplication, setPendingApplication] = useState<AffiliatedMemberApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [state.member?.id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const year = await getCurrentMembershipYear();
      setCurrentYear(year);
      
      const settingsData = await getApplicationSettings(year);
      setSettings(settingsData);

      if (state.member?.id) {
        const app = await getMemberApplication(state.member.id, year);
        setPendingApplication(app);
      }
    } catch (error) {
      console.error('Failed to load membership data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isAffiliated = state.member?.is_paid_member;
  const eaYear = state.member?.ea_affiliation_year;

  if (isLoading) {
    return <div className="card"><div className="card-content">Loading...</div></div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>Club Membership</h1>

      {/* CASE 1: Not affiliated, no pending application */}
      {!isAffiliated && !pendingApplication && (
        <>
          <MembershipInformationCard settings={settings} />
          {settings?.applications_open && (
            <div style={{ marginTop: '24px' }}>
              <button 
                className="btn btn-primary"
                onClick={() => {/* Navigate to application form or show form below */}}
                style={{ fontSize: '16px', padding: '12px 24px' }}
              >
                Apply for Membership
              </button>
            </div>
          )}
          {!settings?.applications_open && (
            <div className="card" style={{ marginTop: '24px', backgroundColor: '#fef3c7' }}>
              <div className="card-content">
                <p style={{ color: '#92400e', margin: 0 }}>
                  Applications are currently closed. Please check back later.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* CASE 2: Affiliated member */}
      {isAffiliated && (
        <AffiliatedMemberCard 
          membershipType={state.member?.ea_membership_type}
          eaUrn={state.member?.ea_urn}
          eaYear={eaYear}
        />
      )}

      {/* CASE 3: Pending application */}
      {!isAffiliated && pendingApplication && (
        <PendingApplicationCard application={pendingApplication} />
      )}

      {/* Application form would go below if showing */}
    </div>
  );
};
```

---

## TASK 5: Create Membership Information Card Component

### File: `src/modules/membership/components/MembershipInformationCard.tsx`

```tsx
import React from 'react';
import { EAApplicationSettings } from '../../../types/affiliatedMember';

interface MembershipInformationCardProps {
  settings: EAApplicationSettings | null;
}

export const MembershipInformationCard: React.FC<MembershipInformationCardProps> = ({ settings }) => {
  const firstClaimFee = settings?.first_claim_fee || 30;
  const ukAthleticsFee = settings?.uk_athletics_affiliation_fee || 19;
  const clubFee = firstClaimFee - ukAthleticsFee;

  return (
    <div className="card">
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
          marginBottom: '16px',
          borderLeft: '4px solid var(--red-primary)'
        }}>
          <p style={{ 
            margin: '0 0 12px 0', 
            fontWeight: '600',
            color: 'var(--gray-900)'
          }}>
            Our membership year runs from April to March for a single annual payment
          </p>
          <p style={{ margin: '0 0 12px 0', color: 'var(--gray-700)' }}>
            <strong>FULL membership is £{firstClaimFee.toFixed(2)} per annum.</strong> This fee includes UK Athletics affiliation fee (£{ukAthleticsFee.toFixed(2)}) with the remaining £{clubFee.toFixed(2)} used to train run leaders and coaches, and ensure we have all policies, processes and equipment in place to support you.
          </p>
          <p style={{ margin: 0, color: 'var(--gray-700)', fontStyle: 'italic' }}>
            Run Alcester is a not for profit club - all funds are invested back into the club.
          </p>
        </div>
      </div>
    </div>
  );
};
```

---

## TASK 6: Create Affiliated Member Card Component

### File: `src/modules/membership/components/AffiliatedMemberCard.tsx`

```tsx
import React from 'react';

interface AffiliatedMemberCardProps {
  membershipType?: 'first_claim' | 'second_claim';
  eaUrn?: string;
  eaYear?: string;
}

export const AffiliatedMemberCard: React.FC<AffiliatedMemberCardProps> = ({ 
  membershipType, 
  eaUrn, 
  eaYear 
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">✅ Your Membership Status</h3>
      </div>
      <div className="card-content">
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
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)' }}>
              {eaUrn || 'Not set'}
            </div>
          </div>
        </div>

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
          
          <div style={{ marginBottom: '12px' }}>
            <a 
              href="https://myathleticsportal.englandathletics.org/Account/Login" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ 
                display: 'inline-block',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '8px 16px'
              }}
            >
              🔗 My Athletics Portal (Login)
            </a>
          </div>

          <div>
            <a 
              href="https://www.englandathletics.org/take-part/athlete-registration/benefits/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ 
                display: 'inline-block',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '8px 16px'
              }}
            >
              📋 Membership Benefits Information
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## TASK 7: Update Service Layer

### File: `src/modules/membership/services/affiliatedMemberService.ts`

Ensure the service correctly loads the `uk_athletics_affiliation_fee` field:

```typescript
// No changes needed if using SELECT * for settings
// But if explicitly selecting fields, add:
const { data, error } = await supabase
  .from('ea_application_settings')
  .select(`
    id,
    membership_year,
    applications_open,
    open_date,
    close_date,
    marathon_ballot_deadline,
    first_claim_fee,
    second_claim_fee,
    uk_athletics_affiliation_fee,
    notes,
    created_at,
    updated_at
  `)
  .eq('membership_year', year)
  .single();
```

---

## Implementation Summary

### What Changes:
1. **Database:** Add `uk_athletics_affiliation_fee` column to settings table
2. **Types:** Add field to `EAApplicationSettings` interface
3. **Admin Settings:** Add UK Athletics fee input field
4. **Club Membership Page:** Restructure to show appropriate cards
5. **New Components:** 
   - `MembershipInformationCard` - for non-members
   - `AffiliatedMemberCard` - for affiliated members

### What Stays the Same:
- Application form itself (just shown after information card)
- Application submission logic
- Admin confirmation workflows
- Dashboard integration

---

## Testing Checklist

### Admin Settings:
- [ ] UK Athletics fee field visible in settings modal
- [ ] Can edit UK Athletics fee
- [ ] Fee saves correctly
- [ ] Fee validation (must be > 0)

### Club Membership Page (Non-Member):
- [ ] Shows "Why Become a Member?" card
- [ ] Displays 3 benefits in bullet points
- [ ] Shows link to EA benefits page (opens in new tab)
- [ ] Shows membership year information (April to March)
- [ ] Calculates and displays correct fees (£30 total, £19 EA, remaining to club)
- [ ] Shows "Apply for Membership" button if window open
- [ ] Shows "Applications closed" message if window closed
- [ ] EA benefits link works and opens in new tab

### Club Membership Page (Affiliated Member):
- [ ] Shows "Your Membership Status" card
- [ ] Displays membership year correctly
- [ ] Displays membership type (1st Claim / 2nd Claim)
- [ ] Displays EA URN
- [ ] Shows "My Athletics Portal" link (opens in new tab)
- [ ] Shows "Membership Benefits" link (opens in new tab)
- [ ] Both links work correctly

### Fee Calculations:
- [ ] Club fee = First claim fee - UK Athletics fee
- [ ] If first claim = £30, UK Athletics = £19, shows "remaining £11"
- [ ] Updates dynamically if admin changes fees

---

## Notes

- Keep the application form component separate - it's shown after the information card when user clicks "Apply"
- Consider adding a "Renew Membership" section to the affiliated member card during renewal periods (Feb-March)
- The UK Athletics fee might change annually, so making it configurable is important
- All external links should open in new tabs (`target="_blank" rel="noopener noreferrer"`)

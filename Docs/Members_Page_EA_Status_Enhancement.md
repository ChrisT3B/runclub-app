# Members Page - EA Affiliation Status Enhancement

## Overview
Add EA affiliation status column to the Members page so admins can quickly see which members are affiliated and their membership details.

---

## File to Modify
`src/modules/admin/components/MemberList.tsx`

---

## Changes Required

### 1. Add EA Affiliation Column to Table

**Current table columns:**
| Actions | Name | Email | Status | Access Level | DBS Status | Joined |

**New table columns:**
| Actions | Name | Email | Status | Access Level | EA Affiliation | DBS Status | Joined |

### 2. Column Header

Add header between "Access Level" and "DBS Status":

```tsx
<th className="member-table__header-cell">EA Affiliation</th>
```

### 3. Column Data Cell

Add cell between Access Level and DBS Status columns:

```tsx
<td className="member-table__cell">
  {member.is_paid_member ? (
    <div>
      <span style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        background: '#dcfce7',
        color: '#166534'
      }}>
        ✓ Affiliated
      </span>
      {member.ea_affiliation_year && (
        <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
          {member.ea_affiliation_year}
        </div>
      )}
      {member.ea_membership_type && (
        <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
          {member.ea_membership_type === 'first_claim' ? '1st Claim' : '2nd Claim'}
        </div>
      )}
    </div>
  ) : (
    <span style={{
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      background: '#f3f4f6',
      color: '#6b7280'
    }}>
      Not Affiliated
    </span>
  )}
</td>
```

### 4. Update Member Type Interface (if needed)

Check if `src/modules/admin/services/adminService.ts` `Member` interface includes EA fields:

```typescript
export interface Member {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  health_conditions?: string;
  membership_status: string;
  is_paid_member: boolean; // Should already exist
  ea_urn?: string; // Should already exist
  ea_membership_type?: 'first_claim' | 'second_claim'; // Add if missing
  ea_affiliation_year?: string; // Add if missing
  ea_conduct_accepted: boolean;
  access_level: string;
  dbs_expiry_date?: string;
  email_notifications_enabled?: boolean;
  date_joined?: string;
  created_at: string;
  updated_at: string;
}
```

### 5. Add Filter Option (Optional Enhancement)

Add filter to show only affiliated members:

In the filter section, add a new filter dropdown:

```tsx
{/* EA Affiliation Filter */}
<div className="form-group">
  <label className="form-label">EA Affiliation</label>
  <select
    value={filterEAStatus}
    onChange={(e) => setFilterEAStatus(e.target.value)}
    className="form-input"
  >
    <option value="all">All Members</option>
    <option value="affiliated">Affiliated Only</option>
    <option value="not-affiliated">Not Affiliated</option>
  </select>
</div>
```

Add state:
```typescript
const [filterEAStatus, setFilterEAStatus] = useState<string>('all');
```

Update filter logic:
```typescript
const filteredMembers = members.filter(member => {
  const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       member.email?.toLowerCase().includes(searchTerm.toLowerCase());
  
  const matchesStatus = (() => {
    if (filterStatus === 'members-only') {
      return member.membership_status !== 'guest';
    } else if (filterStatus === 'all') {
      return true;
    } else {
      return member.membership_status === filterStatus;
    }
  })();
  
  const matchesAccessLevel = filterAccessLevel === 'all' || member.access_level === filterAccessLevel;
  
  // NEW: EA affiliation filter
  const matchesEAStatus = (() => {
    if (filterEAStatus === 'all') return true;
    if (filterEAStatus === 'affiliated') return member.is_paid_member === true;
    if (filterEAStatus === 'not-affiliated') return member.is_paid_member !== true;
    return true;
  })();
  
  return matchesSearch && matchesStatus && matchesAccessLevel && matchesEAStatus;
});
```

Update count displays:
```typescript
const statusCounts = {
  membersOnly: members.filter(m => m.membership_status !== 'guest').length,
  all: members.length,
  active: members.filter(m => m.membership_status === 'active').length,
  pending: members.filter(m => m.membership_status === 'pending').length,
  inactive: members.filter(m => m.membership_status === 'inactive').length,
  guest: members.filter(m => m.membership_status === 'guest').length,
  // NEW: EA affiliation counts
  affiliated: members.filter(m => m.is_paid_member === true).length,
  notAffiliated: members.filter(m => m.is_paid_member !== true).length,
};
```

---

## Visual Design

### Affiliated Badge Style:
```
┌─────────────┐
│ ✓ Affiliated│  <- Green badge
│  2025-2026  │  <- Gray text, small
│  1st Claim  │  <- Gray text, small
└─────────────┘
```

### Not Affiliated Badge Style:
```
┌─────────────────┐
│ Not Affiliated  │  <- Gray badge
└─────────────────┘
```

---

## Update Member Profile Modal (Optional)

### File: `src/modules/membership/components/MemberProfileModal.tsx`

Add EA Affiliation section after Membership Information:

```tsx
{/* EA Affiliation Information */}
{member.is_paid_member && (
  <div className="card">
    <div className="card-header">
      <h3 className="card-title">EA Affiliation</h3>
    </div>
    <div className="card-content">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: 'var(--gray-700)', 
            marginBottom: '4px' 
          }}>
            Status
          </label>
          <span style={{
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '500',
            background: '#dcfce7',
            color: '#166534'
          }}>
            ✓ Affiliated
          </span>
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: 'var(--gray-700)', 
            marginBottom: '4px' 
          }}>
            Membership Year
          </label>
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: 'var(--gray-50)', 
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            {member.ea_affiliation_year || 'Not set'}
          </div>
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: 'var(--gray-700)', 
            marginBottom: '4px' 
          }}>
            Membership Type
          </label>
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: 'var(--gray-50)', 
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            {member.ea_membership_type === 'first_claim' ? '1st Claim' :
             member.ea_membership_type === 'second_claim' ? '2nd Claim' :
             'Not set'}
          </div>
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: 'var(--gray-700)', 
            marginBottom: '4px' 
          }}>
            EA URN
          </label>
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: 'var(--gray-50)', 
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            {member.ea_urn || 'Not set'}
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## CSS Updates (if needed)

Add to `src/styles/04-pages/members.css`:

```css
/* EA Affiliation badges */
.ea-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.ea-badge--affiliated {
  background: #dcfce7;
  color: #166534;
}

.ea-badge--not-affiliated {
  background: #f3f4f6;
  color: #6b7280;
}

.ea-details {
  font-size: 11px;
  color: var(--gray-500);
  margin-top: 2px;
}
```

---

## Testing Checklist

### Member List Table:
- [ ] EA Affiliation column visible
- [ ] Affiliated members show green "✓ Affiliated" badge
- [ ] Shows membership year below badge (if set)
- [ ] Shows membership type below year (1st Claim / 2nd Claim)
- [ ] Non-affiliated members show gray "Not Affiliated" badge
- [ ] Column positioned between Access Level and DBS Status
- [ ] Styling consistent with other badge columns

### Filter (if implemented):
- [ ] EA Affiliation filter dropdown visible
- [ ] "All Members" shows everyone
- [ ] "Affiliated Only" shows only is_paid_member = true
- [ ] "Not Affiliated" shows only is_paid_member = false/null
- [ ] Count displays correctly
- [ ] Works in combination with other filters

### Member Profile Modal (if updated):
- [ ] EA Affiliation section shows for affiliated members
- [ ] Shows all 4 fields (Status, Year, Type, URN)
- [ ] Does not show for non-affiliated members
- [ ] Styling consistent with other sections

### Data Display:
- [ ] Handles missing ea_affiliation_year gracefully
- [ ] Handles missing ea_membership_type gracefully
- [ ] Handles missing ea_urn gracefully
- [ ] Shows "Not set" for missing optional fields

---

## Implementation Priority

### Must Have (Core):
1. Add EA Affiliation column to member list table
2. Show affiliated status badge
3. Display year and type if available

### Nice to Have (Enhancement):
4. Add EA filter dropdown
5. Update member profile modal with EA section
6. Add CSS classes for reusable badges

---

## Notes

- The `is_paid_member` field is the source of truth for affiliation status
- All EA fields (`ea_affiliation_year`, `ea_membership_type`, `ea_urn`) are optional
- Handle cases where affiliated members might not have year/type set yet
- Consider sorting: affiliated members could appear first in the list
- This helps admins quickly identify who needs to renew or who hasn't joined yet

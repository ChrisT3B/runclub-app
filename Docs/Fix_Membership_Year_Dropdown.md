# EA Applications - Fix Membership Year Dropdown

## Problem
The membership year dropdown only shows 2025-2026 because the component is hardcoded to fetch only that year from the settings table.

**Current buggy query:**
```
/ea_application_settings?select=*&membership_year=eq.2025-2026
```

## Solution
Fetch ALL available years from `ea_application_settings` and populate the dropdown dynamically.

---

## File to Modify
The EA Applications management component (likely `AffiliatedApplicationsManagement.tsx` or similar)

---

## Changes Required

### 1. Add State for Available Years

```typescript
const [availableYears, setAvailableYears] = useState<string[]>([]);
const [selectedYear, setSelectedYear] = useState<string>('');
```

### 2. Add Function to Fetch Available Years

```typescript
const loadAvailableYears = async () => {
  try {
    const { data, error } = await supabase
      .from('ea_application_settings')
      .select('membership_year')
      .order('membership_year', { ascending: false });

    if (error) {
      console.error('Failed to load available years:', error);
      return;
    }

    const years = data.map(setting => setting.membership_year);
    setAvailableYears(years);
    
    // Set default to most recent year (first in sorted list)
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[0]);
    }
  } catch (error) {
    console.error('Error loading available years:', error);
  }
};
```

### 3. Call on Component Mount

```typescript
useEffect(() => {
  loadAvailableYears();
}, []);
```

### 4. Update the Settings Query

Change from:
```typescript
// WRONG - hardcoded year
const { data: settings } = await supabase
  .from('ea_application_settings')
  .select('*')
  .eq('membership_year', '2025-2026')
  .single();
```

To:
```typescript
// CORRECT - use selected year
const { data: settings } = await supabase
  .from('ea_application_settings')
  .select('*')
  .eq('membership_year', selectedYear)
  .single();
```

### 5. Update the Dropdown JSX

Change from:
```tsx
{/* WRONG - hardcoded */}
<select className="form-input">
  <option value="2025-2026">2025-2026</option>
</select>
```

To:
```tsx
{/* CORRECT - dynamic */}
<select 
  className="form-input"
  value={selectedYear}
  onChange={(e) => setSelectedYear(e.target.value)}
>
  {availableYears.map(year => (
    <option key={year} value={year}>
      {year}
    </option>
  ))}
</select>
```

### 6. Reload Applications When Year Changes

```typescript
useEffect(() => {
  if (selectedYear) {
    loadApplications(selectedYear);
    loadSettings(selectedYear);
  }
}, [selectedYear]);
```

---

## Testing

1. Add 2026-2027 to database (already done ✅)
2. Refresh page
3. Dropdown should show both 2025-2026 and 2026-2027
4. Selecting different year should load that year's applications
5. Settings should show correct fees for selected year

---

## Alternative Quick Fix (If you can't find the component)

Since the component was just implemented by Claude Code and you have the codebase, you can:

1. Search for the file containing `membership_year=eq.2025-2026` or `"2025-2026"`
2. Look for where the dropdown is rendered
3. Replace hardcoded year with dynamic fetching as shown above

The file is likely in:
- `src/modules/admin/components/AffiliatedApplicationsManagement.tsx`
- Or similar path under admin components

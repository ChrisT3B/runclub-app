# Work Package: Update Service to Use get_lirf_names() RPC

## Context
We've created a new Supabase RPC function `get_lirf_names()` to resolve the RLS issue preventing members from seeing Run Leader names on run cards. The SQL function has been deployed to Supabase.

## Objective
Update the service layer to call the new RPC function instead of directly querying the members table.

## Implementation Steps

### Step 1: Locate the getAvailableLirfs() function
- Find the service file containing `getAvailableLirfs()` or similar function
- This is the function that queries the members table for LIRF users
- Likely in a file like `src/services/lirf.service.ts` or `src/services/runs.service.ts`

### Step 2: Replace the direct query with RPC call
- Change from: `supabase.from('members').select(...).in('access_level', ['lirf', 'admin'])`
- Change to: `supabase.rpc('get_lirf_names')`
- The RPC returns: `{ id: UUID, full_name: TEXT }[]`

### Step 3: Update the function implementation
Replace the existing query pattern with:
```typescript
const { data, error } = await supabase.rpc('get_lirf_names');

if (error) {
  console.error('Error fetching LIRF names:', error);
  throw error;
}

return data || [];
```

### Step 4: Verify the return type matches
- The RPC returns `{ id: string, full_name: string }[]`
- Ensure any TypeScript interfaces/types align with this structure
- Update if the function was previously returning different fields

### Step 5: Check for other direct members queries for LIRFs
- Search the codebase for other places that might query members table for LIRF lists
- If found, consider using the same RPC approach for consistency
- Report back any additional locations found

### Step 6: Test the changes
- Verify member users can now see Run Leader names on run cards
- Verify admin/LIRF users still see the information correctly
- Check browser console for any errors
- Confirm the RPC is being called (check network tab if needed)

## Files to Modify
- Service file containing `getAvailableLirfs()` or equivalent (exact path TBD)
- Any other files that directly query members table for LIRF listings

## Success Criteria
- Members can see Run Leader names on scheduled run cards
- No RLS permission errors in console
- Admin and LIRF users continue to function normally
- RPC function is being called successfully
- All TypeScript types are correct

## Technical Notes
- The RPC function is `SECURITY DEFINER` so it bypasses RLS
- It only exposes LIRF/admin IDs and full names (no sensitive data)
- Function is `STABLE` (read-only, can be cached by Postgres)
- Only authenticated users can execute it

## Security Considerations
- This RPC only exposes public-facing role information (Run Leaders)
- No sensitive member data (email, phone, address) is exposed
- Access is restricted to authenticated users only
- Consistent with existing security patterns (like get_current_membership_year)

## If Issues Arise
- If RPC call fails, check Supabase logs for permission errors
- Verify the SQL function was created successfully in Supabase
- Confirm user is authenticated when calling the RPC
- Report back any unexpected errors for review
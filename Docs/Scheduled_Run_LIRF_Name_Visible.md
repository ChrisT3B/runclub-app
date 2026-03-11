# Work Package: Display Run Leader Names on Member Run Cards

## Objective
Add Run Leader name(s) display to member-facing scheduled run cards. The data and queries already exist (visible to admins/leaders), we just need to show it on the member view.

## Implementation Steps

### Step 1: Locate the member run card component
- Search for the component that renders scheduled run cards for members
- Likely in `src/components/` directory
- Look for files with names like `RunCard`, `ScheduledRunCard`, or similar
- Identify if there are separate components for member vs admin views, or if it's conditional rendering

### Step 2: Verify leader data is available
- Check the component's props/data to confirm leader information is already being passed in
- Look for fields like `leaders`, `lirf_assignments`, or similar in the data structure
- If data is present, proceed to Step 3
- If data is NOT present in member view, we'll need to trace back to the query

### Step 3: Add leader display to the UI
- Locate the section where run details are displayed (date, time, location, etc.)
- Add a new display section for Run Leader(s)
- Format the display:
  - Single leader: "Run Leader: John Smith"
  - Multiple leaders: "Run Leaders: John Smith & Jane Doe" (or comma-separated if more than 2)
  - No leader: "Run Leader: TBA"
- Use existing CSS classes to match the styling of other run details
- Position it logically with other run information (suggest near time/location)

### Step 4: Apply consistent styling
- Use the same CSS class pattern as other run detail fields
- Maintain spacing and layout consistency with existing card design
- NO inline styles - use proper CSS classes only

### Step 5: Test the changes
- View scheduled runs as a member
- Verify leader names display correctly for:
  - Runs with one leader
  - Runs with multiple leaders
  - Runs with no assigned leader
- Check responsive design on mobile viewport
- Confirm no existing functionality is broken

## Files to Modify
- Member run card component (exact path TBD in Step 1)
- Possibly associated CSS file if new classes are needed

## Success Criteria
- Members can see Run Leader name(s) on scheduled run cards
- Display formatting is clean and consistent with existing design
- All edge cases handled (no leader, single leader, multiple leaders)
- No existing functionality affected
- No inline styles used

## Notes
- This should be a minimal change - just revealing existing data
- If the data isn't already available in the member view, stop and report back before proceeding
- Preserve all existing card functionality (booking, details, etc.)
- Match the display pattern used in admin/leader views if possible
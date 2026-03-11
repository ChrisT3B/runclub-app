# Pre-Option B Implementation: Branch & Backup Work Package

## Overview
Before implementing Option B (Supabase ↔ Google Sheets two-way sync), create backups and a feature branch so the current working implementation can be restored if needed.

---

## PART 1: Create Git Feature Branch

### Step 1: Verify Current State
Check that all current work is committed:

```bash
git status
```

**Expected:** "nothing to commit, working tree clean"

**If there are uncommitted changes:**
```bash
git add .
git commit -m "Working EA application form - direct Google Sheets submission"
```

### Step 2: Create Feature Branch

```bash
# Create and switch to new branch
git checkout -b feature/ea-option-b-supabase-sync
```

This creates a new branch called `feature/ea-option-b-supabase-sync` for the Option B work.

### Step 3: Push Both Branches

```bash
# Push main branch (current working version)
git checkout main
git push origin main

# Push feature branch (where Option B work will happen)
git checkout feature/ea-option-b-supabase-sync
git push origin feature/ea-option-b-supabase-sync
```

### Step 4: Verify Branches Exist

```bash
# List all branches
git branch -a
```

**Expected output:**
```
  main
* feature/ea-option-b-supabase-sync
  remotes/origin/main
  remotes/origin/feature/ea-option-b-supabase-sync
```

---

## PART 2: Backup Google Sheet

### Step 1: Copy the Sheet

1. Open Google Sheets
2. Navigate to: "Run Alcester Adult Membership 2026 – 2027 (Responses)"
3. Click: **File → Make a copy**
4. In the dialog:
   - Name: `Run Alcester Adult Membership 2026 – 2027 (Responses) - BACKUP v1`
   - Location: Choose your Google Drive location
5. Click **"Make a copy"**

### Step 2: Organize Backup (Optional but Recommended)

1. In Google Drive, create a folder: **"Backups"** or **"Archive"**
2. Move the backup copy into this folder
3. Add a note to the backup sheet description:
   - Right-click sheet → Details
   - Add description: "Backup before implementing Option B (Supabase sync) - Created [DATE]"

### Step 3: Test Backup

1. Open the backup sheet
2. Verify all data is present
3. Check that it has the same structure (columns A-Z)
4. Verify sample data rows are intact

---

## PART 3: Tag Google Apps Script Version

### Step 1: Open Apps Script

1. Open your original Google Sheet (not the backup)
2. Click: **Extensions → Apps Script**

### Step 2: Save Current Version

1. In Apps Script editor, click the **clock icon** (⏱️) at the top (Versions/Executions)
2. Click **"Manage versions"** or **"Version history"**
3. Find the current version
4. Click **"Name version"** or add a description
5. Name it: **"v1.0 - Direct Google Sheets submission (working)"**
6. Save

This creates a named version you can revert to if needed.

### Step 3: Note the Version Number

Write down or save the version number (e.g., "Version 5") for reference.

---

## PART 4: Document Current Configuration

### Create a backup document with current settings:

Create a file: `BACKUP_CONFIG.md` in your project root:

```markdown
# EA Application System - Backup Configuration

**Date:** [Current Date]
**Branch:** main
**Status:** Working - Direct Google Sheets submission

## Current Setup

### Frontend (.env.local)
```
VITE_GOOGLE_SHEETS_URL=[your-apps-script-url]
VITE_GOOGLE_SHEETS_TOKEN=[your-secret-token]
```

### Google Sheet
- **Name:** Run Alcester Adult Membership 2026 – 2027 (Responses)
- **Tab Name:** Form responses 1
- **Columns:** A-Z (25 columns)
- **Backup Location:** [Google Drive folder path]

### Apps Script
- **Version:** [Version number from Part 3]
- **Deployment ID:** [From Deploy info]
- **Function:** doPost() - receives form submissions
- **Authentication:** SECRET_TOKEN in Script Properties

### Workflow
1. Member submits form in app
2. Frontend posts to Google Apps Script
3. Apps Script validates token
4. Apps Script writes to Google Sheet
5. Admin processes in Google Sheet

## Revert Instructions

If Option B fails and you need to revert:

1. **Code:**
   ```bash
   git checkout main
   git push origin main --force
   ```

2. **Google Sheet:**
   - Restore from backup copy
   - Or continue using backup as primary

3. **Apps Script:**
   - Open Apps Script
   - Go to Version history
   - Revert to v1.0

4. **Environment:**
   - Restore .env.local from this document
   - Redeploy to Vercel

## Testing Checklist After Revert
- [ ] Form submission works
- [ ] Data appears in Google Sheet
- [ ] Admin can view/edit in sheet
- [ ] No console errors
```

Save this file and commit it:

```bash
git add BACKUP_CONFIG.md
git commit -m "Add backup configuration documentation"
git push origin main
```

---

## PART 5: Verification Checklist

Before proceeding to Option B implementation, verify:

- [ ] **Git:** Both `main` and `feature/ea-option-b-supabase-sync` branches exist
- [ ] **Git:** All current work is committed and pushed
- [ ] **Git:** Currently on `feature/ea-option-b-supabase-sync` branch
- [ ] **Google Sheet:** Backup copy created and verified
- [ ] **Google Sheet:** Backup moved to safe location
- [ ] **Apps Script:** Version tagged as v1.0
- [ ] **Documentation:** BACKUP_CONFIG.md created with all settings
- [ ] **Documentation:** Can locate Apps Script deployment URL
- [ ] **Documentation:** Have copy of secret token
- [ ] **Testing:** Current system still works (submit a test application)

---

## PART 6: Ready for Option B

Once all checkboxes above are complete:

✅ **You're on the feature branch** - All Option B work stays isolated
✅ **Backups exist** - Can revert if needed
✅ **Documentation complete** - Know exactly how to restore

**Next Step:** Proceed to Option B implementation work package.

---

## Quick Revert Guide (If Needed Later)

### If Option B doesn't work and you need to go back:

**1. Restore Code:**
```bash
# Switch back to main
git checkout main

# If you want to delete the feature branch
git branch -D feature/ea-option-b-supabase-sync
git push origin --delete feature/ea-option-b-supabase-sync
```

**2. Restore Google Sheet:**
- Use the backup copy you created
- Or revert to Apps Script v1.0

**3. Restore Environment:**
- Check BACKUP_CONFIG.md for .env.local values
- Redeploy to Vercel with original settings

**4. Test:**
- Submit a test application
- Verify it appears in Google Sheet
- Confirm admin can process

---

## Notes

- **Don't delete the backup** until Option B is fully tested and stable
- **Keep BACKUP_CONFIG.md** updated if you make changes to main branch
- **Test the current system** one more time before starting Option B
- **Option B work** happens entirely on the feature branch
- **Main branch** remains untouched and working

---

## Success Criteria

This work package is complete when:
- ✅ Feature branch created and pushed
- ✅ Google Sheet backed up and verified
- ✅ Apps Script version tagged
- ✅ Configuration documented
- ✅ All verification checks passed
- ✅ Current system tested and confirmed working
- ✅ Ready to begin Option B implementation

---

## Estimated Time

- Part 1 (Git): 5 minutes
- Part 2 (Google Sheet backup): 3 minutes
- Part 3 (Apps Script version): 2 minutes
- Part 4 (Documentation): 5 minutes
- Part 5 (Verification): 5 minutes

**Total: ~20 minutes**

---

## Questions to Answer Before Proceeding

Before starting Option B implementation, confirm:

1. ✅ Is the current system working as expected?
2. ✅ Have you tested a submission end-to-end?
3. ✅ Are admins happy with the current Google Sheet structure?
4. ✅ Do you have time to implement and test Option B?
5. ✅ Are you comfortable reverting if needed?

If all answers are YES, proceed to Option B implementation work package.

# Quick Start - Week 1 Features

This guide gets you up and running with the Week 1 features in 5 minutes.

## Step 1: Install Dependencies (1 min)

```bash
npm install --save-dev tsx csv-parse
```

## Step 2: Set Up Database (2 min)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Copy contents of `database/migrations/001_pending_invitations.sql`
3. Paste and run
4. Verify success (no errors)

## Step 3: Configure Environment (1 min)

```bash
# Copy example file
cp .env.example .env.local

# Edit .env.local with your values
# IMPORTANT: Set SUPABASE_SERVICE_KEY (from Supabase Settings > API)
```

## Step 4: Test Import (1 min)

```bash
# Create test CSV
echo "full_name,email,phone,emergency_contact_name,emergency_contact_phone
Test User,test@example.com,07123456789,Test Contact,07987654321" > test.csv

# Import
npm run import-invitations ./test.csv
```

✅ You should see: "✓ Imported: test@example.com"

## Step 5: Verify in App

1. Start dev server: `npm run dev`
2. Login as admin
3. Go to **Reports** in sidebar
4. Check "Pending Invitations" table
5. See your test user

---

## What You Get

### 1. Admin Reports Dashboard
**Access:** Dashboard → Reports (admin only)

**Features:**
- Registration statistics
- Active user metrics
- 7-day LIRF assignment look-ahead
- Manage pending invitations

### 2. Member Invitation System
**Import members:**
```bash
npm run import-invitations ./members.csv
```

**Send emails:**
```bash
npm run send-invitations
```

**Registration:**
- Members receive email with unique link
- Form auto-fills their data
- One-click registration

### 3. Help Videos Page
**Access:** Dashboard → Help Videos (all users)

**Update video IDs:**
Edit `src/modules/help/pages/HelpVideos.tsx`:
```typescript
youtubeId: 'YOUR_VIDEO_ID'
```

---

## Production Launch Checklist

Before January 1st launch:

- [ ] Database migration run in production Supabase
- [ ] Environment variables set in hosting platform
- [ ] Production CSV prepared with all 70 members
- [ ] Test invitation sent to yourself
- [ ] Help videos uploaded to YouTube
- [ ] Video IDs updated in code
- [ ] Test on mobile device
- [ ] Backup database

On January 1st:

```bash
# 1. Import members
npm run import-invitations ./production-members.csv

# 2. Send invitations (waits 5 seconds for confirmation)
npm run send-invitations

# 3. Monitor in Reports dashboard
```

---

## Common Commands

```bash
# Development
npm run dev                              # Start dev server

# Production
npm run build                            # Build for production
npm run preview                          # Preview production build

# Invitations
npm run import-invitations ./file.csv   # Import members
npm run send-invitations                 # Send emails
npm run send-invitations -- --no-confirm # Auto-send (no wait)

# Code quality
npm run lint                             # Check for errors
```

---

## Need Help?

- 📖 Full guide: [Docs/Week1_Implementation_Guide.md](Docs/Week1_Implementation_Guide.md)
- 📝 Summary: [Docs/Week1_Summary.md](Docs/Week1_Summary.md)
- 🔧 Script docs: [scripts/README.md](scripts/README.md)
- 🎯 Original spec: [Docs/Week1_work_package.md](Docs/Week1_work_package.md)

**Email:** runalcester@gmail.com

---

## Troubleshooting

### Import fails with "Missing environment variables"
→ Check `.env.local` has `SUPABASE_SERVICE_KEY`

### "Table doesn't exist" error
→ Run database migration in Supabase SQL editor

### Email sending fails
→ Verify Gmail app password in `.env.local`

### Reports page shows "Access Denied"
→ Login as admin user (check `members.access_level = 'admin'`)

### Help videos don't load
→ Update `youtubeId` values in `HelpVideos.tsx`

---

**Last Updated:** January 8, 2025
**Status:** ✅ Ready for Production

# Run Alcester Scripts

This directory contains Node.js scripts for administrative tasks.

## Available Scripts

### 1. Import Invitations

Imports member data from a CSV file and generates invitation tokens.

**Usage:**
```bash
npm run import-invitations <path-to-csv>
```

**Example:**
```bash
npm run import-invitations ./members.csv
```

**CSV Format:**
```csv
full_name,email,phone,emergency_contact_name,emergency_contact_phone
John Smith,john@example.com,07123456789,Jane Smith,07987654321
Sarah Jones,sarah@example.com,07234567890,Mike Jones,07345678901
```

**Required Columns:**
- `full_name` - Member's full name
- `email` - Member's email address (must be unique)

**Optional Columns:**
- `phone` - Phone number
- `emergency_contact_name` - Emergency contact name
- `emergency_contact_phone` - Emergency contact phone

**What It Does:**
1. Reads CSV file
2. Validates data
3. Generates unique tokens (64-character hex strings)
4. Inserts records into `pending_invitations` table
5. Creates JSON file with results and invitation links

**Output:**
- Console log of progress
- JSON file: `import-results-[timestamp].json` with all invitation links

**Environment Variables Required:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (admin access)
- `VITE_APP_URL` - Application URL for generating links

---

### 2. Send Invitations

Sends invitation emails to all pending invitations.

**Usage:**
```bash
npm run send-invitations
```

**With auto-confirm (skip 5-second delay):**
```bash
npm run send-invitations -- --no-confirm
```

**What It Does:**
1. Fetches all pending invitations from database
2. Generates HTML email for each invitation
3. Sends emails via API endpoint
4. Rate limits to 1 email per second
5. Creates JSON file with send results

**Output:**
- Console log of email sending progress
- JSON file: `email-results-[timestamp].json` with delivery status

**Environment Variables Required:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `VITE_APP_URL` - Application URL for registration links
- `VITE_API_URL` - API endpoint for email sending

**Important Notes:**
- Gmail has a 500 emails/day limit for free accounts
- Script rate-limits to 1 email/second to avoid triggering spam filters
- For 70 members, expect ~70 seconds to complete
- Always test with a small batch first

---

## Setup

### Install Dependencies

```bash
npm install --save-dev tsx csv-parse
```

The scripts use:
- `tsx` - TypeScript execution
- `csv-parse` - CSV parsing
- `@supabase/supabase-js` - Database access
- `crypto` - Token generation (Node.js built-in)

### Environment Configuration

Create `.env.local` file in project root:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key  # IMPORTANT: Never commit this!

# Email (if using Gmail SMTP directly)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# App URL
VITE_APP_URL=https://app.runalcester.co.uk

# API Endpoint
VITE_API_URL=https://runclub-app.vercel.app/api
```

### Security Warning

**NEVER commit the SUPABASE_SERVICE_KEY to Git!**

The service key has full database access. Only use it in:
- These scripts (Node.js server-side)
- Backend API routes
- Server-side functions

Do NOT expose it in:
- Frontend code
- Public repositories
- Documentation
- Client-side JavaScript

---

## Testing

### Test Import with Small Dataset

Create a test CSV:
```bash
echo "full_name,email,phone,emergency_contact_name,emergency_contact_phone
Test User,test@example.com,07123456789,Test Contact,07987654321" > test.csv

npm run import-invitations ./test.csv
```

Verify in Supabase:
```sql
SELECT * FROM pending_invitations WHERE email = 'test@example.com';
```

### Test Email Sending

1. Import test invitation (see above)
2. Run send script:
```bash
npm run send-invitations
```
3. Check your email inbox
4. Verify invitation link works

### Clean Up Test Data

```sql
DELETE FROM pending_invitations WHERE email = 'test@example.com';
```

---

## Troubleshooting

### Import Script Issues

**"Missing environment variables"**
- Check `.env.local` has all required variables
- Verify `SUPABASE_SERVICE_KEY` is set

**"File not found"**
- Use absolute path to CSV file
- Check file exists: `ls -la members.csv`

**"duplicate key value violates unique constraint"**
- Email already exists in database
- Check for duplicate emails in CSV
- Query database: `SELECT email FROM pending_invitations;`

**"CSV parse error"**
- Verify CSV format is correct
- Check for missing columns
- Ensure no extra commas or quotes

### Email Sending Issues

**"Invalid login: 535-5.7.8"**
- Gmail app password is incorrect
- Regenerate in Google Account > Security > App Passwords
- Ensure 2FA is enabled on Google account

**"Daily sending quota exceeded"**
- Gmail free accounts: 500 emails/day limit
- Wait 24 hours or upgrade to Google Workspace
- Consider batch sending over multiple days

**"API endpoint error"**
- Verify `VITE_API_URL` is correct
- Check API is deployed and accessible
- Test API endpoint manually

**Emails going to spam**
- Use Gmail with proper SPF/DKIM setup
- Include unsubscribe link (already in template)
- Avoid spam trigger words
- Send smaller batches

---

## Production Workflow

### Phase 1: Import Members

1. Prepare production CSV with all 70 members
2. Backup database first
3. Test with 5 members:
```bash
head -6 members.csv > test-batch.csv  # Header + 5 rows
npm run import-invitations ./test-batch.csv
```
4. Verify in Reports dashboard
5. Import remaining members:
```bash
npm run import-invitations ./members.csv
```
6. Save `import-results-*.json` file securely

### Phase 2: Send Invitations (January 1st)

1. Verify all invitations are pending:
```sql
SELECT COUNT(*) FROM pending_invitations WHERE status = 'pending';
```
2. Send batch:
```bash
npm run send-invitations
```
3. Monitor progress in terminal
4. Save `email-results-*.json` file
5. Check Reports dashboard for status

### Phase 3: Monitor & Resend

1. Check Reports dashboard daily
2. Use "Resend" button for individual members
3. Monitor registration rate
4. Follow up with non-registrants after 1 week

---

## Advanced Usage

### Import Specific Columns Only

Modify CSV to include only required columns:
```csv
full_name,email
John Smith,john@example.com
Sarah Jones,sarah@example.com
```

Script will set optional fields to `null`.

### Dry Run (No Database Insert)

To test without inserting:
1. Comment out the `supabase.from('pending_invitations').insert()` line
2. Run script to validate CSV
3. Uncomment before actual import

### Custom Token Length

Edit `import-invitations.ts`:
```typescript
// Change from 32 bytes (64 hex chars) to 16 bytes (32 hex chars)
const token = crypto.randomBytes(16).toString('hex');
```

### Batch Email Sending

To send in batches of 50:
```typescript
// In send-invitations.ts, add LIMIT to query:
const { data: invitations } = await supabase
  .from('pending_invitations')
  .select('*')
  .eq('status', 'pending')
  .limit(50);
```

---

## File Outputs

### import-results-[timestamp].json

```json
[
  {
    "email": "john@example.com",
    "success": true,
    "token": "abc123...",
    "invitationLink": "https://app.runalcester.co.uk/register?token=abc123..."
  },
  {
    "email": "invalid@example.com",
    "success": false,
    "error": "duplicate key value violates unique constraint"
  }
]
```

### email-results-[timestamp].json

```json
[
  {
    "email": "john@example.com",
    "success": true
  },
  {
    "email": "sarah@example.com",
    "success": false,
    "error": "Connection timeout"
  }
]
```

---

## Support

For issues:
1. Check Troubleshooting section above
2. Review logs in console output
3. Check Supabase logs
4. Verify environment variables
5. Contact: runalcester@gmail.com

---

**Last Updated:** January 8, 2025

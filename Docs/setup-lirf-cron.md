# LIRF Reminder Server-Side Cron Job - Work Package

## Objective
Set up a server-side Vercel cron job that runs every Friday at 9 AM to send LIRF reminder emails. This replaces the client-side hourly scheduler with a proper server-side solution.

## Context
- The LIRF reminder system is fully implemented and tested
- Currently uses client-side scheduler (inefficient - checks hourly)
- Need server-side cron that runs once per week on Fridays
- Vercel free plan supports cron jobs via `vercel.json`
- Supabase provides the backend data and email endpoint

## Architecture
```
Vercel Cron (Fridays 9 AM)
    ↓
API Route: /api/lirf-reminder
    ↓
Query Supabase for runs & recipients
    ↓
Send emails via existing /api/send-email endpoint
    ↓
Log results
```

## Implementation Steps

### Step 1: Create Vercel API Route

**File:** `api/lirf-reminder.js` (create this new file)
```javascript
// api/lirf-reminder.js
// Vercel serverless function to send weekly LIRF reminder emails

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Security: Verify this is a cron job request
  const authHeader = req.headers.authorization;
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Unauthorized cron attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🚀 Starting weekly LIRF reminder cron job...');

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get runs in next 7 days requiring LIRF
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    const { data: runs, error: runsError } = await supabase
      .from('scheduled_runs')
      .select('*')
      .gte('run_date', todayStr)
      .lte('run_date', sevenDaysStr)
      .eq('run_status', 'scheduled')
      .order('run_date', { ascending: true })
      .order('run_time', { ascending: true });

    if (runsError) {
      throw new Error(`Failed to fetch runs: ${runsError.message}`);
    }

    // Filter runs needing LIRF
    const runsRequiringLirf = (runs || [])
      .map(run => {
        let assignedCount = 0;
        if (run.assigned_lirf_1) assignedCount++;
        if (run.assigned_lirf_2) assignedCount++;
        if (run.assigned_lirf_3) assignedCount++;

        return {
          ...run,
          lirf_vacancies: run.lirfs_required - assignedCount
        };
      })
      .filter(run => run.lirf_vacancies > 0);

    console.log(`📊 Found ${runsRequiringLirf.length} runs requiring LIRF`);

    // Get all LIRF/Admin recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('members')
      .select('id, email, full_name')
      .in('access_level', ['lirf', 'admin'])
      .eq('membership_status', 'active')
      .order('full_name', { ascending: true });

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    console.log(`👥 Found ${recipients?.length || 0} LIRF/Admin recipients`);

    if (!recipients || recipients.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No LIRF/Admin recipients found',
        recipientCount: 0,
        runsRequiringLirf: runsRequiringLirf.length
      });
    }

    // Send emails by calling the existing /api/send-email endpoint
    // We'll use the email service directly here
    let emailsSent = 0;
    let emailsFailed = 0;
    const errors = [];

    for (const recipient of recipients) {
      try {
        // Generate email content
        const subject = runsRequiringLirf.length > 0 
          ? `🏃‍♂️ LIRF Reminder: ${runsRequiringLirf.length} run${runsRequiringLirf.length !== 1 ? 's' : ''} need assignment`
          : '✅ LIRF Reminder: All runs covered';

        const htmlContent = generateReminderEmailHTML(recipient.full_name, runsRequiringLirf);
        const textContent = generateReminderEmailText(recipient.full_name, runsRequiringLirf);

        // Call the email endpoint
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: recipient.email,
            from: 'Run Alcester Bookings <bookings.runalcester@gmail.com>',
            subject: subject,
            html: htmlContent,
            text: textContent
          })
        });

        if (emailResponse.ok) {
          emailsSent++;
          console.log(`✅ Email sent to ${recipient.full_name}`);
        } else {
          emailsFailed++;
          errors.push(`Failed to send to ${recipient.full_name}`);
        }

        // Delay between emails to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        emailsFailed++;
        errors.push(`Error sending to ${recipient.full_name}: ${error.message}`);
        console.error(`❌ Failed to send to ${recipient.email}:`, error);
      }
    }

    console.log(`✅ LIRF reminder cron complete: ${emailsSent} sent, ${emailsFailed} failed`);

    return res.status(200).json({
      success: true,
      recipientCount: recipients.length,
      runsRequiringLirf: runsRequiringLirf.length,
      emailsSent,
      emailsFailed,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ LIRF reminder cron failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Email generation functions
function generateReminderEmailHTML(recipientName, runs) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const runsHTML = runs.map(run => {
    const runDate = new Date(run.run_date);
    const formattedRunDate = runDate.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });

    const runUrl = `https://app.runalcester.co.uk/runs/${run.id}`;

    return `
      <div style="background: #f9fafb; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 12px; border-radius: 4px;">
        <div style="font-weight: 600; color: #111827; font-size: 16px; margin-bottom: 8px;">
          ${run.run_title}
        </div>
        <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          <div><strong>Date:</strong> ${formattedRunDate} at ${run.run_time}</div>
          <div><strong>Meeting Point:</strong> ${run.meeting_point}</div>
          ${run.approximate_distance ? `<div><strong>Distance:</strong> ${run.approximate_distance}</div>` : ''}
          <div style="color: #dc2626; font-weight: 600; margin-top: 8px;">
            ⚠️ LIRF Vacancies: ${run.lirf_vacancies} of ${run.lirfs_required} needed
          </div>
          <div style="margin-top: 12px;">
            <a href="${runUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: 500;">
              View & Assign LIRFs →
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">🏃‍♂️ Run Alcester</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Weekly LIRF Assignment Reminder</p>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">Hi <strong>${recipientName}</strong>,</p>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">
          This is your weekly reminder for runs requiring LIRF assignment in the next 7 days.
        </p>
        ${runs.length > 0 ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <div style="font-weight: 600; color: #dc2626; font-size: 14px; margin-bottom: 4px;">
              ⚠️ ${runs.length} run${runs.length !== 1 ? 's' : ''} requiring LIRF assignment
            </div>
            <div style="color: #991b1b; font-size: 13px;">Please review and assign LIRFs as soon as possible</div>
          </div>
          <div style="margin-bottom: 24px;">${runsHTML}</div>
        ` : `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <div style="font-weight: 600; color: #166534; font-size: 14px;">✅ All runs in the next 7 days have LIRFs assigned</div>
            <div style="color: #15803d; font-size: 13px;">Great work! No action required this week.</div>
          </div>
        `}
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://app.runalcester.co.uk" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Go to Run Alcester Dashboard
          </a>
        </div>
      </div>
      <div style="margin-top: 20px; padding: 20px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center;">
        <p style="margin: 0 0 8px 0;">This is an automated weekly reminder sent every Friday.</p>
        <p style="margin: 0;"><strong>Run Alcester</strong> | ${formattedDate}</p>
      </div>
    </body>
    </html>
  `;
}

function generateReminderEmailText(recipientName, runs) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let text = `RUN ALCESTER - WEEKLY LIRF ASSIGNMENT REMINDER\n${formattedDate}\n\n`;
  text += `Hi ${recipientName},\n\n`;
  text += `This is your weekly reminder for runs requiring LIRF assignment in the next 7 days.\n\n`;

  if (runs.length > 0) {
    text += `⚠️ ${runs.length} RUN${runs.length !== 1 ? 'S' : ''} REQUIRING LIRF ASSIGNMENT:\n\n`;
    runs.forEach((run, index) => {
      const runDate = new Date(run.run_date);
      const formattedRunDate = runDate.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
      text += `${index + 1}. ${run.run_title}\n`;
      text += `   Date: ${formattedRunDate} at ${run.run_time}\n`;
      text += `   Meeting Point: ${run.meeting_point}\n`;
      if (run.approximate_distance) text += `   Distance: ${run.approximate_distance}\n`;
      text += `   ⚠️ LIRF Vacancies: ${run.lirf_vacancies} of ${run.lirfs_required} needed\n`;
      text += `   Link: https://app.runalcester.co.uk/runs/${run.id}\n\n`;
    });
    text += `Please log in to assign LIRFs: https://app.runalcester.co.uk\n\n`;
  } else {
    text += `✅ ALL RUNS IN THE NEXT 7 DAYS HAVE LIRFs ASSIGNED\n\nGreat work! No action required this week.\n\n`;
  }

  text += `---\nThis is an automated weekly reminder sent every Friday.\nRun Alcester Booking System\n`;
  return text;
}
```

### Step 2: Configure Vercel Cron Job

**File:** `vercel.json` (create or update this file in project root)
```json
{
  "crons": [{
    "path": "/api/lirf-reminder",
    "schedule": "0 9 * * 5"
  }]
}
```

**Schedule explained:**
- `0 9 * * 5` = Every Friday at 9:00 AM UTC
- Adjust timezone if needed (Vercel crons run in UTC)

### Step 3: Add Environment Variables

Add these to your Vercel project settings (Settings → Environment Variables):

**Required:**
```
CRON_SECRET=<generate-random-string>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_APP_URL=https://app.runalcester.co.uk
```

**How to generate CRON_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Install Dependencies

**File:** `package.json`

Ensure `@supabase/supabase-js` is in dependencies. If not, add it:
```bash
npm install @supabase/supabase-js
```

### Step 5: Update .gitignore

**File:** `.gitignore`

Ensure these are ignored:
```
.env
.env.local
.vercel
```

## Deployment Steps

1. **Commit changes:**
```bash
   git add api/lirf-reminder.js vercel.json
   git commit -m "feat: Add server-side LIRF reminder cron job"
   git push origin master
```

2. **Deploy to Vercel:**
   - Vercel will auto-deploy from GitHub
   - Or run: `vercel --prod`

3. **Add environment variables in Vercel dashboard**

4. **Test the endpoint manually:**
```bash
   curl -X POST https://app.runalcester.co.uk/api/lirf-reminder \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Verification

1. **Check Vercel Dashboard:**
   - Go to Project → Cron Jobs
   - Should see: `0 9 * * 5` schedule listed

2. **Check Vercel Logs:**
   - Next Friday at 9 AM, check deployment logs
   - Should see: "🚀 Starting weekly LIRF reminder cron job..."

3. **Manual Test:**
   - Use curl command above to trigger manually
   - Check emails are received

## Cleanup: Remove Client-Side Scheduler

Since we now have server-side cron, **DO NOT** add the client-side scheduler to App.tsx. The hourly checking is no longer needed.

## Success Criteria

- ✅ API route created at `/api/lirf-reminder`
- ✅ `vercel.json` configured with cron schedule
- ✅ Environment variables set in Vercel
- ✅ Manual test succeeds
- ✅ Vercel dashboard shows cron job configured
- ✅ (Wait for Friday) Emails sent automatically at 9 AM

## Troubleshooting

**If manual test fails:**
- Check CRON_SECRET matches
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check Vercel function logs

**If no emails sent on Friday:**
- Check Vercel cron job logs
- Verify timezone (cron runs in UTC)
- Test manually with curl

**If emails fail:**
- Check `/api/send-email` endpoint is working
- Verify Gmail SMTP credentials
- Check daily email limits not exceeded

## Notes

- Free Vercel plan includes cron jobs ✅
- Cron runs in UTC timezone
- Maximum 1 cron job on free plan (this is our 1)
- Logs available in Vercel dashboard for 24 hours
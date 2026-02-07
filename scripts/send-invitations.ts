import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const appUrl = process.env.VITE_APP_URL || 'https://app.runalcester.co.uk';
const apiEndpoint = process.env.VITE_API_URL || 'https://runclub-app.vercel.app/api';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing environment variables VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

async function sendInvitationEmail(
  email: string,
  fullName: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const registrationLink = `${appUrl}/register?token=${token}`;

  // Prepare email content
  const emailPayload = {
    to: email,
    subject: 'Welcome to Run Alcester - Complete Your Registration',
    html: generateInvitationHTML(fullName, registrationLink),
    text: generateInvitationText(fullName, registrationLink),
  };

  try {
    // Send email via API endpoint
    const response = await fetch(`${apiEndpoint}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Email API error: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function generateInvitationHTML(fullName: string, registrationLink: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: #4CAF50; color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; }
    .content p { margin: 0 0 15px 0; }
    .content ul { margin: 15px 0; padding-left: 20px; }
    .content li { margin: 8px 0; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; padding: 14px 28px; background: #4CAF50; color: white !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
    .important-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f9f9f9; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Run Alcester!</h1>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p>Great news! As a paid member of Run Alcester, we've set up your account in our new app.</p>
      <p>The app makes it easier to:</p>
      <ul>
        <li>Book your place on runs</li>
        <li>Track your sessions</li>
        <li>Manage your membership details</li>
        <li>Stay connected with the club</li>
      </ul>
      <p><strong>We've already added your details</strong> - you just need to complete your registration:</p>
      <div class="button-container">
        <a href="${registrationLink}" class="button">Complete Registration</a>
      </div>
      <p style="font-size: 12px; color: #666; word-break: break-all;">Or copy this link: ${registrationLink}</p>
      <div class="important-box">
        <p><strong>Important:</strong> Don't worry if you can't register right away - you can still turn up to any run as usual. Our LIRFs can add you on the day.</p>
      </div>
      <p>Need help? Watch our quick tutorial video or check out the FAQs on our website.</p>
      <p>See you on the trails!</p>
      <p><strong>The Run Alcester Team</strong></p>
    </div>
    <div class="footer">
      <p>This invitation link expires in 30 days.</p>
      <p>If you didn't expect this email, you can safely ignore it.</p>
      <p>&copy; ${new Date().getFullYear()} Run Alcester. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateInvitationText(fullName: string, registrationLink: string): string {
  return `
Welcome to Run Alcester!

Hi ${fullName},

Great news! As a paid member of Run Alcester, we've set up your account in our new app.

The app makes it easier to:
- Book your place on runs
- Track your sessions
- Manage your membership details
- Stay connected with the club

We've already added your details - you just need to complete your registration:

${registrationLink}

Important: Don't worry if you can't register right away - you can still turn up to any run as usual. Our LIRFs can add you on the day.

Need help? Watch our quick tutorial video or check out the FAQs on our website.

See you on the trails!
The Run Alcester Team

---
This invitation link expires in 30 days.
If you didn't expect this email, you can safely ignore it.
  `.trim();
}

async function sendAllInvitations() {
  console.log(`\n📧 Run Alcester - Send Invitation Emails`);
  console.log(`========================================\n`);

  try {
    // Fetch all pending invitations
    const { data: invitations, error } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching invitations:', error);
      process.exit(1);
    }

    if (!invitations || invitations.length === 0) {
      console.log('No pending invitations to send.');
      process.exit(0);
    }

    console.log(`Found ${invitations.length} pending invitations to send.\n`);

    // Confirm before sending
    if (process.argv.includes('--no-confirm')) {
      console.log('Auto-confirmed (--no-confirm flag detected)\n');
    } else {
      console.log('⚠️  WARNING: This will send emails to all pending invitations.');
      console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...\n');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const results: SendResult[] = [];
    let successCount = 0;
    let failCount = 0;

    console.log(`Starting email delivery...\n`);

    for (const invitation of invitations) {
      try {
        const result = await sendInvitationEmail(
          invitation.email,
          invitation.full_name,
          invitation.token
        );

        if (result.success) {
          console.log(`✓ Sent to ${invitation.email}`);
          results.push({ email: invitation.email, success: true });
          successCount++;
        } else {
          console.error(`✗ Failed to send to ${invitation.email}: ${result.error}`);
          results.push({ email: invitation.email, success: false, error: result.error });
          failCount++;
        }

        // Rate limiting: wait 1 second between emails to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`✗ Failed to send to ${invitation.email}:`, error.message);
        results.push({ email: invitation.email, success: false, error: error.message });
        failCount++;
      }
    }

    // Write results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = `email-results-${timestamp}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    // Print summary
    console.log(`\n========================================`);
    console.log(`📊 Email Delivery Summary`);
    console.log(`========================================`);
    console.log(`✓ Sent successfully: ${successCount}/${invitations.length}`);
    console.log(`✗ Failed: ${failCount}/${invitations.length}`);
    console.log(`📁 Results saved to: ${outputPath}\n`);

    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run script
sendAllInvitations();

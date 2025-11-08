/**
 * Email templates for Run Alcester member communications
 */

interface InvitationEmailParams {
  fullName: string;
  token: string;
  appUrl: string;
}

export function generateInvitationEmail(params: InvitationEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { fullName, token, appUrl } = params;
  const registrationLink = `${appUrl}/register?token=${token}`;

  const subject = 'Welcome to Run Alcester - Complete Your Registration';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: #4CAF50;
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
      background: white;
    }
    .content p {
      margin: 0 0 15px 0;
    }
    .content ul {
      margin: 15px 0;
      padding-left: 20px;
    }
    .content li {
      margin: 8px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: #4CAF50;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      background: #45a049;
    }
    .link-text {
      word-break: break-all;
      font-size: 12px;
      color: #666;
      margin-top: 15px;
    }
    .important-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      background: #f9f9f9;
      border-top: 1px solid #eee;
    }
    .footer p {
      margin: 5px 0;
    }
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

      <p class="link-text">Or copy this link: ${registrationLink}</p>

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

  const text = `
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

  return { subject, html, text };
}

interface ReminderEmailParams {
  fullName: string;
  token: string;
  appUrl: string;
  daysRemaining: number;
}

export function generateReminderEmail(params: ReminderEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { fullName, token, appUrl, daysRemaining } = params;
  const registrationLink = `${appUrl}/register?token=${token}`;

  const subject = `Reminder: Complete your Run Alcester registration (${daysRemaining} days left)`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: #ff9800;
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
      background: white;
    }
    .content p {
      margin: 0 0 15px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: #4CAF50;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      background: #45a049;
    }
    .urgent-box {
      background: #ffebee;
      border-left: 4px solid #f44336;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      background: #f9f9f9;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Complete Your Registration</h1>
    </div>

    <div class="content">
      <p>Hi ${fullName},</p>

      <p>This is a friendly reminder that you haven't completed your Run Alcester app registration yet.</p>

      <div class="urgent-box">
        <p><strong>Your invitation link expires in ${daysRemaining} days.</strong></p>
      </div>

      <p>Don't miss out on the benefits of the app:</p>
      <ul>
        <li>Easy run booking</li>
        <li>Session tracking</li>
        <li>Club communications</li>
      </ul>

      <div class="button-container">
        <a href="${registrationLink}" class="button">Complete Registration Now</a>
      </div>

      <p>If you're having trouble registering, please contact us and we'll be happy to help.</p>

      <p>Best regards,<br><strong>The Run Alcester Team</strong></p>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Run Alcester. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Complete Your Registration

Hi ${fullName},

This is a friendly reminder that you haven't completed your Run Alcester app registration yet.

Your invitation link expires in ${daysRemaining} days.

Don't miss out on the benefits of the app:
- Easy run booking
- Session tracking
- Club communications

Complete your registration now:
${registrationLink}

If you're having trouble registering, please contact us and we'll be happy to help.

Best regards,
The Run Alcester Team
  `.trim();

  return { subject, html, text };
}

// /api/send-email.js
// Vercel serverless function for sending emails (ES6 Module compatible)

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { to, from, subject, html, text } = req.body;

    // Validate input
    if (!to || !subject || !html) {
      console.log('❌ Missing required fields:', { to: !!to, subject: !!subject, html: !!html });
      res.status(400).json({ error: 'Missing required fields: to, subject, html' });
      return;
    }

    console.log(`📧 Vercel API: Attempting to send email to ${to}`);
    console.log(`📧 Vercel API: Subject: ${subject}`);

    // Create transporter with Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    console.log('📧 Vercel API: Transporter created successfully');

    // Send email
    const info = await transporter.sendMail({
      from: 'Run Alcester Bookings <bookings.runalcester@gmail.com>',
      to: to,
      subject: subject,
      html: html,
      text: text
    });

    console.log(`✅ Vercel API: Email sent successfully to ${to}`);
    console.log(`📧 Vercel API: Message ID: ${info.messageId}`);

    res.status(200).json({ 
      success: true, 
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('❌ Vercel API: Email sending failed:', error);
    console.error('❌ Vercel API: Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to send email',
      details: error.code || 'Unknown error'
    });
  }
}
import React from 'react'
import { Link } from 'react-router-dom'

const MAIN_POLICY_URL = 'https://www.runalcester.co.uk/_files/ugd/795936_8d30fcd1c3cf456894a51e2e7d0bacc8.pdf'

export const PrivacyPolicy: React.FC = () => {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: 'var(--red-primary)',
          margin: '0 0 8px 0',
        }}>
          Digital Privacy Addendum
        </h1>
        <p style={{
          color: 'var(--gray-500)',
          fontSize: '14px',
          margin: '0',
        }}>
          Last Updated: February 19, 2026 | Version 1.1
        </p>
      </div>

      <div className="card">
        <div className="card-content" style={{ lineHeight: '1.7' }}>

          {/* Introduction */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Introduction
            </h2>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              This page explains how we handle your personal data within our digital booking application.
              It is a supplement to our main club privacy policy and should be read alongside it.
            </p>
            <p style={{ color: 'var(--gray-700)' }}>
              For the complete Run Alcester privacy policy covering membership and club activities, please see the{' '}
              <a
                href={MAIN_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--red-primary)', textDecoration: 'underline' }}
              >
                Run Alcester Privacy Notice (PDF)
              </a>.
            </p>
          </section>

          {/* Quick Summary */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Quick Summary
            </h2>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '6px' }}>We store your data securely in encrypted EU-based databases</li>
              <li style={{ marginBottom: '6px' }}>We send automated emails for bookings and reminders</li>
              <li style={{ marginBottom: '6px' }}>We maintain security logs to protect your account</li>
              <li style={{ marginBottom: '6px' }}>Your session expires after 8 hours of inactivity</li>
              <li style={{ marginBottom: '6px' }}>EA affiliation data is shared with authorised administrators via Google Sheets for processing</li>
              <li>You have full control over your data</li>
            </ul>
          </section>

          {/* What Digital Data We Collect */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              What Digital Data We Collect
            </h2>

            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', marginBottom: '8px' }}>
              Account Security
            </h3>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0 0 16px 0' }}>
              <li style={{ marginBottom: '4px' }}>Login email address and encrypted password</li>
              <li style={{ marginBottom: '4px' }}>Session tokens for authentication</li>
              <li style={{ marginBottom: '4px' }}>Device fingerprints (for security and fraud prevention)</li>
              <li>Security logs (login attempts, timestamps, IP fingerprints)</li>
            </ul>

            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', marginBottom: '8px' }}>
              Application Usage
            </h3>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0 0 16px 0' }}>
              <li style={{ marginBottom: '4px' }}>Run booking history and attendance records</li>
              <li style={{ marginBottom: '4px' }}>Session voucher purchases and usage</li>
              <li style={{ marginBottom: '4px' }}>Payment transaction records</li>
              <li>Notification preferences</li>
            </ul>

            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', marginBottom: '8px' }}>
              Emergency Information
            </h3>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0 0 16px 0' }}>
              <li>Emergency contact name, relationship, and phone number (for safety during runs)</li>
            </ul>

            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', marginBottom: '8px' }}>
              EA Affiliation Applications
            </h3>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '4px' }}>Personal details (title, date of birth, sex at birth, nationality, address and postcode)</li>
              <li style={{ marginBottom: '4px' }}>Membership type and EA URN (if renewing)</li>
              <li style={{ marginBottom: '4px' }}>Health condition declarations and details</li>
              <li style={{ marginBottom: '4px' }}>Emergency contact details</li>
              <li style={{ marginBottom: '4px' }}>Payment reference and confirmation status</li>
              <li>Application status and processing history</li>
            </ul>
          </section>

          {/* How We Use Your Digital Data */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              How We Use Your Digital Data
            </h2>

            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', marginBottom: '8px' }}>
              System Operation
            </h3>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0 0 16px 0' }}>
              <li style={{ marginBottom: '4px' }}>Authenticating your login and maintaining your session</li>
              <li style={{ marginBottom: '4px' }}>Processing run bookings and managing session vouchers</li>
              <li style={{ marginBottom: '4px' }}>Sending automated emails (booking confirmations, reminders, password resets)</li>
              <li style={{ marginBottom: '4px' }}>Generating attendance reports for LIRFs and administrators</li>
              <li style={{ marginBottom: '4px' }}>Processing EA affiliation applications and tracking membership status</li>
              <li>Syncing application data with administrative tools for membership processing</li>
            </ul>

            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--gray-800)', marginBottom: '8px' }}>
              Security &amp; Fraud Prevention
            </h3>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '4px' }}>Detecting suspicious login activity</li>
              <li style={{ marginBottom: '4px' }}>Preventing unauthorized account access</li>
              <li style={{ marginBottom: '4px' }}>Monitoring system abuse or fraudulent bookings</li>
              <li style={{ marginBottom: '4px' }}>Account lockout after 5 failed login attempts (15-minute lockout period)</li>
              <li>Session hijacking detection through device fingerprinting</li>
            </ul>
          </section>

          {/* Digital Storage & Hosting */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Digital Storage &amp; Hosting
            </h2>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              Your data is stored securely using:
            </p>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '4px' }}><strong>Supabase</strong> — PostgreSQL database hosted in AWS EU data centres (GDPR compliant)</li>
              <li style={{ marginBottom: '4px' }}><strong>Vercel</strong> — Application hosting with EU data processing (GDPR compliant)</li>
              <li style={{ marginBottom: '4px' }}><strong>Google Workspace (Google Sheets)</strong> — EA affiliation application data is synced to Google Sheets for administrative processing. Data is stored in Google's data centres and access is restricted to authorised club administrators</li>
              <li style={{ marginBottom: '4px' }}><strong>Encryption</strong> — All data encrypted in transit (HTTPS) and at rest</li>
              <li><strong>Backups</strong> — Regular automated encrypted backups stored securely</li>
            </ul>
          </section>

          {/* Automated Communications */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Automated Communications
            </h2>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              You will receive automated emails for:
            </p>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '4px' }}>Run booking confirmations and cancellations</li>
              <li style={{ marginBottom: '4px' }}>LIRF assignment notifications (if you are a run leader)</li>
              <li style={{ marginBottom: '4px' }}>Password reset requests</li>
              <li>Important system updates and club announcements</li>
            </ul>
          </section>

          {/* Security Measures */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Security Measures
            </h2>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              We protect your account with:
            </p>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '4px' }}><strong>Password Requirements</strong> — Minimum 8 characters with complexity requirements</li>
              <li style={{ marginBottom: '4px' }}><strong>Session Security</strong> — 8-hour session expiry with automatic logout</li>
              <li style={{ marginBottom: '4px' }}><strong>Device Fingerprinting</strong> — Detects session hijacking attempts</li>
              <li style={{ marginBottom: '4px' }}><strong>Account Lockout</strong> — 15-minute lockout after 5 failed login attempts</li>
              <li style={{ marginBottom: '4px' }}><strong>Security Monitoring</strong> — All login attempts logged for security review</li>
              <li><strong>Regular Audits</strong> — Ongoing security reviews and vulnerability assessments</li>
            </ul>
          </section>

          {/* Session Management & PWA */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Session Management &amp; Progressive Web App
            </h2>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              Our app functions as a Progressive Web App (PWA):
            </p>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '4px' }}>Can be installed on your device's home screen for an app-like experience</li>
              <li style={{ marginBottom: '4px' }}>Limited data cached locally for faster performance</li>
              <li style={{ marginBottom: '4px' }}>No personal data stored permanently on your device</li>
              <li style={{ marginBottom: '4px' }}>Session expires after 8 hours of inactivity</li>
              <li>Automatic logout if device fingerprint changes</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Third-Party Services
            </h2>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              The app uses the following GDPR-compliant services:
            </p>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0 0 12px 0' }}>
              <li style={{ marginBottom: '4px' }}><strong>Supabase</strong> — Database and authentication (EU hosting)</li>
              <li style={{ marginBottom: '4px' }}><strong>Vercel</strong> — Application hosting (EU data centres)</li>
              <li style={{ marginBottom: '4px' }}><strong>Gmail SMTP</strong> — Email delivery service (Google Workspace)</li>
              <li><strong>Google Sheets</strong> — EA affiliation application processing and administration (Google Workspace)</li>
            </ul>
            <p style={{ color: 'var(--gray-700)' }}>
              All third-party processors have appropriate data processing agreements in place.
            </p>
          </section>

          {/* Data Retention */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Data Retention
            </h2>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '4px' }}><strong>Active account data</strong> — Retained while you are a member plus 1 year</li>
              <li style={{ marginBottom: '4px' }}><strong>Booking history</strong> — Retained for 3 years for attendance records</li>
              <li style={{ marginBottom: '4px' }}><strong>Payment records</strong> — Retained for 6 years (legal requirement)</li>
              <li style={{ marginBottom: '4px' }}><strong>EA affiliation applications</strong> — Retained for the duration of the membership year plus 1 year</li>
              <li style={{ marginBottom: '4px' }}><strong>Security logs</strong> — Login attempts: 7 days, security events: 30 days</li>
              <li><strong>Account deletion</strong> — When you leave the club, your account is deactivated within 30 days and all non-essential data deleted within 1 year</li>
            </ul>
          </section>

          {/* Your Rights Under GDPR */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Your Rights Under GDPR
            </h2>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              You have the following rights regarding your personal data:
            </p>
            <ul style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0 0 16px 0' }}>
              <li style={{ marginBottom: '4px' }}><strong>Right to Access</strong> — Request a copy of all data we hold about you</li>
              <li style={{ marginBottom: '4px' }}><strong>Right to Rectification</strong> — Ask us to correct inaccurate information</li>
              <li style={{ marginBottom: '4px' }}><strong>Right to Erasure</strong> — Request deletion of your data (subject to legal requirements)</li>
              <li style={{ marginBottom: '4px' }}><strong>Right to Restrict Processing</strong> — Ask us to limit how we use your data</li>
              <li style={{ marginBottom: '4px' }}><strong>Right to Data Portability</strong> — Receive your data in a portable format</li>
              <li style={{ marginBottom: '4px' }}><strong>Right to Object</strong> — Object to certain types of processing</li>
              <li><strong>Right to Withdraw Consent</strong> — Withdraw consent for processing</li>
            </ul>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:runalcester@gmail.com" style={{ color: 'var(--red-primary)', textDecoration: 'underline' }}>
                runalcester@gmail.com
              </a>.
              We will respond within one month of your request.
            </p>
            <p style={{ color: 'var(--gray-700)' }}>
              For full details of your rights, please see the{' '}
              <a
                href={MAIN_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--red-primary)', textDecoration: 'underline' }}
              >
                Run Alcester Privacy Notice (PDF)
              </a>.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Changes to This Policy
            </h2>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              We may update this digital privacy addendum to reflect changes in data protection law,
              new features in the booking app, or improvements to our security practices.
            </p>
            <p style={{ color: 'var(--gray-700)' }}>
              We will notify members of significant changes by email and via an announcement in the app.
            </p>
          </section>

          {/* Questions or Concerns */}
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '12px' }}>
              Questions or Concerns
            </h2>
            <p style={{ color: 'var(--gray-700)', marginBottom: '12px' }}>
              If you have questions about how we handle your data, contact us at{' '}
              <a href="mailto:runalcester@gmail.com" style={{ color: 'var(--red-primary)', textDecoration: 'underline' }}>
                runalcester@gmail.com
              </a>.
              We aim to respond within 5 working days.
            </p>
            <p style={{ color: 'var(--gray-700)', marginBottom: '8px' }}>
              If you are unhappy with how we have handled your data:
            </p>
            <ol style={{ color: 'var(--gray-700)', paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '4px' }}>Contact us first at the email above</li>
              <li>
                If unsatisfied, contact the <strong>Information Commissioner's Office (ICO)</strong>:{' '}
                <a
                  href="https://ico.org.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--red-primary)', textDecoration: 'underline' }}
                >
                  ico.org.uk
                </a>{' '}
                or phone 0303 123 1113
              </li>
            </ol>
          </section>

        </div>
      </div>

      {/* Back link */}
      <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Link
          to="/"
          style={{
            color: 'var(--red-primary)',
            textDecoration: 'underline',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}

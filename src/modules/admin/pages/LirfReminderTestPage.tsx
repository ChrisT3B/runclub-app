// src/modules/admin/pages/LirfReminderTestPage.tsx

import React, { useState } from 'react';
import LirfReminderScheduler from '../../communications/schedulers/LirfReminderScheduler';
import LirfReminderService from '../../communications/services/LirfReminderService';
import { usePermissions } from '../../auth/hooks/useAuthQueries';
import '../../../styles/04-pages/LirfReminderTestPage.css';

export const LirfReminderTestPage: React.FC = () => {
  const permissions = usePermissions();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  // Only admins can access this test page
  if (permissions.accessLevel !== 'admin') {
    return (
      <div className="container">
        <div className="card">
          <div className="card-content">
            <p>⛔ Admin access required</p>
          </div>
        </div>
      </div>
    );
  }

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 20));
  };

  const handleTestQuery = async () => {
    setLoading(true);
    setMessage('');
    addLog('🔍 Testing database query for runs requiring LIRF...');

    try {
      const result = await LirfReminderService.sendWeeklyLirfReminder();
      
      setMessage(`✅ Query successful! Found ${result.runsRequiringLirf} runs needing LIRF. Would send to ${result.recipientCount} recipients.`);
      addLog(`✅ Found ${result.runsRequiringLirf} runs requiring LIRF`);
      addLog(`👥 Found ${result.recipientCount} LIRF/Admin recipients`);
      
      if (result.errors.length > 0) {
        addLog(`⚠️ Errors: ${result.errors.join(', ')}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

const handleTestSingleEmail = async () => {
    if (!testEmail) {
      alert('Please enter an email address');
      return;
    }

    if (!confirm(`Send a test LIRF reminder email to:\n\n${testEmail}\n\nThis will attempt to send a real email using your email service.`)) {
      return;
    }

    setLoading(true);
    setMessage('');
    addLog(`📧 Attempting to send test email to ${testEmail}...`);

    try {
      await LirfReminderService.testReminderEmail(testEmail);
      
      setMessage(`✅ Test email send initiated to ${testEmail}! 

Note: In development, the email service endpoint may not exist (/api/send-email), so it will be simulated. Check the Activity Log below for details.

In production with a real email service, the email would be sent.`);
      
      addLog(`✅ Test email process completed`);
      addLog(`📬 Check your inbox at ${testEmail}`);
      addLog(`⚠️ If endpoint is missing, email was simulated (see console)`);
      
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
      addLog(`❌ Email error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const schedulerStatus = LirfReminderScheduler.getStatus();
  const today = new Date();
  const isFriday = today.getDay() === 5;

  return (
    <div className="container lirf-test-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🧪 LIRF Reminder System - Test Page</h2>
          <p className="card-description">
            Safe testing environment for the weekly LIRF reminder feature
          </p>
        </div>

        <div className="card-content">
          
          {/* System Status */}
          <div className="lirf-test-section lirf-test-status">
            <h3 className="lirf-test-section-title">📊 System Status</h3>
            <div className="lirf-test-status-grid">
              <div className="lirf-test-status-item">
                <span className="lirf-test-status-label">Today:</span>
                <span className="lirf-test-status-value">
                  {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="lirf-test-status-item">
                <span className="lirf-test-status-label">Is Friday:</span>
                <span className={`lirf-test-status-value ${isFriday ? 'success' : 'neutral'}`}>
                  {isFriday ? '✅ Yes' : '⏳ No'}
                </span>
              </div>
              <div className="lirf-test-status-item">
                <span className="lirf-test-status-label">Scheduler Active:</span>
                <span className={`lirf-test-status-value ${schedulerStatus.isActive ? 'success' : 'error'}`}>
                  {schedulerStatus.isActive ? '✅ Running' : '❌ Stopped'}
                </span>
              </div>
              <div className="lirf-test-status-item">
                <span className="lirf-test-status-label">Sent Today:</span>
                <span className={`lirf-test-status-value ${schedulerStatus.hasSentToday ? 'success' : 'neutral'}`}>
                  {schedulerStatus.hasSentToday ? '✅ Yes' : '⏳ No'}
                </span>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-error'}`}>
              {message}
            </div>
          )}

          {/* Test 1: Query Test */}
          <div className="lirf-test-section">
            <h3 className="lirf-test-section-title">🔍 Test 1: Database Query</h3>
            <p className="lirf-test-description">
              Test the database query to find runs requiring LIRF assignment in the next 7 days.
              This will also check how many LIRF/Admin recipients would receive the email.
              <strong> No emails will be sent.</strong>
            </p>
            <button
              onClick={handleTestQuery}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '⏳ Testing...' : '🔍 Test Query (No Emails)'}
            </button>
          </div>

          {/* Test 2: Single Email Test */}
          <div className="lirf-test-section">
            <h3 className="lirf-test-section-title">📧 Test 2: Send Test Email</h3>
            <p className="lirf-test-description">
              Send a single test email to verify the email template and content.
              Enter your email address to receive a test reminder email.
            </p>
            <div className="lirf-test-email-input">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="form-input"
              />
              <button
                onClick={handleTestSingleEmail}
                disabled={loading || !testEmail}
                className="btn btn-primary"
              >
                {loading ? '⏳ Sending...' : '📧 Send Test Email'}
              </button>
            </div>
            <p className="lirf-test-hint">
              💡 Use your personal email to review the email format and content
            </p>
          </div>

          {/* Activity Log */}
          <div className="lirf-test-section lirf-test-log-section">
            <div className="lirf-test-log-header">
              <h3 className="lirf-test-section-title">📝 Activity Log</h3>
              <button
                onClick={() => setLogs([])}
                className="lirf-test-clear-btn"
              >
                Clear
              </button>
            </div>
            <div className="lirf-test-log-container">
              {logs.length === 0 ? (
                <div className="lirf-test-log-empty">No activity yet. Run a test to see logs...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="lirf-test-log-entry">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Important Notes */}
          <div className="alert alert-info">
            <div className="alert-title">⚠️ Important Testing Notes:</div>
            <ul className="alert-list">
              <li>This is a <strong>test page only</strong> - safe to use without affecting production</li>
              <li>The scheduler is <strong>NOT automatically started</strong> on this branch</li>
              <li>Test #1 performs the query but does <strong>NOT send any emails</strong></li>
              <li>Test #2 sends <strong>only to your specified email</strong> address</li>
              <li>Real LIRF/Admin users will <strong>NOT be emailed</strong> during testing</li>
              <li>After testing is complete, merge to master to enable automatic Friday emails</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};
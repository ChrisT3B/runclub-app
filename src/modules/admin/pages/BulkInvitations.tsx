import React, { useState } from 'react';
import { InvitationService, InvitationResult } from '../../../services/invitationService';
import { useAuth } from '../../auth/context/AuthContext';
import { PageHeader } from '../../../shared/components/ui/PageHeader';

interface ProcessedResult {
  email: string;
  result: InvitationResult;
}

interface BulkInvitationsProps {
  onNavigate?: (page: string) => void;
}

export const BulkInvitations: React.FC<BulkInvitationsProps> = ({ onNavigate }) => {
  const { state, permissions } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Check if user is admin
  const isAdmin = permissions.accessLevel === 'admin';

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Bulk Invitations" />
        <div className="card">
          <div className="card-content">
            <h2 className="card-title" style={{ color: 'var(--red-primary)' }}>Access Denied</h2>
            <p>You do not have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const parseEmails = (text: string): string[] => {
    // Split by newlines, commas, or semicolons
    const emails = text
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'));

    // Remove duplicates
    return Array.from(new Set(emails));
  };

  const handleTextInput = () => {
    const emails = parseEmails(emailInput);
    setParsedEmails(emails);
    setShowResults(false);
    setResults([]);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emails = parseEmails(text);
      setParsedEmails(emails);
      setShowResults(false);
      setResults([]);
    };

    reader.readAsText(file);
  };

  const handleSendInvitations = async () => {
    if (parsedEmails.length === 0) return;

    setSending(true);
    setProgress({ current: 0, total: parsedEmails.length });
    setResults([]);
    setShowResults(true);

    const bulkResults = await InvitationService.sendBulkInvitations(
      parsedEmails,
      state.user?.id,
      (current, total, email, result) => {
        setProgress({ current, total });
        setResults(prev => [...prev, { email, result }]);
      }
    );

    setSending(false);
    console.log('Bulk send complete:', bulkResults);
  };

  const handleClear = () => {
    setEmailInput('');
    setCsvFile(null);
    setParsedEmails([]);
    setResults([]);
    setShowResults(false);
    setProgress({ current: 0, total: 0 });
  };

  const getResultIcon = (result: InvitationResult) => {
    if (!result.success) return '❌';
    switch (result.action) {
      case 'invitation_sent': return '✉️';
      case 'password_reset': return '🔑';
      case 'reminder_sent': return '🔔';
      default: return '✓';
    }
  };

  const getResultColor = (result: InvitationResult) => {
    if (!result.success) return '#dc2626';
    switch (result.action) {
      case 'invitation_sent': return '#059669';
      case 'password_reset': return '#2563eb';
      case 'reminder_sent': return '#d97706';
      default: return '#059669';
    }
  };

  return (
    <div>
      <PageHeader title="Bulk Member Invitations" />

      <button
        onClick={() => onNavigate?.('admin-reports')}
        className="btn btn--secondary"
        style={{ marginBottom: '20px' }}
      >
        ← Back to Reports
      </button>

      <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
        Send registration invitations to multiple members at once. Paste emails or upload a CSV file.
      </p>

      {/* Input Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-content">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Step 1: Add Email Addresses</h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Paste Email Addresses (one per line, or comma-separated):
            </label>
            <textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={'john@example.com\njane@example.com\nbob@example.com'}
              rows={8}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--gray-300)',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
              disabled={sending}
            />
            <button
              onClick={handleTextInput}
              className="btn btn--secondary"
              style={{ marginTop: '12px' }}
              disabled={sending || !emailInput.trim()}
            >
              Parse Emails from Text
            </button>
          </div>

          <div style={{
            padding: '12px',
            background: 'var(--gray-100)',
            borderRadius: '6px',
            textAlign: 'center',
            margin: '20px 0'
          }}>
            <strong>OR</strong>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Upload CSV File:
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvUpload}
              disabled={sending}
              style={{
                padding: '8px',
                border: '1px solid var(--gray-300)',
                borderRadius: '6px',
                width: '100%'
              }}
            />
            {csvFile && (
              <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--gray-600)' }}>
                ✓ Loaded: {csvFile.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {parsedEmails.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-content">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>
              Step 2: Review & Send ({parsedEmails.length} emails)
            </h3>

            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '12px',
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              {parsedEmails.map((email, idx) => (
                <div key={idx} style={{ padding: '4px 0', fontSize: '14px', fontFamily: 'monospace' }}>
                  {idx + 1}. {email}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSendInvitations}
                className="btn btn--primary"
                disabled={sending || parsedEmails.length === 0}
                style={{ flex: 1 }}
              >
                {sending ? `Sending... (${progress.current}/${progress.total})` : `Send ${parsedEmails.length} Invitations`}
              </button>
              <button
                onClick={handleClear}
                className="btn btn--secondary"
                disabled={sending}
              >
                Clear
              </button>
            </div>

            {sending && (
              <div style={{ marginTop: '16px' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--gray-200)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                    height: '100%',
                    background: 'var(--red-primary)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--gray-600)', textAlign: 'center' }}>
                  Processing: {progress.current} of {progress.total} emails
                  <br />
                  <small>Sending 1 email per second to comply with rate limits</small>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      {showResults && results.length > 0 && (
        <div className="card">
          <div className="card-content">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>
              Results ({results.length} processed)
            </h3>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {results.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{getResultIcon(item.result)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {item.email}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: getResultColor(item.result)
                    }}>
                      {item.result.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!sending && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px'
              }}>
                <p style={{ margin: 0, color: '#166534', fontWeight: '500' }}>
                  ✓ Bulk send complete!
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#166534', fontSize: '14px' }}>
                  Successful: {results.filter(r => r.result.success).length} / {results.length}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkInvitations;

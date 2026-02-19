import React, { useState } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { InvitationService, InvitationResult } from '../../../services/invitationService';

const C25K_REGISTER_URL = `${import.meta.env.VITE_APP_URL || window.location.origin}/c25k`;

interface C25kInvitationsProps {
  onNavigate?: (page: string) => void;
}

export const C25kInvitations: React.FC<C25kInvitationsProps> = ({ onNavigate }) => {
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<Array<{ email: string; result: InvitationResult }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(C25K_REGISTER_URL);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = C25K_REGISTER_URL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'));
  };

  const handleSendInvitations = async () => {
    const emails = parseEmails(emailInput);
    if (emails.length === 0) {
      alert('Please enter at least one valid email address');
      return;
    }

    setSending(true);
    setProgress({ current: 0, total: emails.length });
    setResults([]);
    setShowResults(true);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      const result = await InvitationService.sendInvitation(email, undefined, true);

      setProgress({ current: i + 1, total: emails.length });
      setResults(prev => [...prev, { email, result }]);

      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setSending(false);
  };

  const handleClear = () => {
    setEmailInput('');
    setResults([]);
    setShowResults(false);
    setProgress({ current: 0, total: 0 });
  };

  const getResultIcon = (result: InvitationResult) => {
    if (!result.success) return '\u274C';
    switch (result.action) {
      case 'invitation_sent': return '\u2709\uFE0F';
      case 'password_reset': return '\uD83D\uDD11';
      case 'reminder_sent': return '\uD83D\uDD14';
      default: return '\u2713';
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
      <PageHeader title="Couch to 5k Invitations" />

      <button
        onClick={() => onNavigate?.('admin-reports')}
        className="btn btn--secondary"
        style={{ marginBottom: '20px' }}
      >
        &larr; Back to Reports
      </button>

      {/* Shareable Link Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-content" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>Shareable C25k Registration Link</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>
            Share this link on social media, WhatsApp, or in messages. Anyone who registers via this link will automatically be flagged as a C25k participant.
          </p>

          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px 14px',
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: 'var(--gray-700)',
              wordBreak: 'break-all'
            }}>
              {C25K_REGISTER_URL}
            </div>
            <button
              onClick={handleCopyLink}
              className="btn btn-primary"
              style={{
                whiteSpace: 'nowrap',
                background: linkCopied ? '#059669' : undefined,
                borderColor: linkCopied ? '#059669' : undefined,
              }}
            >
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Email Invitations Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-content" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>Send C25k Programme Invitations</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>
            Invited members will be automatically flagged as C25k participants. They will see both C25k-specific runs and regular club runs.
          </p>

          <textarea
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder={'Enter email addresses (one per line or comma-separated)\n\nExample:\njohn.smith@example.com\njane.doe@example.com'}
            rows={10}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--gray-300)',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              marginBottom: '16px',
              boxSizing: 'border-box'
            }}
            disabled={sending}
          />

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSendInvitations}
              disabled={sending || emailInput.trim().length === 0}
              className="btn btn-primary"
            >
              {sending ? `Sending (${progress.current}/${progress.total})...` : 'Send C25k Invitations'}
            </button>

            {(results.length > 0 || emailInput.length > 0) && (
              <button
                onClick={handleClear}
                disabled={sending}
                className="btn btn-secondary"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {showResults && results.length > 0 && (
        <div className="card">
          <div className="card-content" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>
              Invitation Results ({results.length}/{progress.total})
            </h3>

            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid var(--gray-200)',
              borderRadius: '4px'
            }}>
              <table className="member-table">
                <thead className="member-table__header">
                  <tr>
                    <th className="member-table__header-cell" style={{ width: '40px' }}>Status</th>
                    <th className="member-table__header-cell">Email</th>
                    <th className="member-table__header-cell">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, index) => (
                    <tr key={index} className="member-table__row">
                      <td className="member-table__cell" style={{ textAlign: 'center', fontSize: '20px' }}>
                        {getResultIcon(item.result)}
                      </td>
                      <td className="member-table__cell" style={{ fontFamily: 'monospace' }}>
                        {item.email}
                      </td>
                      <td
                        className="member-table__cell"
                        style={{ color: getResultColor(item.result), fontWeight: '500' }}
                      >
                        {item.result.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'var(--gray-50)',
              borderRadius: '4px',
              fontSize: '14px',
              color: 'var(--gray-600)'
            }}>
              <strong>Summary:</strong> {results.filter(r => r.result.success).length} successful, {results.filter(r => !r.result.success).length} failed
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default C25kInvitations;

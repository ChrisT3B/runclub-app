import React, { useState } from 'react';
import { ParkrunLeagueEntry } from '../types';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';

interface PendingEntryCardProps {
  entry: ParkrunLeagueEntry;
  leagueId: string;
  onReviewed: (entryId: string) => void;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export const PendingEntryCard: React.FC<PendingEntryCardProps> = ({ entry, leagueId, onReviewed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      await ParkrunLeagueService.reviewEntry(entry.id, leagueId, 'approved');
      onReviewed(entry.id);
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setError(null);
    try {
      await ParkrunLeagueService.reviewEntry(entry.id, leagueId, 'rejected', rejectNotes || undefined);
      onReviewed(entry.id);
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
      setLoading(false);
    }
  };

  const submittedDate = new Date(entry.submitted_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="pending-entry-card">
      <div className="pending-entry-card__header">
        <span className="pending-entry-card__name">{entry.member_name ?? 'Unknown'}</span>
        <span className="pending-entry-card__date">Submitted {submittedDate}</span>
      </div>

      <div className="pending-entry-card__details">
        <div>
          <div className="pending-entry-card__detail-label">Event</div>
          <div className="pending-entry-card__detail-value">{entry.event_name}</div>
        </div>
        <div>
          <div className="pending-entry-card__detail-label">Date</div>
          <div className="pending-entry-card__detail-value">{formatDate(entry.event_date)}</div>
        </div>
        <div>
          <div className="pending-entry-card__detail-label">Time</div>
          <div className="pending-entry-card__detail-value">{entry.finish_time}</div>
        </div>
        <div>
          <div className="pending-entry-card__detail-label">Age Grade</div>
          <div className="pending-entry-card__detail-value">{entry.age_grade_percent}%</div>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <a
          href={`https://www.parkrun.org.uk/parkrunner/${entry.parkrun_athlete_id}/`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '13px', color: 'var(--info-color)' }}
        >
          View on parkrun &rarr;
        </a>
      </div>

      {error && (
        <div className="league-form-error" style={{ marginBottom: '8px' }}>
          {error}
        </div>
      )}

      <div className="pending-entry-card__actions">
        <button
          className="btn btn-primary"
          onClick={handleApprove}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Approve'}
        </button>
        {!showRejectInput && (
          <button
            className="btn"
            onClick={() => setShowRejectInput(true)}
            disabled={loading}
            style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}
          >
            Reject
          </button>
        )}
      </div>

      {showRejectInput && (
        <div className="pending-entry-card__reject-notes">
          <input
            type="text"
            placeholder="Reason for rejection (optional)"
            value={rejectNotes}
            onChange={e => setRejectNotes(e.target.value)}
            disabled={loading}
          />
          <button
            className="btn"
            onClick={handleReject}
            disabled={loading}
            style={{ background: '#fee2e2', color: '#dc2626' }}
          >
            {loading ? 'Processing...' : 'Confirm Reject'}
          </button>
          <button
            className="btn"
            onClick={() => { setShowRejectInput(false); setRejectNotes(''); }}
            disabled={loading}
            style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

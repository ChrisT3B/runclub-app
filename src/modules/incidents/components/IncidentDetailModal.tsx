import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { IncidentService } from '../services/IncidentService';
import { actionLabel, incidentTypeLabel, involvementLabel } from '../types';
import type { RunIncident } from '../types';

interface IncidentDetailModalProps {
  incident: RunIncident;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

const formatDate = (value: string) => format(parseISO(value), 'd MMM yyyy');
const formatDateTime = (value: string) => format(parseISO(value), 'd MMM yyyy, HH:mm');

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  isAdmin,
  onClose,
  onUpdated
}) => {
  const { state } = useAuth();
  const [adminNotes, setAdminNotes] = useState(incident.admin_notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const notesChanged = adminNotes.trim() !== (incident.admin_notes ?? '').trim();

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      await onUpdated();
      setMessage(success);
    } catch {
      setError('The change could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveNotes = () =>
    run(() => IncidentService.saveAdminNotes(incident.id, adminNotes), 'Admin notes saved.');

  const handleCloseFollowUp = () => {
    const adminId = state.user?.id;
    if (!adminId) return;
    run(() => IncidentService.closeFollowUp(incident.id, adminId, adminNotes), 'Follow-up closed.');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content incident-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-detail-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 id="incident-detail-title" className="modal-title">{incidentTypeLabel(incident.incident_type)}</h3>
            <p className="incident-detail__run">
              {incident.run_title}
              {incident.run_date && `, ${formatDate(incident.run_date)}`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="incident-detail__body">
          <dl className="incident-detail__facts">
            <div>
              <dt>Reported by</dt>
              <dd>{incident.reporter_name}</dd>
            </div>
            <div>
              <dt>Reported at</dt>
              <dd>{formatDateTime(incident.created_at)}</dd>
            </div>
          </dl>

          <section className="incident-detail__section">
            <h4 className="incident-detail__heading">What happened</h4>
            <p className="incident-detail__text">{incident.description}</p>
          </section>

          <section className="incident-detail__section">
            <h4 className="incident-detail__heading">People involved</h4>
            {incident.people.length === 0 ? (
              <p className="incident-detail__text">None recorded.</p>
            ) : (
              <ul className="incident-detail__people">
                {incident.people.map(person => (
                  <li key={person.id} className="incident-detail__person">
                    <span>{person.display_name}</span>
                    <span className="incident-detail__role">{involvementLabel(person.involvement)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="incident-detail__section">
            <h4 className="incident-detail__heading">Action taken</h4>
            <p className="incident-detail__text">
              {incident.actions_taken.length === 0
                ? 'None recorded.'
                : incident.actions_taken.map(actionLabel).join(', ')}
            </p>
            {incident.action_notes && <p className="incident-detail__text">{incident.action_notes}</p>}
          </section>

          <section className="incident-detail__section">
            <h4 className="incident-detail__heading">Follow-up</h4>
            <p className="incident-detail__text">
              {!incident.follow_up_required && 'No follow-up needed.'}
              {incident.follow_up_status === 'open' && 'Follow-up needed. Open.'}
              {incident.follow_up_status === 'closed' &&
                `Closed${incident.closed_by_name ? ` by ${incident.closed_by_name}` : ''}${
                  incident.closed_at ? ` on ${formatDate(incident.closed_at)}` : ''
                }.`}
            </p>
          </section>

          {isAdmin && (
            <section className="incident-detail__section incident-detail__admin">
              <label htmlFor="incident-admin-notes" className="incident-detail__heading">
                Admin notes
              </label>
              <textarea
                id="incident-admin-notes"
                className="form-input incident-detail__textarea"
                rows={3}
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />

              {error && <div className="incident-detail__error" role="alert">{error}</div>}
              {message && <p className="incident-detail__message">{message}</p>}

              <div className="incident-detail__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSaveNotes}
                  disabled={busy || !notesChanged}
                >
                  {busy ? 'Saving...' : 'Save notes'}
                </button>
                {incident.follow_up_status === 'open' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCloseFollowUp}
                    disabled={busy}
                  >
                    {busy ? 'Saving...' : 'Close follow-up'}
                  </button>
                )}
              </div>
            </section>
          )}

          <button type="button" className="btn btn-secondary incident-detail__close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailModal;

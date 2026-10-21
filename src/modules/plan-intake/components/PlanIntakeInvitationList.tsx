import React from 'react';
import { format, parseISO } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import type { PlanIntakeInvitation, PlanIntakeMember } from '../types';

interface PlanIntakeInvitationListProps {
  invitations: PlanIntakeInvitation[];
  membersByEmail: Map<string, PlanIntakeMember>;
  openEmails: Set<string>;
  busyId: string | null;
  onRevoke: (invitation: PlanIntakeInvitation) => void;
  onInviteAgain: (member: PlanIntakeMember, invitation: PlanIntakeInvitation) => void;
}

function statusDisplay(invitation: PlanIntakeInvitation): { label: string; modifier: string } {
  if (invitation.status === 'invited' && invitation.expired) return { label: 'Expired', modifier: 'muted' };
  switch (invitation.status) {
    case 'invited':
      return { label: 'Invited', modifier: 'info' };
    case 'submitted':
      return { label: 'Submitted, no sheet yet', modifier: 'warning' };
    case 'sheet_created':
      return { label: 'Sheet created', modifier: 'success' };
    case 'sheet_failed':
      return { label: 'Sheet failed', modifier: 'danger' };
    case 'unknown':
      return { label: 'Sheet may exist. Check the folder.', modifier: 'warning' };
    case 'revoked':
      return { label: 'Revoked', modifier: 'muted' };
  }
}

const formatDate = (value: string) => format(parseISO(value), 'd MMM yyyy');

export const PlanIntakeInvitationList: React.FC<PlanIntakeInvitationListProps> = ({
  invitations,
  membersByEmail,
  openEmails,
  busyId,
  onRevoke,
  onInviteAgain,
}) => {
  if (invitations.length === 0) {
    return <div className="plan-intake-admin__empty">No invitations yet.</div>;
  }

  return (
    <ul className="plan-intake-admin__list">
      {invitations.map(invitation => {
        const member = membersByEmail.get(invitation.email);
        const { label, modifier } = statusDisplay(invitation);
        const busy = busyId === invitation.id;
        const closed = invitation.status !== 'invited' || invitation.expired;
        const canInviteAgain = closed && member && !openEmails.has(invitation.email);

        return (
          <li key={invitation.id} className="plan-intake-admin__item">
            <div className="plan-intake-admin__item-head">
              <div className="plan-intake-admin__item-who">
                <span className="plan-intake-admin__name">{member?.full_name ?? invitation.email}</span>
                {member && <span className="plan-intake-admin__email">{invitation.email}</span>}
              </div>
              <span className={`plan-intake-admin__status plan-intake-admin__status--${modifier}`}>{label}</span>
            </div>

            <dl className="plan-intake-admin__dates">
              <div>
                <dt>Created</dt>
                <dd>{formatDate(invitation.created_at)}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>{formatDate(invitation.expires_at)}</dd>
              </div>
            </dl>

            {(invitation.sheet_url || invitation.status === 'invited' || canInviteAgain) && (
              <div className="plan-intake-admin__item-actions">
                {invitation.sheet_url && (
                  <a
                    className="btn btn-secondary plan-intake-admin__action"
                    href={invitation.sheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} />
                    Open sheet
                  </a>
                )}
                {invitation.status === 'invited' && (
                  <button
                    type="button"
                    className="btn btn-secondary plan-intake-admin__action"
                    onClick={() => onRevoke(invitation)}
                    disabled={busy}
                  >
                    {busy ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
                {canInviteAgain && member && (
                  <button
                    type="button"
                    className="btn btn-secondary plan-intake-admin__action"
                    onClick={() => onInviteAgain(member, invitation)}
                    disabled={busy}
                  >
                    {busy ? 'Sending...' : 'Invite again'}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

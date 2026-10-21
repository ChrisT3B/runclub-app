import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { PlanIntakeService } from '../services/planIntakeService';
import { PlanIntakeInviteForm } from '../components/PlanIntakeInviteForm';
import { PlanIntakeInvitationList } from '../components/PlanIntakeInvitationList';
import type { PlanIntakeInvitation, PlanIntakeMember } from '../types';

interface PlanIntakeAdminPageProps {
  onNavigate: (page: string) => void;
}

const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Something went wrong. Please try again.';

export const PlanIntakeAdminPage: React.FC<PlanIntakeAdminPageProps> = () => {
  const { permissions } = useAuth();
  const [members, setMembers] = useState<PlanIntakeMember[]>([]);
  const [invitations, setInvitations] = useState<PlanIntakeInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    setInvitations(await PlanIntakeService.getInvitations());
  }, []);

  useEffect(() => {
    if (!permissions.canManageMembers) return;
    (async () => {
      try {
        const [memberList] = await Promise.all([PlanIntakeService.getMembers(), loadInvitations()]);
        setMembers(memberList);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [permissions.canManageMembers, loadInvitations]);

  const membersByEmail = useMemo(() => new Map(members.map(m => [m.email, m])), [members]);

  const openEmails = useMemo(
    () => new Set(invitations.filter(i => i.status === 'invited' && !i.expired).map(i => i.email)),
    [invitations],
  );

  if (!permissions.canManageMembers) {
    return (
      <div className="page-container plan-intake-admin">
        <div className="page-header">
          <h1 className="page-title">Training Plan Invitation</h1>
        </div>
        <div className="plan-intake-admin__empty">Access denied. Admin access required.</div>
      </div>
    );
  }

  /** True when the invitation was sent. */
  const sendInvite = async (member: PlanIntakeMember): Promise<boolean> => {
    setError('');
    setSuccess('');
    try {
      await PlanIntakeService.invite(member.id);
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
    setSuccess(`Invitation sent to ${member.full_name}.`);
    try {
      await loadInvitations();
    } catch (err) {
      setError(errorMessage(err));
    }
    return true;
  };

  const handleInviteAgain = async (member: PlanIntakeMember, invitation: PlanIntakeInvitation) => {
    setBusyId(invitation.id);
    try {
      await sendInvite(member);
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (invitation: PlanIntakeInvitation) => {
    const name = membersByEmail.get(invitation.email)?.full_name ?? invitation.email;
    if (!window.confirm(`Revoke the invitation for ${name}? The form link will stop working for them.`)) return;

    setBusyId(invitation.id);
    setError('');
    setSuccess('');
    try {
      await PlanIntakeService.revoke(invitation.id);
      await loadInvitations();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-container plan-intake-admin">
      <div className="page-header">
        <h1 className="page-title">Training Plan Invitation</h1>
        <p className="page-description">
          Invite a member to fill in the training plan form. Their answers go to a private Google Sheet.
        </p>
      </div>

      {error && <div className="plan-intake-admin__message plan-intake-admin__message--error" role="alert">{error}</div>}
      {success && <div className="plan-intake-admin__message plan-intake-admin__message--success" role="status">{success}</div>}

      {loading ? (
        <div className="plan-intake-admin__empty">Loading...</div>
      ) : (
        <>
          <PlanIntakeInviteForm members={members} openEmails={openEmails} onInvite={sendInvite} />

          <div className="card plan-intake-admin__card">
            <div className="card-header">
              <h2 className="card-title">Invitations</h2>
            </div>
            <div className="card-content">
              <PlanIntakeInvitationList
                invitations={invitations}
                membersByEmail={membersByEmail}
                openEmails={openEmails}
                busyId={busyId}
                onRevoke={handleRevoke}
                onInviteAgain={handleInviteAgain}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

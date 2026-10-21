// All plan intake data goes through /api/plan-intake. The table has no browser access.
// The only Supabase call here reads the current session for its access token.

import { supabase } from '../../../services/supabase';
import type { PlanIntakeInvitation, PlanIntakeMember } from '../types';

export class PlanIntakeError extends Error {
  code: string;

  constructor(code: string) {
    super(PlanIntakeError.messageFor(code));
    this.code = code;
  }

  static messageFor(code: string): string {
    switch (code) {
      case 'already_invited':
        return 'This member already has an open invitation.';
      case 'email_not_confirmed':
        return "This member hasn't confirmed their email address yet, so they can't be invited.";
      case 'not_a_member':
        return 'This member cannot be invited.';
      case 'email_failed':
        return 'The invitation email could not be sent. Please try again.';
      case 'not_found':
        return 'That invitation is no longer open.';
      case 'forbidden':
        return 'Admin access required.';
      case 'unauthorised':
        return 'Your session has expired. Please log in again.';
      case 'consent_required':
        return 'Please tick the consent box before submitting.';
      case 'invalid_answers':
        return 'Some answers are missing or not in the expected format. Please check each step.';
      case 'submit_failed':
        return 'Something went wrong and your answers could not be saved. Please contact the coaching team.';
      case 'network':
        return 'Could not reach the server. Check your connection and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

async function callApi<T>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new PlanIntakeError('unauthorised');

  let response: Response;
  try {
    response = await fetch('/api/plan-intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PlanIntakeError('network');
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    // A platform timeout or error page rather than the route's own JSON
    throw new PlanIntakeError(response.status === 504 ? 'network' : 'server_error');
  }

  if (!response.ok) throw new PlanIntakeError(json?.error || 'server_error');
  return json as T;
}

export class PlanIntakeService {
  // ---- Admin ----

  static async getMembers(): Promise<PlanIntakeMember[]> {
    const result = await callApi<{ members: PlanIntakeMember[] }>({ action: 'members' });
    return result.members;
  }

  static async getInvitations(): Promise<PlanIntakeInvitation[]> {
    const result = await callApi<{ invitations: PlanIntakeInvitation[] }>({ action: 'list' });
    return result.invitations;
  }

  static async invite(memberId: string): Promise<void> {
    await callApi({ action: 'create-invite', member_id: memberId });
  }

  static async revoke(invitationId: string): Promise<void> {
    await callApi({ action: 'revoke', id: invitationId });
  }

  // ---- Athlete ----

  static async hasOpenForm(): Promise<boolean> {
    const result = await callApi<{ open: boolean }>({ action: 'status' });
    return result.open === true;
  }

  /** 'received' when the answers reached the server, 'closed' when there was no open form. */
  static async submit(answers: Record<string, string>, consent: boolean): Promise<'received' | 'closed'> {
    const result = await callApi<{ success?: boolean; open?: boolean }>({ action: 'submit', answers, consent });
    return result.success === true ? 'received' : 'closed';
  }
}

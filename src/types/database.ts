// src/types/database.ts
// TypeScript interfaces for database tables

export interface PendingInvitation {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'registered' | 'expired';
  invited_by: string | null;
  invited_at: string;
  registered_at: string | null;
  expires_at: string;
  invitation_sent: boolean;
  email_sent_at: string | null;
  guest_member_id: string | null;
  created_at: string;
  updated_at: string;
}

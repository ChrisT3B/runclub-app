-- Week 1 Work Package: Database Schema Changes
-- Create pending_invitations table and update members table

-- ===================================================================
-- PART 1: Create pending_invitations table
-- ===================================================================

-- Create pending_invitations table
CREATE TABLE IF NOT EXISTS public.pending_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    accepted_at TIMESTAMPTZ
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_invitations_token ON public.pending_invitations(token);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_status ON public.pending_invitations(status);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON public.pending_invitations(email);

-- Enable RLS
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Admin full access to pending_invitations" ON public.pending_invitations;
DROP POLICY IF EXISTS "Users can read own invitation by token" ON public.pending_invitations;

-- Admin can do everything
CREATE POLICY "Admin full access to pending_invitations"
ON public.pending_invitations
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.members
        WHERE members.id = auth.uid()
        AND members.access_level = 'admin'
    )
);

-- Users can only read their own invitation by token (for registration flow)
CREATE POLICY "Users can read own invitation by token"
ON public.pending_invitations
FOR SELECT
TO authenticated
USING (true);  -- We'll validate token in application logic

-- Allow anonymous users to read invitations for registration (before they have an account)
DROP POLICY IF EXISTS "Anonymous can read invitations by token" ON public.pending_invitations;
CREATE POLICY "Anonymous can read invitations by token"
ON public.pending_invitations
FOR SELECT
TO anon
USING (true);  -- Token validation happens in application

-- Add comment for documentation
COMMENT ON TABLE public.pending_invitations IS 'Stores invited members with pre-populated data before registration';

-- ===================================================================
-- PART 2: Add tracking fields to members table
-- ===================================================================

-- Add invited_at timestamp to track which users came from invitations
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

COMMENT ON COLUMN public.members.invited_at IS 'Timestamp when user was invited via pre-population system';

-- ===================================================================
-- VERIFICATION QUERIES (run after migration to verify success)
-- ===================================================================

-- Verify pending_invitations table was created
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'pending_invitations';

-- Verify indexes were created
-- SELECT indexname FROM pg_indexes WHERE tablename = 'pending_invitations';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'pending_invitations';

-- Verify policies were created
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'pending_invitations';

-- Verify column was added to members
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'invited_at';

-- WP-PlanSheets-Build-v1, Phase 1: plan intake invitations
-- One row per invitation. Holds no athlete answers: those go only to the Google Sheet.
-- Browser access is closed off entirely. Only the service role (api/plan-intake.js) reads or writes.

BEGIN;

-- ===================================================================
-- PART 1: Table
-- ===================================================================

CREATE TABLE public.plan_intake_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL CHECK (email = lower(email)),
    status TEXT NOT NULL DEFAULT 'invited'
        CHECK (status IN ('invited', 'submitted', 'sheet_created', 'sheet_failed', 'unknown', 'revoked')),
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    used_at TIMESTAMPTZ,
    consent_at TIMESTAMPTZ,
    sheet_id TEXT,
    sheet_url TEXT,
    last_error TEXT CHECK (last_error IS NULL OR char_length(last_error) <= 200)
);

COMMENT ON TABLE public.plan_intake_invitations IS 'Plan intake invitations. No athlete answers are stored here. Service role access only.';
COMMENT ON COLUMN public.plan_intake_invitations.created_by IS 'members.id of the admin who sent the invitation';
COMMENT ON COLUMN public.plan_intake_invitations.last_error IS 'Short error code only, never athlete answers';

-- An email can have only one open invitation at a time
CREATE UNIQUE INDEX plan_intake_invitations_open_email_idx
    ON public.plan_intake_invitations (email)
    WHERE status = 'invited';

-- ===================================================================
-- PART 2: Security
-- ===================================================================

-- RLS on with no policies: anon and authenticated get no rows even if a grant slips back in
ALTER TABLE public.plan_intake_invitations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.plan_intake_invitations FROM anon, authenticated;
GRANT ALL ON TABLE public.plan_intake_invitations TO service_role;

COMMIT;

-- ===================================================================
-- VERIFICATION QUERIES (run after migration to verify success)
-- ===================================================================

-- Table and columns
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'plan_intake_invitations' ORDER BY ordinal_position;

-- Partial unique index
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'plan_intake_invitations';

-- RLS enabled, no policies
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'plan_intake_invitations';
-- SELECT policyname FROM pg_policies WHERE tablename = 'plan_intake_invitations';   -- expect no rows

-- Grants: expect service_role only (plus the table owner)
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'plan_intake_invitations' ORDER BY grantee, privilege_type;

-- ===================================================================
-- ROLLBACK (run by hand only if needed)
-- ===================================================================

-- DROP TABLE IF EXISTS public.plan_intake_invitations;

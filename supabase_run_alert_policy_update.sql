-- ============================================
-- Run Alert Feature: Database Updates
-- ============================================
-- 1. Updates the CHECK constraint on notifications.type to allow 'run_alert'
-- 2. Updates the notifications INSERT policy to allow LIRFs
--    to create 'run_alert' notifications (in addition to 'run_specific')
--    for runs they are assigned to lead.
--
-- run_alert sends to ALL active members but is still tied to a specific run.
-- ============================================

-- Step 1: Update CHECK constraint to allow 'run_alert' type
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['run_specific'::text, 'general'::text, 'urgent'::text, 'run_alert'::text]));

-- Step 2: Update RLS INSERT policy
ALTER POLICY "notifications_insert_policy"
ON "public"."notifications"
TO public
WITH CHECK (
  -- Must be admin or LIRF
  ((EXISTS (
    SELECT 1
    FROM members
    WHERE (members.id = auth.uid())
    AND (members.access_level = ANY (ARRAY['admin'::text, 'lirf'::text]))
  )))
  AND
  (
    -- Admins can create any notification type
    (EXISTS (
      SELECT 1
      FROM members
      WHERE (members.id = auth.uid())
      AND (members.access_level = 'admin'::text)
    ))
    OR
    -- LIRFs can create run_specific OR run_alert, must have run_id, and must be assigned
    (
      (type = ANY (ARRAY['run_specific'::text, 'run_alert'::text]))
      AND (run_id IS NOT NULL)
      AND (auth.uid() IN (
        SELECT scheduled_runs.assigned_lirf_1
        FROM scheduled_runs
        WHERE scheduled_runs.id = run_id
        UNION
        SELECT scheduled_runs.assigned_lirf_2
        FROM scheduled_runs
        WHERE scheduled_runs.id = run_id
        UNION
        SELECT scheduled_runs.assigned_lirf_3
        FROM scheduled_runs
        WHERE scheduled_runs.id = run_id
      ))
    )
  )
);

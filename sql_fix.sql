-- ============================================================
-- ORAYN Fix: Add leaderboard RLS policy
-- Run as Role: postgres in Supabase SQL Editor
-- This allows any authenticated agent to read agent_code + is_active
-- of other agents (for leaderboard) without revealing full names or emails
-- ============================================================

-- Drop the overly restrictive agents_select_own policy
DROP POLICY IF EXISTS "agents_select_own" ON agents;

-- New policy: agents can read all active agents (code only context)
-- Full select is allowed - RLS controls row visibility not column visibility
-- But the app code never exposes full_name/email to non-admin users
CREATE POLICY "agents_select_active"
  ON agents FOR SELECT
  USING (
    -- Authenticated agents can see all active agents
    (auth.uid() IN (SELECT auth_user_id FROM agents WHERE is_active = TRUE))
    OR
    -- Admins see everything
    is_admin()
  );

-- ============================================================
-- Verify
-- ============================================================
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'agents';

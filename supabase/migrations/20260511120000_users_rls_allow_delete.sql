-- Allow deleting user rows via the app's anon client (matches existing permissive RLS posture).
-- Tighten in production so only facility-scoped admins can delete linked staff accounts.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public delete users" ON users;

CREATE POLICY "Allow public delete users" ON users FOR DELETE USING (true);

-- Custom PIN login uses the Supabase anon key from the browser without a Supabase Auth
-- session, so auth.uid() is NULL. Policies like "Users can view own profile" that require
-- auth.uid() = id block every row for SELECT, which makes login always fail with empty results.
--
-- These permissive policies allow the existing app to read/update users for PIN verification,
-- registration, and enrollment — matching supabase/fix-rls-policies.sql.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read users" ON users;
DROP POLICY IF EXISTS "Allow public insert users" ON users;
DROP POLICY IF EXISTS "Allow public update users" ON users;

CREATE POLICY "Allow public read users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update users" ON users
  FOR UPDATE USING (true);

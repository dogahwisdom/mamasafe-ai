-- PIN login uses the Supabase anon key from the browser with no JWT session (see
-- users_rls_allow_pin_login). Netlify WhatsApp functions use the service role and bypass RLS
-- when inserting outbound rows — but the Clinic Portal Outreach Monitor SELECTs via anon.
--
-- If RLS was enabled on whatsapp_messages with no permissive SELECT policy (or toggled on in
-- the dashboard), outreach shows 0 sends even while the cron successfully logs rows.
--
-- This mirrors fix-rls-policies.sql for patients: anon can read message rows needed by the portal.

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read whatsapp_messages" ON whatsapp_messages;

CREATE POLICY "Allow public read whatsapp_messages" ON whatsapp_messages
  FOR SELECT USING (true);

-- Inserts remain via service_role (Netlify/functions, backend scripts), which bypass RLS.

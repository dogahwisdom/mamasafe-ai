-- PIN reset tokens for secure "Forgot PIN / Reset PIN"
-- Run this in your Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS pin_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pin_reset_tokens_user_id ON pin_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pin_reset_tokens_expires_at ON pin_reset_tokens(expires_at);

ALTER TABLE pin_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Development-friendly permissive policies.
-- For production, replace with strict policies that scope by token_hash/user_id.
CREATE POLICY "Allow public read pin_reset_tokens" ON pin_reset_tokens
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert pin_reset_tokens" ON pin_reset_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update pin_reset_tokens" ON pin_reset_tokens
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete pin_reset_tokens" ON pin_reset_tokens
  FOR DELETE USING (true);


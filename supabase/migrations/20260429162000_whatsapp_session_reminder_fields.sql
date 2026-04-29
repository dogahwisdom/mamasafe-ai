ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS last_user_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_bot_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_reminder_count
  ON whatsapp_sessions(reminder_count);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_updated_at
  ON whatsapp_sessions(updated_at DESC);

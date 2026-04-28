CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  related_reminder_id TEXT,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'template', 'status', 'system')),
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'received')
  ),
  meta_message_id TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_patient_id
  ON whatsapp_messages(patient_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone
  ON whatsapp_messages(phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_message_id
  ON whatsapp_messages(meta_message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at
  ON whatsapp_messages(created_at DESC);

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

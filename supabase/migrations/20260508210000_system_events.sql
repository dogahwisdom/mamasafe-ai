-- System events: lightweight audit log for jobs and ops.

CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  facility_id UUID NULL REFERENCES users(id),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON system_events (event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_facility_id ON system_events (facility_id);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- No client policies by default. Service role bypasses RLS and can insert/read for audit.


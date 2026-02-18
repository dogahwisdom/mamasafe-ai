-- Migration: Add AI Usage Tracking and Resolved Tasks Tracking
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. AI CONVERSATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('triage', 'symptom_check', 'medication_reminder', 'appointment_reminder', 'general_inquiry', 'other')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'web', 'mobile')),
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'pending')) DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_facility_id ON ai_conversations(facility_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_patient_id ON ai_conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_type ON ai_conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_channel ON ai_conversations(channel);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_facility_date ON ai_conversations(facility_id, created_at DESC);

-- ============================================
-- 2. RESOLVED TASKS TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS resolved_tasks_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL,
  facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  resolution_notes TEXT,
  time_to_resolve_minutes INTEGER, -- Time from task creation to resolution
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for resolved_tasks_log
CREATE INDEX IF NOT EXISTS idx_resolved_tasks_facility_id ON resolved_tasks_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_resolved_tasks_patient_id ON resolved_tasks_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_resolved_tasks_resolved_at ON resolved_tasks_log(resolved_at DESC);
CREATE INDEX IF NOT EXISTS idx_resolved_tasks_facility_date ON resolved_tasks_log(facility_id, resolved_at DESC);

-- ============================================
-- 3. AI USAGE SUMMARY TABLE (for billing)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,
  conversations_by_type JSONB DEFAULT '{}'::jsonb,
  conversations_by_channel JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, period_start, period_end)
);

-- Indexes for ai_usage_summary
CREATE INDEX IF NOT EXISTS idx_ai_usage_facility_id ON ai_usage_summary(facility_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_period ON ai_usage_summary(period_start, period_end);

-- ============================================
-- 4. UPDATE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ai_conversations
CREATE TRIGGER update_ai_conversations_updated_at 
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ai_usage_summary
CREATE TRIGGER update_ai_usage_summary_updated_at 
  BEFORE UPDATE ON ai_usage_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolved_tasks_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_summary ENABLE ROW LEVEL SECURITY;

-- AI Conversations: Facilities can view their own conversations
DROP POLICY IF EXISTS "Facilities can view their AI conversations" ON ai_conversations;
CREATE POLICY "Facilities can view their AI conversations" ON ai_conversations
  FOR SELECT USING (
    facility_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

-- AI Conversations: Facilities can create their own conversations
DROP POLICY IF EXISTS "Facilities can create AI conversations" ON ai_conversations;
CREATE POLICY "Facilities can create AI conversations" ON ai_conversations
  FOR INSERT WITH CHECK (
    facility_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

-- Resolved Tasks: Facilities can view their own resolved tasks
DROP POLICY IF EXISTS "Facilities can view their resolved tasks" ON resolved_tasks_log;
CREATE POLICY "Facilities can view their resolved tasks" ON resolved_tasks_log
  FOR SELECT USING (
    facility_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

-- Resolved Tasks: Facilities can create their own resolved task logs
DROP POLICY IF EXISTS "Facilities can create resolved task logs" ON resolved_tasks_log;
CREATE POLICY "Facilities can create resolved task logs" ON resolved_tasks_log
  FOR INSERT WITH CHECK (
    facility_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

-- AI Usage Summary: Facilities can view their own usage
DROP POLICY IF EXISTS "Facilities can view their AI usage summary" ON ai_usage_summary;
CREATE POLICY "Facilities can view their AI usage summary" ON ai_usage_summary
  FOR SELECT USING (
    facility_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

-- AI Usage Summary: Only system can create/update summaries
DROP POLICY IF EXISTS "System can manage AI usage summary" ON ai_usage_summary;
CREATE POLICY "System can manage AI usage summary" ON ai_usage_summary
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

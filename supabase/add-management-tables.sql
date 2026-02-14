-- Additional tables for Superadmin Management Features
-- Run this in Supabase SQL Editor after running schema.sql

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID REFERENCES users(id) ON DELETE CASCADE,
  facility_name TEXT NOT NULL,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('basic', 'standard', 'premium', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  price DECIMAL(10, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_method TEXT,
  last_payment_date DATE,
  next_billing_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_facility_id ON subscriptions(facility_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_name ON subscriptions(plan_name);

-- ============================================
-- SUPPORT TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  facility_id UUID REFERENCES users(id) ON DELETE SET NULL,
  facility_name TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'training', 'feature_request', 'bug_report', 'other')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_facility_id ON support_tickets(facility_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- ============================================
-- SUPPORT TICKET MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at DESC);

-- ============================================
-- SOPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('enrollment', 'triage', 'referral', 'medication', 'compliance', 'training', 'other')),
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,
  file_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sops_category ON sops(category);
CREATE INDEX IF NOT EXISTS idx_sops_is_active ON sops(is_active);
CREATE INDEX IF NOT EXISTS idx_sops_created_at ON sops(created_at DESC);

-- ============================================
-- SOP ACCESS LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sop_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sop_id UUID REFERENCES sops(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES users(id) ON DELETE CASCADE,
  facility_name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'downloaded', 'completed')),
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sop_access_logs_sop_id ON sop_access_logs(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_access_logs_facility_id ON sop_access_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_sop_access_logs_accessed_at ON sop_access_logs(accessed_at DESC);

-- ============================================
-- TRIGGERS: Auto-update updated_at
-- ============================================
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sops_updated_at BEFORE UPDATE ON sops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_access_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for development (adjust for production)
CREATE POLICY "Allow public read subscriptions" ON subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Allow public write subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update subscriptions" ON subscriptions
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read support_tickets" ON support_tickets
  FOR SELECT USING (true);

CREATE POLICY "Allow public write support_tickets" ON support_tickets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update support_tickets" ON support_tickets
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read support_ticket_messages" ON support_ticket_messages
  FOR SELECT USING (true);

CREATE POLICY "Allow public write support_ticket_messages" ON support_ticket_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read sops" ON sops
  FOR SELECT USING (true);

CREATE POLICY "Allow public write sops" ON sops
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update sops" ON sops
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read sop_access_logs" ON sop_access_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow public write sop_access_logs" ON sop_access_logs
  FOR INSERT WITH CHECK (true);

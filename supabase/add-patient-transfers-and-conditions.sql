-- Migration: Add Patient Transfers, Dispensing Records, and Support for Conditions Beyond Pregnancy
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. UPDATE PATIENTS TABLE: Support conditions beyond pregnancy
-- ============================================

-- Make gestational_weeks nullable (not all patients are pregnant)
ALTER TABLE patients
  ALTER COLUMN gestational_weeks DROP NOT NULL;

-- Add condition_type field
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS condition_type TEXT CHECK (condition_type IN ('pregnancy', 'diabetes', 'hypertension', 'tuberculosis', 'other', NULL));

-- Add medical_conditions JSONB field for storing multiple conditions and details
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS medical_conditions JSONB DEFAULT '[]'::jsonb;

-- Add next_follow_up_date for pharmacy/clinic follow-up tracking
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;

-- Create index for condition_type
CREATE INDEX IF NOT EXISTS idx_patients_condition_type ON patients(condition_type);

-- Create index for next_follow_up_date
CREATE INDEX IF NOT EXISTS idx_patients_next_follow_up_date ON patients(next_follow_up_date);

-- ============================================
-- 2. PATIENT TRANSFERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS patient_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  from_facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_facility_name TEXT NOT NULL,
  to_facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_facility_name TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

-- Indexes for patient_transfers
CREATE INDEX IF NOT EXISTS idx_patient_transfers_patient_id ON patient_transfers(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_transfers_from_facility_id ON patient_transfers(from_facility_id);
CREATE INDEX IF NOT EXISTS idx_patient_transfers_to_facility_id ON patient_transfers(to_facility_id);
CREATE INDEX IF NOT EXISTS idx_patient_transfers_status ON patient_transfers(status);
CREATE INDEX IF NOT EXISTS idx_patient_transfers_patient_phone ON patient_transfers(patient_phone);

-- ============================================
-- 3. DISPENSING RECORDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS dispensing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'tablets',
  dispensed_by UUID REFERENCES users(id),
  pharmacy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  next_follow_up_date DATE,
  notes TEXT,
  dispensed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dispensing_records
CREATE INDEX IF NOT EXISTS idx_dispensing_records_patient_id ON dispensing_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_records_pharmacy_id ON dispensing_records(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_records_dispensed_at ON dispensing_records(dispensed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispensing_records_next_follow_up_date ON dispensing_records(next_follow_up_date);

-- ============================================
-- 4. TRIGGERS: Auto-update updated_at
-- ============================================

-- Drop triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS update_patient_transfers_updated_at ON patient_transfers;
CREATE TRIGGER update_patient_transfers_updated_at 
  BEFORE UPDATE ON patient_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dispensing_records_updated_at ON dispensing_records;
CREATE TRIGGER update_dispensing_records_updated_at 
  BEFORE UPDATE ON dispensing_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE patient_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispensing_records ENABLE ROW LEVEL SECURITY;

-- Patient transfers: Facilities can view transfers they're involved in
DROP POLICY IF EXISTS "Facilities can view their transfers" ON patient_transfers;
CREATE POLICY "Facilities can view their transfers" ON patient_transfers
  FOR SELECT USING (
    from_facility_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR to_facility_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

-- Patient transfers: Requesting facility can create transfers
DROP POLICY IF EXISTS "Facilities can create transfer requests" ON patient_transfers;
CREATE POLICY "Facilities can create transfer requests" ON patient_transfers
  FOR INSERT WITH CHECK (
    to_facility_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role IN ('clinic', 'pharmacy'))
  );

-- Patient transfers: Original facility can approve/reject
DROP POLICY IF EXISTS "Original facility can update transfers" ON patient_transfers;
CREATE POLICY "Original facility can update transfers" ON patient_transfers
  FOR UPDATE USING (
    from_facility_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

-- Dispensing records: Pharmacies can view their own records
DROP POLICY IF EXISTS "Pharmacies can view their dispensing records" ON dispensing_records;
CREATE POLICY "Pharmacies can view their dispensing records" ON dispensing_records
  FOR SELECT USING (
    pharmacy_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role IN ('superadmin', 'clinic'))
  );

-- Dispensing records: Pharmacies can create records
DROP POLICY IF EXISTS "Pharmacies can create dispensing records" ON dispensing_records;
CREATE POLICY "Pharmacies can create dispensing records" ON dispensing_records
  FOR INSERT WITH CHECK (
    pharmacy_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

-- Dispensing records: Pharmacies can update their records
DROP POLICY IF EXISTS "Pharmacies can update their dispensing records" ON dispensing_records;
CREATE POLICY "Pharmacies can update their dispensing records" ON dispensing_records
  FOR UPDATE USING (
    pharmacy_id = (SELECT id FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub')
    OR EXISTS (SELECT 1 FROM users WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub' AND users.role = 'superadmin')
  );

-- Allow public operations for now (development mode)
-- In production, replace with proper RLS policies above
DROP POLICY IF EXISTS "Allow public read patient_transfers" ON patient_transfers;
CREATE POLICY "Allow public read patient_transfers" ON patient_transfers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert patient_transfers" ON patient_transfers;
CREATE POLICY "Allow public insert patient_transfers" ON patient_transfers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update patient_transfers" ON patient_transfers;
CREATE POLICY "Allow public update patient_transfers" ON patient_transfers
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read dispensing_records" ON dispensing_records;
CREATE POLICY "Allow public read dispensing_records" ON dispensing_records
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert dispensing_records" ON dispensing_records;
CREATE POLICY "Allow public insert dispensing_records" ON dispensing_records
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update dispensing_records" ON dispensing_records;
CREATE POLICY "Allow public update dispensing_records" ON dispensing_records
  FOR UPDATE USING (true);

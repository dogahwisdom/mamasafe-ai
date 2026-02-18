-- Migration: Add Comprehensive Clinic Workflow for Normal Conditions
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. CLINIC VISITS TABLE (Registration/Reception)
-- ============================================

CREATE TABLE IF NOT EXISTS clinic_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('outpatient', 'inpatient', 'emergency', 'followup')) DEFAULT 'outpatient',
  visit_date TIMESTAMPTZ DEFAULT NOW(),
  registration_time TIMESTAMPTZ DEFAULT NOW(),
  reception_notes TEXT,
  registered_by UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('registered', 'in_progress', 'completed', 'cancelled')) DEFAULT 'registered',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clinic_visits
CREATE INDEX IF NOT EXISTS idx_clinic_visits_patient_id ON clinic_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_facility_id ON clinic_visits(facility_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_visit_date ON clinic_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_status ON clinic_visits(status);

-- ============================================
-- 2. CLINICAL HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS clinical_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES clinic_visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  chief_complaint TEXT NOT NULL,
  history_of_present_illness TEXT,
  past_medical_history TEXT,
  family_history TEXT,
  social_history TEXT,
  allergies TEXT,
  current_medications TEXT,
  vital_signs JSONB, -- {temperature, bp, pulse, respiratory_rate, oxygen_saturation, weight, height, bmi}
  physical_examination TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clinical_history
CREATE INDEX IF NOT EXISTS idx_clinical_history_visit_id ON clinical_history(visit_id);
CREATE INDEX IF NOT EXISTS idx_clinical_history_patient_id ON clinical_history(patient_id);

-- ============================================
-- 3. LAB REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS lab_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES clinic_visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('blood', 'urine', 'stool', 'imaging', 'other')),
  test_category TEXT, -- e.g., 'hematology', 'biochemistry', 'microbiology'
  clinical_indication TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('routine', 'urgent', 'stat')) DEFAULT 'routine',
  status TEXT NOT NULL CHECK (status IN ('requested', 'in_progress', 'completed', 'cancelled')) DEFAULT 'requested',
  results TEXT,
  results_file_url TEXT,
  ordered_by UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lab_requests
CREATE INDEX IF NOT EXISTS idx_lab_requests_visit_id ON lab_requests(visit_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient_id ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_facility_id ON lab_requests(facility_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);
CREATE INDEX IF NOT EXISTS idx_lab_requests_priority ON lab_requests(priority);

-- ============================================
-- 4. DIAGNOSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES clinic_visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  diagnosis_code TEXT, -- ICD-10 code
  diagnosis_name TEXT NOT NULL,
  diagnosis_type TEXT NOT NULL CHECK (diagnosis_type IN ('primary', 'secondary', 'differential', 'provisional')) DEFAULT 'primary',
  description TEXT,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'chronic', 'ruled_out')) DEFAULT 'active',
  diagnosed_by UUID REFERENCES users(id),
  diagnosis_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for diagnoses
CREATE INDEX IF NOT EXISTS idx_diagnoses_visit_id ON diagnoses(visit_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_patient_id ON diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_status ON diagnoses(status);

-- ============================================
-- 5. PAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES clinic_visits(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('consultation', 'lab', 'pharmacy', 'procedure', 'other')) DEFAULT 'consultation',
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mpesa', 'card', 'insurance', 'nhif', 'waiver')) DEFAULT 'cash',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
  transaction_reference TEXT,
  insurance_provider TEXT,
  insurance_number TEXT,
  nhif_number TEXT,
  notes TEXT,
  paid_by UUID REFERENCES users(id),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_visit_id ON payments(visit_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_facility_id ON payments(facility_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);

-- ============================================
-- 6. UPDATE PATIENTS TABLE: Add patient_type (inpatient/outpatient)
-- ============================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS patient_type TEXT CHECK (patient_type IN ('outpatient', 'inpatient')) DEFAULT 'outpatient';

CREATE INDEX IF NOT EXISTS idx_patients_patient_type ON patients(patient_type);

-- ============================================
-- 7. TRIGGERS: Auto-update updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_clinic_visits_updated_at ON clinic_visits;
CREATE TRIGGER update_clinic_visits_updated_at 
  BEFORE UPDATE ON clinic_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinical_history_updated_at ON clinical_history;
CREATE TRIGGER update_clinical_history_updated_at 
  BEFORE UPDATE ON clinical_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_requests_updated_at ON lab_requests;
CREATE TRIGGER update_lab_requests_updated_at 
  BEFORE UPDATE ON lab_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_diagnoses_updated_at ON diagnoses;
CREATE TRIGGER update_diagnoses_updated_at 
  BEFORE UPDATE ON diagnoses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE clinic_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow public operations for now (development mode)
-- In production, replace with proper RLS policies

-- Clinic visits
DROP POLICY IF EXISTS "Allow public read clinic_visits" ON clinic_visits;
CREATE POLICY "Allow public read clinic_visits" ON clinic_visits
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert clinic_visits" ON clinic_visits;
CREATE POLICY "Allow public insert clinic_visits" ON clinic_visits
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update clinic_visits" ON clinic_visits;
CREATE POLICY "Allow public update clinic_visits" ON clinic_visits
  FOR UPDATE USING (true);

-- Clinical history
DROP POLICY IF EXISTS "Allow public read clinical_history" ON clinical_history;
CREATE POLICY "Allow public read clinical_history" ON clinical_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert clinical_history" ON clinical_history;
CREATE POLICY "Allow public insert clinical_history" ON clinical_history
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update clinical_history" ON clinical_history;
CREATE POLICY "Allow public update clinical_history" ON clinical_history
  FOR UPDATE USING (true);

-- Lab requests
DROP POLICY IF EXISTS "Allow public read lab_requests" ON lab_requests;
CREATE POLICY "Allow public read lab_requests" ON lab_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert lab_requests" ON lab_requests;
CREATE POLICY "Allow public insert lab_requests" ON lab_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update lab_requests" ON lab_requests;
CREATE POLICY "Allow public update lab_requests" ON lab_requests
  FOR UPDATE USING (true);

-- Diagnoses
DROP POLICY IF EXISTS "Allow public read diagnoses" ON diagnoses;
CREATE POLICY "Allow public read diagnoses" ON diagnoses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert diagnoses" ON diagnoses;
CREATE POLICY "Allow public insert diagnoses" ON diagnoses
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update diagnoses" ON diagnoses;
CREATE POLICY "Allow public update diagnoses" ON diagnoses
  FOR UPDATE USING (true);

-- Payments
DROP POLICY IF EXISTS "Allow public read payments" ON payments;
CREATE POLICY "Allow public read payments" ON payments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert payments" ON payments;
CREATE POLICY "Allow public insert payments" ON payments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update payments" ON payments;
CREATE POLICY "Allow public update payments" ON payments
  FOR UPDATE USING (true);

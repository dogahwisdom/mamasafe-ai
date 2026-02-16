-- Add facility scoping to patients so each clinic/pharmacy
-- only sees their own enrolled patients.
--
-- Run this script in the Supabase SQL Editor.

-- Add facility_id column if it does not exist
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES users(id);

-- Helpful index for filtering by facility
CREATE INDEX IF NOT EXISTS idx_patients_facility_id
  ON patients(facility_id);


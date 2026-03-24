-- Patient care coordination anchor (non-restrictive)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS primary_facility_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS primary_facility_name TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_primary_facility_id
  ON patients(primary_facility_id);

COMMENT ON COLUMN patients.primary_facility_id IS 'Preferred primary facility for continuity of care; does not restrict access.';
COMMENT ON COLUMN patients.primary_facility_name IS 'Snapshot of primary facility display name.';

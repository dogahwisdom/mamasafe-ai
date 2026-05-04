-- Mark QA / automation patients so they can be hidden from default clinic lists (referrals, tasks, etc.)

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN patients.is_test IS
  'When true, this patient is treated as QA/test data and excluded from default clinic/pharmacy referrals and action items unless explicitly included.';

CREATE INDEX IF NOT EXISTS idx_patients_is_test ON patients (is_test) WHERE is_test = true;

-- Conservative backfill: well-known automation name only (adjust in SQL if needed)
UPDATE patients
SET is_test = true,
    updated_at = NOW()
WHERE lower(trim(name)) = 'terminal test user';

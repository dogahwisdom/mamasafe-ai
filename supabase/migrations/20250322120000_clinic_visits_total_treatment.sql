-- Expected total treatment cost per visit (partial payments vs balance due)
ALTER TABLE clinic_visits
  ADD COLUMN IF NOT EXISTS total_treatment_amount DECIMAL(12, 2);

COMMENT ON COLUMN clinic_visits.total_treatment_amount IS
  'Full bill for the visit; compare with sum(payments.amount) for balance when patients pay in instalments.';

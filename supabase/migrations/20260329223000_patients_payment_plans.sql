-- Patient payment plans (daily/monthly/annual) used in clinic workflow billing.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS payment_plan_daily_kes DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS payment_plan_monthly_kes DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS payment_plan_annual_kes DECIMAL(12,2);

COMMENT ON COLUMN patients.payment_plan_daily_kes IS 'Patient payment plan: expected daily amount (KES)';
COMMENT ON COLUMN patients.payment_plan_monthly_kes IS 'Patient payment plan: expected monthly amount (KES)';
COMMENT ON COLUMN patients.payment_plan_annual_kes IS 'Patient payment plan: expected annual amount (KES)';


ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS whatsapp_checkup_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_checkup_opt_out_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_patients_whatsapp_checkup_opt_out
  ON patients(whatsapp_checkup_opt_out);

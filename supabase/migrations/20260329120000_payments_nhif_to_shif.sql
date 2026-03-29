-- Kenya: NHIF superseded by SHIF (Social Health Insurance Fund) for national scheme payments.
-- Migrates stored method value and membership number column.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;

UPDATE payments SET payment_method = 'shif' WHERE payment_method = 'nhif';

ALTER TABLE payments ADD COLUMN IF NOT EXISTS shif_number TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'nhif_number'
  ) THEN
    UPDATE payments
    SET shif_number = nhif_number
    WHERE nhif_number IS NOT NULL
      AND (shif_number IS NULL OR trim(shif_number) = '');
    ALTER TABLE payments DROP COLUMN nhif_number;
  END IF;
END $$;

ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('cash', 'mpesa', 'card', 'insurance', 'shif', 'waiver'));

COMMENT ON COLUMN payments.shif_number IS 'SHIF (Social Health Insurance Fund) membership / contribution number when payment_method = shif';

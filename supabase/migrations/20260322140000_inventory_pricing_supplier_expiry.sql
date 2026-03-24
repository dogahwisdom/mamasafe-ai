-- Unit pricing (trade price), supplier, and batch-line expiry for pharmacy/clinic inventory
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS unit_price_kes DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

COMMENT ON COLUMN inventory.unit_price_kes IS 'Trade / list price per stock unit (KES)';
COMMENT ON COLUMN inventory.supplier IS 'Preferred supplier or vendor name';
COMMENT ON COLUMN inventory.expiry_date IS 'Expiry date for this stock line (FEFO monitoring)';

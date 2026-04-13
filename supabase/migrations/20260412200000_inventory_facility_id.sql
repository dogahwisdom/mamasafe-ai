-- Scope inventory rows per facility (clinic/pharmacy `users.id`).
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inventory_facility_id ON inventory(facility_id);

-- Legacy global rows: attach to a single facility account when possible.
UPDATE inventory inv
SET facility_id = (
  SELECT u.id
  FROM users u
  WHERE u.id = '00000000-0000-0000-0000-000000000001'
  LIMIT 1
)
WHERE inv.facility_id IS NULL;

UPDATE inventory inv
SET facility_id = (
  SELECT u.id
  FROM users u
  WHERE u.role IN ('clinic', 'pharmacy')
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1
)
WHERE inv.facility_id IS NULL;

-- Replace global unique(name) with per-facility uniqueness.
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_facility_id_name_unique
  ON inventory (facility_id, name);

COMMENT ON COLUMN inventory.facility_id IS 'Owning facility user id (clinic or pharmacy portal account).';

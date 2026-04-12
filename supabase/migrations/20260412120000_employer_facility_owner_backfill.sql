-- Links staff accounts to the facility user row that may manage their permissions.
-- NULL = top-level account (clinic / pharmacy / superadmin root, or patient).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS employer_facility_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_employer_facility_id ON users(employer_facility_id);

-- Existing deployments: grant owner-level module access in facility_data (JSON merge keeps other keys).
UPDATE users
SET facility_data = COALESCE(facility_data, '{}'::jsonb) || jsonb_build_object(
  'permissionRole', 'owner',
  'permissions', jsonb_build_object(
    'overview', true,
    'inventory', true,
    'expenses', true
  )
);

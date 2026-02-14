-- Add superadmin role to users table
-- Run this in Supabase SQL Editor to fix the constraint

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with superadmin included
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('patient', 'clinic', 'pharmacy', 'superadmin'));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
  AND conname = 'users_role_check';

-- Add preferred_channel column to patients table
-- Run this in Supabase SQL Editor if the column doesn't exist

ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'both' 
CHECK (preferred_channel IN ('whatsapp', 'sms', 'both'));

-- Update existing patients to have default 'both'
UPDATE patients 
SET preferred_channel = 'both' 
WHERE preferred_channel IS NULL;

-- Add comment
COMMENT ON COLUMN patients.preferred_channel IS 'Patient preferred reminder channel: whatsapp, sms, or both';

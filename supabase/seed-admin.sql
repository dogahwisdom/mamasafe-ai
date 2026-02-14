-- Seed Default Admin User
-- Run this in Supabase SQL Editor after running schema.sql

-- Insert default admin user (clinic role)
INSERT INTO users (
  id,
  role,
  name,
  phone,
  email,
  location,
  country_code,
  avatar,
  pin_hash,
  facility_data
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'clinic',
  'MamaSafe HQ',
  '+254700000000',
  'admin@mamasafe.ai',
  'Nairobi',
  'KE',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80',
  '73facc41c0704fddfd11c5512b56544eff4e0583b000a919c584f8581fab0728', -- SHA256 hash of "salt_1234_secure"
  '{"managerName": "System Admin"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  location = EXCLUDED.location,
  avatar = EXCLUDED.avatar,
  facility_data = EXCLUDED.facility_data;

-- Insert demo patient user
INSERT INTO users (
  id,
  role,
  name,
  phone,
  email,
  location,
  country_code,
  pin_hash,
  patient_data
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'patient',
  'Jane Demo (Patient)',
  '+254722000000',
  'patient@demo.mamasafe.ai',
  'Nairobi',
  'KE',
  '73facc41c0704fddfd11c5512b56544eff4e0583b000a919c584f8581fab0728', -- SHA256 hash of "salt_1234_secure"
  jsonb_build_object(
    'gestationWeeks', 28,
    'dob', '1995-01-01',
    'nextOfKin', jsonb_build_object('name', 'John Doe', 'phone', '+254711000000'),
    'medicalHistory', jsonb_build_array('Mild Anemia'),
    'allergies', jsonb_build_array(),
    'medications', jsonb_build_array(),
    'nextAppointment', (NOW() + INTERVAL '5 days')::text,
    'riskStatus', 'Low'
  )
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  location = EXCLUDED.location,
  patient_data = EXCLUDED.patient_data;

-- Insert demo pharmacy user
INSERT INTO users (
  id,
  role,
  name,
  phone,
  email,
  location,
  country_code,
  pin_hash,
  facility_data
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'pharmacy',
  'City Care Pharmacy',
  '+254733000000',
  'pharmacy@demo.mamasafe.ai',
  'Westlands, Nairobi',
  'KE',
  '73facc41c0704fddfd11c5512b56544eff4e0583b000a919c584f8581fab0728', -- SHA256 hash of "salt_1234_secure"
  '{"managerName": "Peter Drugman"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  location = EXCLUDED.location,
  facility_data = EXCLUDED.facility_data;

-- Insert superadmin user
INSERT INTO users (
  id,
  role,
  name,
  phone,
  email,
  location,
  country_code,
  avatar,
  pin_hash,
  facility_data
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  'superadmin',
  'MamaSafe AI Team',
  '+254700000001',
  'superadmin@mamasafe.ai',
  'Nairobi',
  'KE',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80',
  '73facc41c0704fddfd11c5512b56544eff4e0583b000a919c584f8581fab0728', -- SHA256 hash of "salt_1234_secure"
  '{"managerName": "System Administrator"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  location = EXCLUDED.location,
  avatar = EXCLUDED.avatar,
  facility_data = EXCLUDED.facility_data;

-- Verify users were created
SELECT id, role, name, phone, email FROM users WHERE role IN ('clinic', 'patient', 'pharmacy', 'superadmin');

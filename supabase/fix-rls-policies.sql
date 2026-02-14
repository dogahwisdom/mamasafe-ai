-- Fix Row Level Security Policies for MamaSafe AI
-- Run this in Supabase SQL Editor to allow registration and login

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Clinic can view all patients" ON patients;
DROP POLICY IF EXISTS "Pharmacy can view all patients" ON patients;
DROP POLICY IF EXISTS "Patients can view own record" ON patients;
DROP POLICY IF EXISTS "Allow public read users" ON users;
DROP POLICY IF EXISTS "Allow public insert users" ON users;
DROP POLICY IF EXISTS "Allow public update users" ON users;
DROP POLICY IF EXISTS "Allow public read patients" ON patients;
DROP POLICY IF EXISTS "Allow public insert patients" ON patients;
DROP POLICY IF EXISTS "Allow public update patients" ON patients;
DROP POLICY IF EXISTS "Allow public read medications" ON medications;
DROP POLICY IF EXISTS "Allow public insert medications" ON medications;
DROP POLICY IF EXISTS "Allow public update medications" ON medications;
DROP POLICY IF EXISTS "Allow public read tasks" ON tasks;
DROP POLICY IF EXISTS "Allow public insert tasks" ON tasks;
DROP POLICY IF EXISTS "Allow public update tasks" ON tasks;
DROP POLICY IF EXISTS "Allow public read referrals" ON referrals;
DROP POLICY IF EXISTS "Allow public insert referrals" ON referrals;
DROP POLICY IF EXISTS "Allow public update referrals" ON referrals;
DROP POLICY IF EXISTS "Allow public read reminders" ON reminders;
DROP POLICY IF EXISTS "Allow public insert reminders" ON reminders;
DROP POLICY IF EXISTS "Allow public update reminders" ON reminders;
DROP POLICY IF EXISTS "Allow public read refill_requests" ON refill_requests;
DROP POLICY IF EXISTS "Allow public insert refill_requests" ON refill_requests;
DROP POLICY IF EXISTS "Allow public update refill_requests" ON refill_requests;
DROP POLICY IF EXISTS "Allow public read inventory" ON inventory;
DROP POLICY IF EXISTS "Allow public insert inventory" ON inventory;
DROP POLICY IF EXISTS "Allow public update inventory" ON inventory;

-- Allow public read/write for users table (for development)
-- In production, you'll want more restrictive policies
CREATE POLICY "Allow public read users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update users" ON users
  FOR UPDATE USING (true);

-- Allow public read/write for patients (for development)
CREATE POLICY "Allow public read patients" ON patients
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert patients" ON patients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update patients" ON patients
  FOR UPDATE USING (true);

-- Allow public read/write for medications
CREATE POLICY "Allow public read medications" ON medications
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert medications" ON medications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update medications" ON medications
  FOR UPDATE USING (true);

-- Allow public read/write for tasks
CREATE POLICY "Allow public read tasks" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert tasks" ON tasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update tasks" ON tasks
  FOR UPDATE USING (true);

-- Allow public read/write for referrals
CREATE POLICY "Allow public read referrals" ON referrals
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert referrals" ON referrals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update referrals" ON referrals
  FOR UPDATE USING (true);

-- Allow public read/write for reminders
CREATE POLICY "Allow public read reminders" ON reminders
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert reminders" ON reminders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update reminders" ON reminders
  FOR UPDATE USING (true);

-- Allow public read/write for refill_requests
CREATE POLICY "Allow public read refill_requests" ON refill_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert refill_requests" ON refill_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update refill_requests" ON refill_requests
  FOR UPDATE USING (true);

-- Allow public read/write for inventory
CREATE POLICY "Allow public read inventory" ON inventory
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert inventory" ON inventory
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update inventory" ON inventory
  FOR UPDATE USING (true);

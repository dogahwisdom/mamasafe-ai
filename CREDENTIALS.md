# Login Credentials

## Standard Test Accounts

### 1. Clinic Admin (MamaSafe HQ)
Use this to test as the MamaSafe AI team:

- Username/Email: `admin` or `admin@mamasafe.ai`
- Phone: `+254700000000` or `0700000000`
- Password: `1234`
- Role: Clinic (Full Access)

### 2. Demo Patient
- Username/Phone: `+254722000000` or `0722000000`
- Password: `1234`
- Role: Patient

### 3. Demo Pharmacy
- Username/Phone: `+254733000000` or `0733000000`
- Password: `1234`
- Role: Pharmacy

---

## Setup Instructions

### Step 1: Run the Seed Script

1. Go to your Supabase project: https://app.supabase.com/project/mxjwsdizjpdwfleebucu
2. Click SQL Editor (left sidebar)
3. Click New Query
4. Open `supabase/seed-admin.sql` from this project
5. Copy ALL the SQL code
6. Paste into Supabase SQL Editor
7. Click Run (or press `Ctrl+Enter`)

You should see a table with 3 users listed.

### Step 2: Verify Users Created

1. In Supabase dashboard, click Table Editor
2. Click on the `users` table
3. You should see 3 rows:
   - MamaSafe HQ (clinic)
   - Jane Demo (patient)
   - City Care Pharmacy (pharmacy)

### Step 3: Test Login

1. Restart your dev server: `npm run dev`
2. Go to the login page
3. Try logging in with:
   - Username: `admin`
   - Password: `1234`

---

## What Works

- Login with username/email/phone
- Login with password `1234`
- All three roles (clinic, patient, pharmacy)
- Data stored in Supabase (not localStorage)

---

## Security Note

These are test credentials for development. Change passwords before production.

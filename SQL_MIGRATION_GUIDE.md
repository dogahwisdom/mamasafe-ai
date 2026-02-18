# SQL Migration Guide

## ✅ Required SQL Migrations

You need to run these SQL migrations in your Supabase SQL Editor **in this exact order**:

### Step 1: Base Schema (If not already run)
**File:** `supabase/schema.sql`
- Creates all base tables (users, patients, medications, tasks, referrals, reminders, etc.)
- **Run this FIRST** if you're setting up a new database

### Step 2: Core Feature Migrations (Required)

**1. Add Superadmin Role**
```sql
-- File: supabase/add-superadmin-role.sql
```
- Adds `superadmin` role to users table
- **Run this if you want superadmin functionality**

**2. Add Patient Facility Tracking**
```sql
-- File: supabase/add-patient-facility.sql
```
- Adds `facility_id` column to patients table
- **REQUIRED** - Ensures facilities only see their own patients

**3. Add Preferred Channel**
```sql
-- File: supabase/add-preferred-channel.sql
```
- Adds `preferred_channel` for WhatsApp/SMS preferences
- **REQUIRED** - For messaging functionality

**4. Add Patient Transfers and Conditions**
```sql
-- File: supabase/add-patient-transfers-and-conditions.sql
```
- Makes `gestational_weeks` nullable
- Adds `condition_type` (pregnancy, diabetes, hypertension, tuberculosis, other)
- Adds `medical_conditions` JSONB field
- Adds `next_follow_up_date` for pharmacy follow-ups
- Creates `patient_transfers` table
- Creates `dispensing_records` table
- **REQUIRED** - For all recent features

**5. Add Clinic Workflow**
```sql
-- File: supabase/add-clinic-workflow.sql
```
- Creates `clinic_visits` table
- Creates `clinical_history` table
- Creates `lab_requests` table
- Creates `diagnoses` table
- Creates `payments` table
- Adds `patient_type` (outpatient/inpatient) to patients
- **REQUIRED** - For clinic workflow features

**6. Add Management Tables**
```sql
-- File: supabase/add-management-tables.sql
```
- Creates `subscriptions` table
- Creates `support_tickets` table
- Creates `support_ticket_messages` table
- Creates `sops` table
- Creates `sop_access_logs` table
- **REQUIRED** - For superadmin subscription, support, and SOPs features

**7. Fix RLS Policies**
```sql
-- File: supabase/fix-rls-policies.sql
```
- Sets up Row Level Security policies
- Makes policies permissive for development
- **REQUIRED** - For data access control

### Step 3: Seed Data (Optional)
**File:** `supabase/seed-admin.sql`
- Creates default admin, clinic, pharmacy, and superadmin users
- **Optional** - Only if you need demo accounts

---

## 🚀 Quick Start: Run All Migrations

If you want to run everything at once, here's the order:

1. **schema.sql** (if new database)
2. **add-superadmin-role.sql**
3. **add-patient-facility.sql**
4. **add-preferred-channel.sql**
5. **add-patient-transfers-and-conditions.sql**
6. **add-clinic-workflow.sql**
7. **add-management-tables.sql**
8. **fix-rls-policies.sql**
9. **seed-admin.sql** (optional)

---

## 📋 How to Run Migrations in Supabase

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click on **SQL Editor** in the left sidebar

2. **Open Migration File**
   - Copy the contents of each migration file
   - Paste into the SQL Editor

3. **Run the Migration**
   - Click **Run** button (or press Ctrl+Enter)
   - Wait for success message

4. **Verify**
   - Check that tables were created
   - Go to **Table Editor** to see new tables

---

## ⚠️ Important Notes

- **Order Matters**: Run migrations in the order listed above
- **Idempotent**: Most migrations use `IF NOT EXISTS` so they're safe to run multiple times
- **Backup First**: Always backup your database before running migrations in production
- **Test Environment**: Test migrations in a development environment first

---

## 🔍 Verify Migrations Were Successful

After running migrations, verify these tables exist:

### Required Tables:
- ✅ `users` (with `superadmin` role support)
- ✅ `patients` (with `facility_id`, `condition_type`, `patient_type`, `next_follow_up_date`)
- ✅ `patient_transfers`
- ✅ `dispensing_records`
- ✅ `clinic_visits`
- ✅ `clinical_history`
- ✅ `lab_requests`
- ✅ `diagnoses`
- ✅ `payments`
- ✅ `subscriptions`
- ✅ `support_tickets`
- ✅ `support_ticket_messages`
- ✅ `sops`
- ✅ `sop_access_logs`

### Check Columns:
Run this query to verify patient table has all columns:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients'
ORDER BY ordinal_position;
```

You should see:
- `condition_type`
- `medical_conditions`
- `next_follow_up_date`
- `patient_type`
- `facility_id`
- `preferred_channel`

---

## 🐛 Troubleshooting

### Error: "column already exists"
- This is normal - migrations use `IF NOT EXISTS`
- You can safely ignore these errors

### Error: "relation already exists"
- Tables already exist - this is fine
- Migrations are idempotent

### Error: "permission denied"
- Check that you're using the correct database user
- Ensure you have admin privileges

### Features not working after migration
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify environment variables are set
4. Check that RLS policies are enabled

---

## 📞 Need Help?

If migrations fail:
1. Check the error message in Supabase SQL Editor
2. Verify you're running migrations in the correct order
3. Ensure base schema (`schema.sql`) was run first
4. Check Supabase logs for detailed error information

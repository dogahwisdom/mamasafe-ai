# 🔧 Fix Registration & Login Errors

## Error 1: "new row violates row-level security policy"

This happens because Supabase Row Level Security (RLS) is blocking inserts.

### Solution:

1. Go to Supabase SQL Editor: https://app.supabase.com/project/mxjwsdizjpdwfleebucu/sql
2. Click "New Query"
3. Copy **ALL** code from `supabase/fix-rls-policies.sql`
4. Paste and click **Run**

This will allow public read/write access for development. (In production, you'll want more restrictive policies.)

---

## Error 2: "Invalid credentials" on login

This happens because the admin user doesn't exist in Supabase yet.

### Solution:

1. Go to Supabase SQL Editor: https://app.supabase.com/project/mxjwsdizjpdwfleebucu/sql
2. Click "New Query"
3. Copy **ALL** code from `supabase/seed-admin.sql`
4. Paste and click **Run**

This will create the admin user with:
- Username: `admin`
- Password: `1234`

---

## Quick Fix (Run Both Scripts):

**Step 1:** Run `supabase/fix-rls-policies.sql` first
**Step 2:** Then run `supabase/seed-admin.sql`

After running both scripts:
- Registration will work
- Login with `admin` / `1234` will work

---

## Verify:

1. Go to Supabase Table Editor
2. Check the `users` table - you should see 3 users (admin, patient, pharmacy)
3. Try registering a new user - it should work
4. Try logging in with `admin` / `1234` - it should work

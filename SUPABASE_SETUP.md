# 🚀 Supabase Setup Instructions

## ✅ What's Been Done

1. ✅ Supabase client library installed (`@supabase/supabase-js`)
2. ✅ Database schema created (`supabase/schema.sql`)
3. ✅ Supabase client configured (`services/supabaseClient.ts`)
4. ✅ TypeScript types defined (`types/supabase.ts`)

## 📋 Next Steps (Do These Now)

### Step 1: Get Your Supabase Credentials

1. Go to https://app.supabase.com
2. Open your project
3. Go to **Settings** → **API** (left sidebar)
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 2: Create `.env.local` File

Create a file named `.env.local` in the project root with:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TRIAGE_ENGINE_API_KEY=your-existing-key-here
```

**Replace the values with your actual Supabase credentials!**

### Step 3: Run Database Schema

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `supabase/schema.sql` from this project
4. Copy **ALL** the SQL code
5. Paste into Supabase SQL Editor
6. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

You should see: ✅ "Success. No rows returned"

### Step 4: Verify Tables Created

1. In Supabase dashboard, click **Table Editor** (left sidebar)
2. You should see these tables:
   - ✅ `users`
   - ✅ `patients`
   - ✅ `medications`
   - ✅ `tasks`
   - ✅ `referrals`
   - ✅ `reminders`
   - ✅ `refill_requests`
   - ✅ `inventory`

### Step 5: Test the Connection

Restart your dev server:

```bash
npm run dev
```

The app will now connect to Supabase! 🎉

## 🔐 Security Notes

- **anon key**: Safe to use in frontend (it's public)
- **service_role key**: NEVER put in frontend! Only use in backend/server code
- Row Level Security (RLS) is enabled for data protection

## 🐛 Troubleshooting

**"Supabase credentials missing" warning?**
- Make sure `.env.local` exists and has correct values
- Restart your dev server after creating `.env.local`

**Tables not showing?**
- Check SQL Editor for errors
- Make sure you ran the entire `schema.sql` file

**Connection errors?**
- Verify your Project URL is correct (no trailing slash)
- Check that your anon key is the full string (starts with `eyJ`)

## 📚 What's Next?

After setup, we'll:
1. Migrate backend services to use Supabase instead of localStorage
2. Set up Twilio WhatsApp webhooks
3. Create a Node.js backend for Twilio integration

---

**Need help?** Check `supabase/README.md` for more details.

# Supabase Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Click on your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret! Only use in backend.

## Step 2: Create Environment File

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

## Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press `Ctrl+Enter`)

This will create all tables, indexes, triggers, and RLS policies.

## Step 4: Verify Tables

Go to **Table Editor** in Supabase dashboard. You should see:
- `users`
- `patients`
- `medications`
- `tasks`
- `referrals`
- `reminders`
- `refill_requests`
- `inventory`

## Step 5: Test Connection

After installing dependencies and setting up the client, the app will automatically connect to Supabase.

## Security Notes

- **anon key**: Safe to use in frontend (exposed in browser)
- **service_role key**: NEVER expose in frontend! Only use in backend/server-side code
- Row Level Security (RLS) is enabled on all tables for data protection

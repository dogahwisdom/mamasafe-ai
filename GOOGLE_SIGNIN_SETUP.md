# 🔐 Google Sign-In Setup Guide

## Overview

Google sign-in is now integrated using Supabase OAuth. Here's how to set it up:

---

## Step 1: Enable Google OAuth in Supabase

1. Go to your Supabase project: https://app.supabase.com/project/mxjwsdizjpdwfleebucu
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click **Enable**
4. You'll need to configure Google OAuth credentials

---

## Step 2: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `https://mxjwsdizjpdwfleebucu.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local development)
7. Copy the **Client ID** and **Client Secret**

---

## Step 3: Configure in Supabase

1. In Supabase, paste:
   - **Client ID** (from Google)
   - **Client Secret** (from Google)
2. Click **Save**

---

## Step 4: Add Auth Callback Handler (Optional)

For production, you may want to add a callback handler. The current implementation will work, but you can add:

**File:** `views/AuthCallback.tsx` (create if needed)

```tsx
import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User is authenticated, redirect to app
        window.location.href = '/';
      }
    };

    handleAuthCallback();
  }, []);

  return <div>Processing...</div>;
};
```

---

## How It Works

1. **User clicks "Continue with Google"**
2. **Redirects to Google** for authentication
3. **Google redirects back** to Supabase callback
4. **Supabase creates/updates user** in auth.users
5. **Our code checks** if user exists in `users` table
6. **Creates user** if new, or **logs in** if existing
7. **User is logged in** to the app

---

## Testing

1. Click "Continue with Google" button
2. You'll be redirected to Google
3. Sign in with your Google account
4. You'll be redirected back to the app
5. You should be logged in!

---

## Troubleshooting

### "Redirecting to Google..." error
- This is normal! The user is being redirected to Google
- After Google authentication, they'll be redirected back

### "Failed to create account"
- Check Supabase RLS policies (run `fix-rls-policies.sql`)
- Check that Google OAuth is enabled in Supabase
- Check browser console for errors

### Redirect not working
- Make sure redirect URI is correct in Google Console
- Must match exactly: `https://mxjwsdizjpdwfleebucu.supabase.co/auth/v1/callback`

---

## Current Status

✅ **Code is ready** - Google sign-in is implemented
⏳ **Needs configuration** - Enable Google OAuth in Supabase
⏳ **Needs Google credentials** - Create OAuth app in Google Cloud

---

## Quick Setup Checklist

- [ ] Enable Google provider in Supabase
- [ ] Create OAuth app in Google Cloud Console
- [ ] Add redirect URI to Google OAuth app
- [ ] Add Client ID and Secret to Supabase
- [ ] Test sign-in flow

---

**Once configured, Google sign-in will work automatically!** 🚀

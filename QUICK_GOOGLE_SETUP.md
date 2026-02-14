# 🚀 Quick Google OAuth Setup - Step by Step

## Step 1: Go to Google Cloud Console

**Direct Link:** https://console.cloud.google.com/

1. Sign in with your Google account
2. You'll see the Google Cloud Console dashboard

---

## Step 2: Create New Project

1. Click the **project dropdown** at the top (next to "Google Cloud")
2. Click **"New Project"**
3. Fill in:
   - **Project name:** `mamasafe-ai-auth`
   - **Organization:** (Leave default or select your org)
   - **Location:** (Leave default)
4. Click **"Create"**
5. Wait a few seconds for project creation
6. **Select the new project** from the dropdown

---

## Step 3: Enable Google+ API

1. Go to: **APIs & Services** → **Library**
   - Or direct link: https://console.cloud.google.com/apis/library
2. Search for: **"Google+ API"**
3. Click on **"Google+ API"**
4. Click **"Enable"**
5. Wait for it to enable (few seconds)

---

## Step 4: Configure OAuth Consent Screen

1. Go to: **APIs & Services** → **OAuth consent screen**
   - Or direct link: https://console.cloud.google.com/apis/credentials/consent
2. Select **"External"** (unless you have Google Workspace)
3. Click **"Create"**
4. Fill in:
   - **App name:** `MamaSafe AI`
   - **User support email:** Your email
   - **Developer contact information:** Your email
5. Click **"Save and Continue"**
6. **Scopes:** Click **"Add or Remove Scopes"**
   - Select: `email`, `profile`, `openid`
   - Click **"Update"**
   - Click **"Save and Continue"**
7. **Test users:** (For development)
   - Click **"Add Users"**
   - Add your email address
   - Click **"Add"**
   - Click **"Save and Continue"**
8. Click **"Back to Dashboard"**

---

## Step 5: Create OAuth Client ID

1. Go to: **APIs & Services** → **Credentials**
   - Or direct link: https://console.cloud.google.com/apis/credentials
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Fill in:
   - **Name:** `MamaSafe AI Web Client`
   - **Authorized JavaScript origins:** (Leave empty for now)
   - **Authorized redirect URIs:** Click **"Add URI"** and add:
     ```
     https://mxjwsdizjpdwfleebucu.supabase.co/auth/v1/callback
     ```
     (For local development, also add: `http://localhost:3000`)
5. Click **"Create"**
6. **IMPORTANT:** Copy these immediately:
   - **Client ID** (long string)
   - **Client Secret** (click "Show" to reveal)
   - ⚠️ **Save these securely!** You'll need them for Supabase

---

## Step 6: Add to Supabase

1. Go to: https://app.supabase.com/project/mxjwsdizjpdwfleebucu/auth/providers
2. Find **"Google"** in the list
3. Click **"Enable"** or toggle it on
4. Paste:
   - **Client ID** (from Step 5)
   - **Client Secret** (from Step 5)
5. Click **"Save"**

---

## Step 7: Test It!

1. Go to your app: http://localhost:3000
2. Click **"Continue with Google"**
3. You should be redirected to Google
4. Sign in with your Google account
5. You'll be redirected back and logged in!

---

## 🔗 Quick Links

- **Google Cloud Console:** https://console.cloud.google.com/
- **Create Project:** https://console.cloud.google.com/projectcreate
- **APIs Library:** https://console.cloud.google.com/apis/library
- **OAuth Consent:** https://console.cloud.google.com/apis/credentials/consent
- **Credentials:** https://console.cloud.google.com/apis/credentials
- **Supabase Auth:** https://app.supabase.com/project/mxjwsdizjpdwfleebucu/auth/providers

---

## ⚠️ Important Notes

1. **Client Secret** - Keep it secure! Never commit to git
2. **Redirect URI** - Must match exactly (including https://)
3. **Test Users** - Add your email in OAuth consent screen for testing
4. **Production** - You'll need to verify the app later for public use

---

## ✅ Checklist

- [ ] Project created: `mamasafe-ai-auth`
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth Client ID created
- [ ] Redirect URI added
- [ ] Client ID and Secret copied
- [ ] Added to Supabase
- [ ] Tested sign-in

---

**That's it! You're ready to use Google sign-in!** 🎉

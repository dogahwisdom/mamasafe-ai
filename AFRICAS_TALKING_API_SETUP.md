# Africa's Talking API Setup Guide

## How to Get Your API Credentials

### Step 1: Navigate to Apps/Sandbox Section

1. **In your Africa's Talking dashboard**, look for one of these in the left sidebar:
   - **"Apps"** or **"Sandbox"** 
   - **"API Keys"** or **"Settings"**
   - **"Developer" or **"API Settings"**

2. **If you don't see these options:**
   - Click on your **profile/account icon** (top right)
   - Look for **"Developer"** or **"API"** in the dropdown menu
   - Or go directly to: **https://account.africastalking.com/apps/sandbox**

### Step 2: Create or Select an App

1. You should see a list of apps or a **"Create App"** button
2. If you don't have an app yet:
   - Click **"Create App"** or **"New App"**
   - Give it a name: **"MamaSafe AI"**
   - Select **"SMS"** as the service
   - Click **"Create"**

3. If you already have an app:
   - Click on the app name to open it

### Step 3: Get Your API Credentials

Once you're in your app settings, you'll see:

1. **API Key** (also called "Production API Key" or "Sandbox API Key")
   - This is a long string of characters
   - Copy this - you'll need it for `VITE_AFRICAS_TALKING_API_KEY`

2. **Username** (also called "API Username")
   - This is usually your account username or app-specific username
   - Copy this - you'll need it for `VITE_AFRICAS_TALKING_USERNAME`

### Step 4: Register a Sender ID (Important!)

1. In the same app settings, look for **"Sender ID"** or **"SMS Settings"**
2. Click **"Register Sender ID"** or **"Add Sender ID"**
3. Enter: **"MamaSafe"** (or your preferred name)
4. Submit and wait for approval (usually takes a few hours to 1 day)
5. Once approved, you can send SMS with this sender ID

---

## Direct Links

### If you can't find the Apps section:

1. **Try this direct link:**
   - https://account.africastalking.com/apps/sandbox
   - Or: https://account.africastalking.com/apps

2. **Alternative - Settings:**
   - https://account.africastalking.com/settings
   - Look for "API Keys" or "Developer" section

3. **Documentation:**
   - https://developers.africastalking.com/docs/sms/overview
   - https://developers.africastalking.com/docs/getting-started

---

## What You Need to Copy

Once you find your credentials, you'll need:

1. **Username** (e.g., `sandbox` or `your_username`)
2. **API Key** (e.g., `abc123def456...` - long string)

---

## Add to Your Environment Variables

After getting your credentials, add them to `.env.local`:

```env
VITE_AFRICAS_TALKING_USERNAME=your_username_here
VITE_AFRICAS_TALKING_API_KEY=your_api_key_here
```

---

## Troubleshooting

### "I don't see Apps or Sandbox in the sidebar"

1. **Check if you're on the right account:**
   - Make sure you're logged into your developer account
   - Not a customer/end-user account

2. **Try the direct links:**
   - https://account.africastalking.com/apps/sandbox
   - https://account.africastalking.com/apps

3. **Contact Support:**
   - Email: support@africastalking.com
   - They can help you access the developer dashboard

### "I see Apps but no API Key"

1. **Create a new app:**
   - Click "Create App" or "New App"
   - Select "SMS" service
   - The API key will be generated

2. **Check if you're in Sandbox mode:**
   - Sandbox apps have different credentials
   - Make sure you're looking at the right environment

### "I need to upgrade to Production"

1. **Sandbox is free** - good for testing
2. **For production**, you may need to:
   - Verify your account
   - Add payment method
   - Request production access

---

## Quick Checklist

- [ ] Logged into Africa's Talking dashboard
- [ ] Navigated to Apps/Sandbox section
- [ ] Created or selected an app
- [ ] Copied API Key
- [ ] Copied Username
- [ ] Registered Sender ID "MamaSafe"
- [ ] Added credentials to `.env.local`
- [ ] Tested sending SMS

---

## Support

If you're still having trouble finding your API credentials:

1. **Email Support:** support@africastalking.com
2. **Live Chat:** Available in the dashboard (if enabled)
3. **Documentation:** https://developers.africastalking.com/

---

## Next Steps After Getting Credentials

1. Add credentials to `.env.local`
2. Test SMS sending (see `ENROLLMENT_CREDENTIALS_SETUP.md`)
3. Deploy to Netlify with environment variables
4. Monitor SMS delivery in Africa's Talking dashboard

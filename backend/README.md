# WhatsApp Webhook Backend

This backend handles WhatsApp messages from Meta WhatsApp Cloud API.

## Setup (When You Get Credentials)

### 1. Environment Variables

Add these to your `.env.local` or deployment platform:

```env
# WhatsApp Meta API
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_VERIFY_TOKEN=mamasafe_secure_token_2024

# Supabase (for backend operations)
SUPABASE_URL=https://mxjwsdizjpdwfleebucu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Triage Engine
TRIAGE_ENGINE_API_KEY=your_triage_engine_key_here
```

### 2. Deploy Backend

**Option A: Vercel (Recommended)**
```bash
npm install -g vercel
vercel
```

**Option B: Railway**
- Connect your GitHub repo
- Railway auto-detects and deploys

**Option C: Render**
- Create new Web Service
- Connect repo and deploy

### 3. Configure Webhook in Meta

1. Go to Meta Business Suite → WhatsApp → Configuration
2. Set Webhook URL: `https://your-domain.com/api/whatsapp-webhook`
3. Set Verify Token: `mamasafe_secure_token_2024`
4. Subscribe to: `messages` events

### 4. Test

Send a test message to your WhatsApp number and verify it works!

---

## Features

✅ Receives WhatsApp messages
✅ Processes with AI triage
✅ Sends responses
✅ Creates referrals for high-risk cases
✅ Creates tasks for clinic
✅ Sends reminders automatically
✅ Stores everything in Supabase

---

## File Structure

```
backend/
  ├── whatsapp-webhook.ts    # Main webhook handler
  └── README.md              # This file
```

---

## Next Steps

Once you get your Meta WhatsApp credentials, I'll help you:
1. Deploy this backend
2. Configure the webhook
3. Test end-to-end
4. Set up automated reminders

**Just send me the credentials when ready!** 🚀

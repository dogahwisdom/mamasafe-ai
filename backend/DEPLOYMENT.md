# Reminder Sender Deployment Guide

## Overview

The reminder sender service automatically sends medication and appointment reminders via WhatsApp and SMS. It runs every 15 minutes to check for pending reminders.

## Deployment Options

### Option 1: Railway (Recommended - Easiest)

**Why Railway:**
- Simple setup
- Automatic deployments
- Built-in cron support
- $5/month starter plan

**Steps:**

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `mamasafe-ai` repository
   - Select `backend` folder as root

3. **Configure Environment Variables**
   - Go to Variables tab
   - Add all required variables (see below)

4. **Deploy**
   - Railway auto-detects Node.js
   - Runs `npm install` and `npm start`
   - Service starts automatically

5. **Set Up Cron (Optional)**
   - Railway doesn't have built-in cron
   - Use EasyCron to call your service endpoint
   - Or use Railway's scheduled tasks

**Environment Variables:**
```
SUPABASE_URL=https://mxjwsdizjpdwfleebucu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
AFRICAS_TALKING_API_KEY=your_at_key (optional)
AFRICAS_TALKING_USERNAME=your_at_username (optional)
```

---

### Option 2: Vercel (Serverless)

**Why Vercel:**
- Free tier available
- Built-in cron jobs
- Serverless (no server to manage)

**Steps:**

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd backend
   vercel
   ```

3. **Add Environment Variables**
   - Go to Vercel dashboard
   - Project → Settings → Environment Variables
   - Add all required variables

4. **Configure Cron**
   - Cron is already configured in `vercel.json`
   - Runs every 15 minutes automatically
   - No additional setup needed

**Note:** Vercel cron requires Pro plan ($20/month) for custom schedules. Free tier has limited cron options.

---

### Option 3: Render (Free Tier Available)

**Why Render:**
- Free tier available
- Easy setup
- Automatic deployments

**Steps:**

1. **Create Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create Background Worker**
   - Click "New" → "Background Worker"
   - Connect GitHub repo
   - Select `backend` folder
   - Build command: `npm install`
   - Start command: `npm run start`

3. **Add Environment Variables**
   - In Render dashboard
   - Add all required variables

4. **Deploy**
   - Render auto-deploys on push
   - Service runs continuously

**For Cron:**
- Render doesn't have built-in cron
- Use EasyCron or similar service
- Or use Render's scheduled jobs (paid feature)

---

### Option 4: EasyCron (External Scheduler)

**Why EasyCron:**
- Works with any hosting
- Free tier available
- Simple setup

**Steps:**

1. **Deploy Backend Anywhere**
   - Deploy to Railway, Render, or any hosting
   - Create endpoint: `/api/reminder-cron`
   - Endpoint should call `processPendingReminders()`

2. **Set Up EasyCron**
   - Go to [easycron.com](https://easycron.com)
   - Create account
   - Add new cron job
   - URL: `https://your-backend-url.com/api/reminder-cron`
   - Schedule: Every 15 minutes (`*/15 * * * *`)
   - Add header: `X-Auth-Token: your_cron_secret`

3. **Test**
   - EasyCron will call your endpoint
   - Check logs to verify it's working

---

## Environment Variables

### Required

```env
# Supabase
SUPABASE_URL=https://mxjwsdizjpdwfleebucu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# WhatsApp (Meta)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### Optional (for SMS)

```env
# Africa's Talking (Kenya SMS)
AFRICAS_TALKING_API_KEY=your_api_key
AFRICAS_TALKING_USERNAME=your_username
```

### Security (Optional)

```env
# Protect cron endpoint
CRON_SECRET=random_secret_string_here
```

---

## Getting Supabase Service Role Key

**Important:** Use Service Role Key, NOT Anon Key!

1. Go to Supabase dashboard
2. Project Settings → API
3. Copy "service_role" key (not "anon" key)
4. This key has admin access - keep it secret!

---

## Testing

### Local Testing

1. Set up `.env` file with credentials
2. Run: `npm run start`
3. Check console for reminder processing
4. Verify reminders are marked as sent in Supabase

### Production Testing

1. Create a test reminder in Supabase:
   ```sql
   INSERT INTO reminders (
     patient_id, patient_name, phone, channel, type, 
     message, scheduled_for, sent
   ) VALUES (
     'test-id', 'Test Patient', '+254700000000', 'whatsapp', 
     'medication', 'Test message', NOW(), false
   );
   ```

2. Wait for cron to run (or trigger manually)
3. Check if reminder is marked as sent
4. Verify message was received

---

## Monitoring

### Check Logs

- **Railway:** View logs in dashboard
- **Vercel:** View function logs
- **Render:** View service logs

### What to Look For

- ✅ "Found X pending reminder(s)"
- ✅ "Reminder X sent successfully"
- ❌ "Failed to send reminder X"
- ❌ "Error fetching reminders"

### Common Issues

**No reminders found:**
- Check if reminders exist in database
- Verify `scheduled_for` is in the past
- Check `sent` field is `false`

**Reminders not sending:**
- Verify WhatsApp credentials
- Check phone number format
- Review API error messages

**Service not running:**
- Check deployment status
- Verify environment variables
- Check service logs

---

## Cost Estimates

### Railway
- Starter: $5/month
- Pro: $20/month (for more resources)

### Vercel
- Free: Limited cron
- Pro: $20/month (full cron support)

### Render
- Free: Available (with limitations)
- Starter: $7/month

### EasyCron
- Free: 1 job, 1-hour minimum interval
- Paid: $2.50/month (15-minute intervals)

### WhatsApp
- Free: 1,000 conversations/month
- Paid: $0.005-0.09 per conversation

### SMS (Africa's Talking)
- ~KES 1-2 per SMS in Kenya
- Bulk discounts available

---

## Recommended Setup

**For Production:**
1. Deploy to Railway ($5/month)
2. Use EasyCron free tier (if Railway doesn't have cron)
3. Or upgrade to Railway Pro for scheduled tasks

**For Development:**
1. Use Render free tier
2. Test with EasyCron free tier
3. Upgrade when ready for production

---

## Next Steps

1. Choose deployment platform
2. Deploy service
3. Add environment variables
4. Test with sample reminder
5. Monitor logs
6. Go live!

---

**Need help?** Check the main README or service logs for troubleshooting.

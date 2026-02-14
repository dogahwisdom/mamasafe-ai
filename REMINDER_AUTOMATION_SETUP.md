# Automated Reminder System Setup

## Overview

The automated reminder system sends medication and appointment reminders to patients via WhatsApp and SMS without manual intervention.

## How It Works

### 1. Reminder Generation (Clinic Side)

**Daily Process:**
1. Clinic staff clicks "Generate Reminders" on dashboard
2. System creates reminders for:
   - **Appointments**: 24 hours before appointment
   - **Medications**: Scheduled at medication time (morning/afternoon/evening)
3. Reminders saved to Supabase database

### 2. Automated Sending (Backend Service)

**Continuous Process:**
1. Backend service runs every 15 minutes
2. Checks Supabase for pending reminders where:
   - `sent = false`
   - `scheduled_for <= now`
3. For each reminder:
   - Gets patient's preferred channel (WhatsApp/SMS/Both)
   - Sends via appropriate channel(s)
   - Marks as sent in database
4. Logs all activity

## Architecture

```
┌─────────────────────┐
│  Clinic Dashboard    │
│  (Generate Reminders)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase Database   │
│  (Stores Reminders)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Reminder Sender     │
│  (Runs Every 15min)  │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐  ┌─────────┐
│WhatsApp │  │   SMS   │
│   API   │  │   API   │
└─────────┘  └─────────┘
```

## Setup Steps

### Step 1: Deploy Reminder Sender Service

Choose a deployment platform (see `backend/DEPLOYMENT.md`):

**Recommended: Railway**
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Connect GitHub repo
4. Select `backend` folder
5. Add environment variables
6. Deploy

### Step 2: Configure Environment Variables

Add these in your deployment platform:

```env
SUPABASE_URL=https://mxjwsdizjpdwfleebucu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### Step 3: Set Up Cron (If Needed)

**Railway/Render:**
- Use EasyCron to call your service endpoint every 15 minutes
- Or use platform's scheduled tasks

**Vercel:**
- Already configured in `vercel.json`
- Runs automatically

### Step 4: Test

1. Create a test reminder in Supabase
2. Wait for cron to run (or trigger manually)
3. Verify reminder is sent and marked as sent

## Medication Reminder Scheduling

### How Medication Times Work

1. **When medication is added:**
   - Medication has `time` field (e.g., "08:00 AM")
   - Or `type` field (morning/afternoon/evening)

2. **When reminders are generated:**
   - System parses medication time
   - Schedules reminder for that specific time today
   - Example: Medication at "8:00 AM" → Reminder at 8:00 AM

3. **Default times (if no time specified):**
   - Morning: 8:00 AM
   - Afternoon: 2:00 PM
   - Evening: 7:00 PM

### Example Flow

**Patient has medication:**
- Name: "Ferrous Sulfate"
- Time: "08:00 AM"
- Dosage: "200mg"

**Reminder generated:**
- Scheduled for: Today at 8:00 AM
- Message: "Habari [Name]. Tafadhali kumbuka kuchukua Ferrous Sulfate (200mg)..."

**At 8:00 AM:**
- Backend service checks reminders
- Finds this reminder
- Sends via WhatsApp/SMS
- Marks as sent

## Patient Channel Preferences

### Current Behavior

- Default: Sends via both WhatsApp and SMS (if configured)
- Future: Patients can choose preference in settings

### To Add Patient Preferences

1. Add `preferred_channel` column to `patients` table (already in schema)
2. Update patient settings UI
3. Service automatically respects preference

## SMS Integration (Optional)

### Africa's Talking (Recommended for Kenya)

1. **Sign Up:**
   - Go to [africastalking.com](https://africastalking.com)
   - Create account
   - Get API key and username

2. **Add to Environment:**
   ```env
   AFRICAS_TALKING_API_KEY=your_key
   AFRICAS_TALKING_USERNAME=your_username
   ```

3. **Service automatically uses SMS** when:
   - Patient prefers SMS
   - WhatsApp fails
   - Both channels selected

### Alternative SMS Providers

- **Twilio**: International, reliable
- **AWS SNS**: Scalable, global
- **Vonage**: Good rates

Update `sendSMS()` function in `reminder-sender.ts` for different providers.

## Monitoring

### Check Service Status

**Railway:**
- Dashboard → View logs
- See reminder processing in real-time

**Vercel:**
- Functions → View logs
- See cron execution

**Render:**
- Services → View logs
- Monitor service health

### What to Monitor

- ✅ Reminders found and sent
- ❌ Failed sends (check credentials)
- ⚠️ Rate limits (WhatsApp/SMS)
- 📊 Daily send counts

## Troubleshooting

### Reminders Not Sending

1. **Check service is running:**
   - Verify deployment status
   - Check service logs

2. **Check environment variables:**
   - All required variables set?
   - Credentials correct?

3. **Check Supabase:**
   - Reminders exist?
   - `scheduled_for` is in past?
   - `sent` is `false`?

4. **Check API credentials:**
   - WhatsApp token valid?
   - SMS credentials correct?

### Service Not Running

1. **Check deployment:**
   - Is service deployed?
   - Any build errors?

2. **Check cron:**
   - Is cron configured?
   - Is it calling the endpoint?

3. **Check logs:**
   - Any error messages?
   - Service crashing?

## Cost Optimization

### WhatsApp
- Free tier: 1,000 conversations/month
- Use WhatsApp as primary channel
- Only use SMS as backup

### SMS
- ~KES 1-2 per SMS
- Use only when:
  - Patient prefers SMS
  - WhatsApp unavailable
  - Critical reminders

### Service Hosting
- Railway: $5/month
- Render: Free tier available
- Vercel: Free tier (limited cron)

## Best Practices

1. **Generate reminders daily** (clinic staff)
2. **Monitor service logs** regularly
3. **Test with sample reminders** before going live
4. **Set up alerts** for service failures
5. **Track send rates** to monitor costs
6. **Respect patient preferences** when implemented

## Next Steps

1. ✅ Deploy reminder sender service
2. ✅ Configure environment variables
3. ✅ Set up cron/scheduler
4. ✅ Test with sample reminders
5. ✅ Monitor and adjust
6. ✅ Go live!

---

**The system is now fully automated!** Reminders will be sent automatically without manual intervention.

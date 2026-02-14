# Automated Reminder Sender Service

Automated service that sends medication and appointment reminders via WhatsApp and SMS.

## Features

- ✅ Automatically checks for pending reminders every 15 minutes
- ✅ Sends via WhatsApp (Meta API)
- ✅ Sends via SMS (Africa's Talking - Kenya)
- ✅ Respects patient channel preferences
- ✅ Marks reminders as sent
- ✅ Error handling and logging
- ✅ Rate limiting protection

## Quick Start

### Local Development

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Run locally:
```bash
npm run dev
```

This will check for reminders every time you run it.

### Production Deployment

Choose one of these options:

#### Option 1: Railway (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Connect GitHub repo
4. Select `backend` folder
5. Add environment variables
6. Deploy

Railway will automatically run the service.

#### Option 2: Vercel (Serverless)

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy:
```bash
cd backend
vercel
```

3. Configure cron in `vercel.json` (already set up)

#### Option 3: Render

1. Create account at [render.com](https://render.com)
2. Create new "Background Worker"
3. Connect repo
4. Set build command: `npm install`
5. Set start command: `npm run start`
6. Add environment variables
7. Deploy

#### Option 4: EasyCron (External)

1. Deploy backend to any hosting
2. Create endpoint: `/api/reminder-cron`
3. Set up EasyCron to call endpoint every 15 minutes
4. Add `CRON_SECRET` header for security

## Environment Variables

Required:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (not anon key!)
- `WHATSAPP_ACCESS_TOKEN` - Meta WhatsApp API token
- `WHATSAPP_PHONE_NUMBER_ID` - Meta WhatsApp phone number ID

Optional (for SMS):
- `AFRICAS_TALKING_API_KEY` - Africa's Talking API key
- `AFRICAS_TALKING_USERNAME` - Africa's Talking username

Security:
- `CRON_SECRET` - Random secret for endpoint protection

## How It Works

1. **Service runs every 15 minutes** (configurable)
2. **Checks Supabase** for pending reminders where:
   - `sent = false`
   - `scheduled_for <= now`
3. **For each reminder:**
   - Gets patient's preferred channel (WhatsApp/SMS/Both)
   - Sends via appropriate channel(s)
   - Marks as sent in database
4. **Logs results** for monitoring

## Scheduling

The service checks for reminders every 15 minutes by default.

To change frequency:
- **Railway/Render**: Update cron schedule in deployment settings
- **Vercel**: Update `schedule` in `vercel.json`
- **EasyCron**: Configure in EasyCron dashboard

## Monitoring

Check logs to see:
- How many reminders were found
- Which reminders were sent successfully
- Any errors that occurred

## Testing

Test locally:
```bash
npm run start
```

This will process pending reminders once and exit.

## Troubleshooting

### Reminders not sending
- Check environment variables are set
- Verify WhatsApp/SMS credentials are correct
- Check Supabase connection
- Review logs for errors

### Rate limiting
- Service includes 500ms delay between messages
- WhatsApp: 1,000 free messages/month
- SMS: Check Africa's Talking limits

### Missing reminders
- Ensure clinic generates reminders daily
- Check `scheduled_for` timestamps are correct
- Verify reminders exist in database

## Support

For issues, check:
1. Environment variables
2. API credentials
3. Supabase connection
4. Service logs

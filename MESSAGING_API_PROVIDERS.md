# Messaging API Providers Guide

## Recommended Providers for Kenya/Africa

### SMS Service Providers

#### 1. Africa's Talking (RECOMMENDED for Kenya)
**Best for:** Kenya, Tanzania, Uganda, Rwanda, and other African countries
- **Website:** https://africastalking.com/
- **Pricing:** Pay-as-you-go, competitive rates for Kenya
- **Features:**
  - SMS, USSD, Voice, Airtime
  - Excellent coverage in Kenya
  - Easy integration
  - Developer-friendly API
  - Good documentation
- **Sign up:** https://account.africastalking.com/auth/signup
- **API Docs:** https://developers.africastalking.com/docs/sms/overview
- **Why choose:** Already integrated in your codebase, best rates for Kenya

#### 2. Twilio
**Best for:** Global coverage, reliable service
- **Website:** https://www.twilio.com/
- **Pricing:** Pay-as-you-go, $0.0075 per SMS in Kenya
- **Features:**
  - SMS, Voice, WhatsApp, Video
  - Global coverage
  - Excellent documentation
  - Free trial credits
- **Sign up:** https://www.twilio.com/try-twilio
- **API Docs:** https://www.twilio.com/docs/sms
- **Why choose:** Most reliable, global support, also supports WhatsApp

#### 3. Vonage (formerly Nexmo)
**Best for:** International messaging
- **Website:** https://www.vonage.com/
- **Pricing:** Pay-as-you-go
- **Features:**
  - SMS, Voice, Verify API
  - Good global coverage
- **Sign up:** https://dashboard.nexmo.com/sign-up
- **API Docs:** https://developer.vonage.com/api/sms

---

### WhatsApp API Providers

#### 1. Meta WhatsApp Business API (OFFICIAL - RECOMMENDED)
**Best for:** Official WhatsApp integration, production use
- **Website:** https://business.whatsapp.com/products/business-api
- **Pricing:** 
  - Free tier: 1,000 conversations/month
  - Paid: Pay per conversation after free tier
- **Features:**
  - Official WhatsApp Business API
  - Direct integration with Meta
  - Best for production
  - Requires business verification
- **Sign up:** https://business.facebook.com/
- **Setup Guide:** See `META_WHATSAPP_SETUP.md` in this repo
- **API Docs:** https://developers.facebook.com/docs/whatsapp
- **Why choose:** Official, most reliable, best for production

#### 2. Twilio WhatsApp API
**Best for:** Easy integration, if already using Twilio for SMS
- **Website:** https://www.twilio.com/whatsapp
- **Pricing:** Pay-per-message, competitive rates
- **Features:**
  - WhatsApp messaging via Twilio
  - Same API as SMS (easy integration)
  - Good documentation
  - Free trial
- **Sign up:** https://www.twilio.com/try-twilio
- **API Docs:** https://www.twilio.com/docs/whatsapp
- **Why choose:** Unified SMS + WhatsApp, easy to use

#### 3. 360dialog
**Best for:** WhatsApp Business API without Meta direct integration
- **Website:** https://www.360dialog.com/
- **Pricing:** Pay-per-message
- **Features:**
  - WhatsApp Business API provider
  - Good documentation
  - Easy setup
- **Sign up:** https://www.360dialog.com/signup
- **API Docs:** https://docs.360dialog.com/

#### 4. MessageBird
**Best for:** Multi-channel messaging (SMS + WhatsApp)
- **Website:** https://www.messagebird.com/
- **Pricing:** Pay-per-message
- **Features:**
  - SMS, WhatsApp, Voice
  - Multi-channel platform
- **Sign up:** https://www.messagebird.com/en/signup
- **API Docs:** https://developers.messagebird.com/

---

## Recommended Setup for MamaSafe AI

### Option 1: Africa's Talking + Meta WhatsApp (RECOMMENDED)
**Best for:** Cost-effective, Kenya-focused

**SMS:** Africa's Talking
- Sign up: https://account.africastalking.com/auth/signup
- Get API Key: https://account.africastalking.com/apps/sandbox/settings/key
- Already integrated in your codebase

**WhatsApp:** Meta WhatsApp Business API
- Sign up: https://business.facebook.com/
- Setup: Follow `META_WHATSAPP_SETUP.md`
- Get Access Token from Meta Business Manager

**Why this combo:**
- Best SMS rates for Kenya
- Official WhatsApp API
- Already partially integrated

---

### Option 2: Twilio (All-in-One)
**Best for:** Simplicity, unified platform

**Both SMS & WhatsApp:** Twilio
- Sign up: https://www.twilio.com/try-twilio
- Get Account SID & Auth Token
- Enable WhatsApp Sandbox: https://www.twilio.com/console/sms/whatsapp/learn

**Why this combo:**
- One provider for both
- Easy integration
- Good documentation
- Free trial credits

---

## Quick Setup Links

### Africa's Talking
1. **Sign Up:** https://account.africastalking.com/auth/signup
2. **Dashboard:** https://account.africastalking.com/
3. **API Keys:** https://account.africastalking.com/apps/sandbox/settings/key
4. **Documentation:** https://developers.africastalking.com/docs/sms/overview
5. **Pricing:** https://africastalking.com/pricing

### Meta WhatsApp Business API
1. **Business Manager:** https://business.facebook.com/
2. **WhatsApp Business:** https://business.whatsapp.com/
3. **Developer Portal:** https://developers.facebook.com/
4. **WhatsApp API Docs:** https://developers.facebook.com/docs/whatsapp
5. **Getting Started:** https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

### Twilio
1. **Sign Up:** https://www.twilio.com/try-twilio
2. **Console:** https://www.twilio.com/console
3. **SMS Docs:** https://www.twilio.com/docs/sms
4. **WhatsApp Docs:** https://www.twilio.com/docs/whatsapp
5. **Pricing:** https://www.twilio.com/pricing

---

## Environment Variables Needed

### For Africa's Talking + Meta WhatsApp:
```env
# SMS (Africa's Talking)
VITE_AFRICAS_TALKING_USERNAME=your_username
VITE_AFRICAS_TALKING_API_KEY=your_api_key

# WhatsApp (Meta)
VITE_WHATSAPP_ACCESS_TOKEN=your_access_token
VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
VITE_WHATSAPP_VERIFY_TOKEN=your_verify_token
```

### For Twilio (All-in-One):
```env
# Twilio (SMS + WhatsApp)
VITE_TWILIO_ACCOUNT_SID=your_account_sid
VITE_TWILIO_AUTH_TOKEN=your_auth_token
VITE_TWILIO_PHONE_NUMBER=your_twilio_number
VITE_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## Cost Comparison (Approximate)

### SMS (per message):
- **Africa's Talking:** ~KES 0.50-1.00 per SMS in Kenya
- **Twilio:** ~$0.0075 (KES 0.75) per SMS
- **Vonage:** ~$0.005-0.01 per SMS

### WhatsApp (per conversation):
- **Meta WhatsApp:** Free for first 1,000 conversations/month, then pay-per-conversation
- **Twilio WhatsApp:** ~$0.005-0.01 per message
- **360dialog:** Pay-per-message, varies by region

---

## Recommendation

**For MamaSafe AI in Kenya, I recommend:**

1. **SMS:** Africa's Talking
   - Best rates for Kenya
   - Already integrated
   - Excellent local support

2. **WhatsApp:** Meta WhatsApp Business API
   - Official API
   - Free tier available
   - Best for production
   - Already documented in your repo

**Alternative:** Use Twilio for both if you want one provider and don't mind slightly higher SMS costs.

---

## Next Steps

1. **Sign up for accounts:**
   - Africa's Talking: https://account.africastalking.com/auth/signup
   - Meta Business: https://business.facebook.com/

2. **Get API credentials** from each platform

3. **Add credentials** to your `.env.local` file

4. **Test** using the existing messaging service

5. **Deploy** with environment variables set in Netlify

---

## Support & Documentation

- **Africa's Talking Support:** support@africastalking.com
- **Meta WhatsApp Support:** https://developers.facebook.com/support/
- **Twilio Support:** https://support.twilio.com/

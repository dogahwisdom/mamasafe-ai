# 📱 How to Apply for Meta WhatsApp Cloud API

## Step-by-Step Guide

### Step 1: Create/Login to Meta Business Account

1. Go to: **https://business.facebook.com/**
2. Click **"Create Account"** (or login if you have one)
3. Enter your business details:
   - Business name: "MamaSafe AI" (or your organization name)
   - Your name and email
   - Business type: Healthcare/Non-profit (if applicable)

---

### Step 2: Create Facebook Business Page

1. In Meta Business Suite, go to **"Pages"** (left sidebar)
2. Click **"Create New Page"** or use existing page
3. Fill in:
   - Page name: "MamaSafe AI" or "MamaSafe Healthcare"
   - Category: Healthcare/Medical/Non-profit
   - Description: Brief description of your maternal healthcare platform
4. Complete the page setup

**Note:** You need a verified Facebook Business Page to use WhatsApp API

---

### Step 3: Access Meta for Developers

1. Go to: **https://developers.facebook.com/**
2. Click **"My Apps"** (top right)
3. Click **"Create App"**
4. Select **"Business"** as the app type
5. Fill in:
   - App name: "MamaSafe AI"
   - App contact email: your email
   - Business account: Select your business account
6. Click **"Create App"**

---

### Step 4: Add WhatsApp Product

1. In your app dashboard, find **"WhatsApp"** in the product list
2. Click **"Set Up"** or **"Add Product"**
3. You'll be taken to WhatsApp configuration

---

### Step 5: Get Started with WhatsApp Cloud API

1. In the WhatsApp section, you'll see:
   - **"Get Started"** or **"Start using the API"**
2. Click to begin setup
3. You'll need:
   - Phone number (for testing - can use your personal number initially)
   - Business verification (may take 1-3 days)

---

### Step 6: Get Your Access Token

1. In WhatsApp settings, go to **"API Setup"**
2. You'll see:
   - **Temporary Access Token** (for testing - expires in 24 hours)
   - **Permanent Access Token** (after business verification)
3. Copy the token - you'll need it for the backend

---

### Step 7: Get Your Phone Number ID & Business Account ID

1. In WhatsApp settings, you'll see:
   - **Phone Number ID** (starts with numbers)
   - **WhatsApp Business Account ID** (WABA ID)
2. Copy both - you'll need these too

---

### Step 8: Business Verification (Required for Production)

1. Go to **Business Settings** → **Security** → **Business Verification**
2. Click **"Start Verification"**
3. You'll need to provide:
   - Business documents (registration, license, etc.)
   - Business address
   - Contact information
4. Submit and wait for approval (1-3 business days)

**Note:** You can test with temporary token, but need verification for production

---

## 🔑 What You'll Get

After setup, you'll have:

1. **Access Token** - For API authentication
2. **Phone Number ID** - Your WhatsApp number identifier
3. **Business Account ID** - Your WABA ID
4. **Webhook URL** - Where Meta sends incoming messages
5. **Webhook Verify Token** - For webhook security

---

##  Quick Links

- **Meta Business Suite:** https://business.facebook.com/
- **Meta Developers:** https://developers.facebook.com/
- **WhatsApp Cloud API Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **WhatsApp Business API Guide:** https://developers.facebook.com/docs/whatsapp/getting-started

---

## Important Notes

1. **Phone Number:** You can start with your personal number for testing, but you'll need a dedicated business number for production
2. **Verification:** Business verification is required for production use (not needed for initial testing)
3. **Free Tier:** 1,000 conversations/month are free
4. **Rate Limits:** 1,000 conversations per 24 hours (free tier)

---

##  After You Get Access

Once you have:
- Access Token
- Phone Number ID
- Business Account ID

**Let me know and I'll:**
1. Create the backend webhook server
2. Integrate with your triage AI
3. Set up Supabase storage
4. Deploy everything

---

##  Pro Tips

1. **Start with Sandbox:** Meta provides a sandbox for testing (no verification needed)
2. **Use Test Numbers:** You can add test phone numbers for development
3. **Webhook Testing:** Use ngrok or similar for local webhook testing
4. **Documentation:** Keep the Meta docs open - they're very helpful

---

## 🆘 Need Help?

If you get stuck at any step:
1. Check Meta's official docs: https://developers.facebook.com/docs/whatsapp
2. Meta Developer Community: https://developers.facebook.com/community/
3. Let me know which step you're on and I can help!

---

**Start here:** https://business.facebook.com/

Good luck! 

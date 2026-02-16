# Environment Variables Setup Instructions

## Your Africa's Talking API Key

I've received your API key. Now you need to add it to your `.env.local` file along with your username.

## Step 1: Find Your Username

In the same Africa's Talking dashboard where you found the API key, you should also see:
- **Username** (usually `sandbox` for sandbox apps, or your account username)

If you can't find it:
1. Go to: https://account.africastalking.com/apps/sandbox/settings/key
2. Look for "Username" or "API Username" field
3. It's usually displayed right next to or near the API Key

## Step 2: Add to .env.local

Open or create `.env.local` in your project root and add:

```env
# Africa's Talking SMS API
# IMPORTANT: Do NOT commit real API keys to the repo.
# Use a placeholder here and set the real value in environment variables (e.g. Netlify).
VITE_AFRICAS_TALKING_API_KEY=YOUR_AFRICAS_TALKING_API_KEY_HERE
VITE_AFRICAS_TALKING_USERNAME=your_username_here
```

**Replace `your_username_here` with your actual username** (usually `sandbox` for sandbox apps).

## Step 3: Register Sender ID (Important!)

Before you can send SMS, you need to register a Sender ID:

1. Go to: https://account.africastalking.com/apps/sandbox
2. Click on your app
3. Look for **"Sender ID"** or **"SMS Settings"**
4. Click **"Register Sender ID"** or **"Add Sender ID"**
5. Enter: **"MamaSafe"**
6. Submit and wait for approval (usually takes a few hours to 1 day)

**Note:** Until your Sender ID is approved, SMS sending may not work.

## Step 4: Restart Your Dev Server

After adding the credentials:

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 5: Test SMS Sending

1. Enroll a test patient
2. Check if SMS is sent
3. Check browser console for any errors

## Complete .env.local Example

Here's what your complete `.env.local` should look like (add other variables as needed):

```env
# Supabase
VITE_SUPABASE_URL=https://mxjwsdizjpdwfleebucu.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Africa's Talking SMS API
VITE_AFRICAS_TALKING_API_KEY=YOUR_AFRICAS_TALKING_API_KEY_HERE
VITE_AFRICAS_TALKING_USERNAME=your_username_here

# WhatsApp (Meta) - Add when ready
VITE_WHATSAPP_ACCESS_TOKEN=your_whatsapp_token_here
VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

## Troubleshooting

### "Username not found"
- For sandbox apps, username is usually: `sandbox`
- Check the same page where you found the API key
- It might be labeled as "API Username" or just "Username"

### "SMS not sending"
1. Check if Sender ID is registered and approved
2. Verify API key and username are correct
3. Check phone number format (should include country code, e.g., +254...)
4. Check browser console for errors
5. Check Africa's Talking dashboard for delivery status

### "Invalid credentials"
- Make sure there are no extra spaces in the API key
- Copy the entire API key (it's long)
- Verify username matches exactly

## Next Steps

1. ✅ Add API key to `.env.local` (done - you have the key)
2. ⏳ Find and add username
3. ⏳ Register Sender ID "MamaSafe"
4. ⏳ Wait for Sender ID approval
5. ⏳ Test SMS sending
6. ⏳ Set up WhatsApp API (when ready)

## Security Note

⚠️ **Never commit `.env.local` to Git** - it's already in `.gitignore` for your protection.

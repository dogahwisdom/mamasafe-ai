# Enrollment Credentials Delivery Setup

## Overview

When a patient is enrolled, the system automatically sends their login credentials via both SMS and WhatsApp. This ensures patients can immediately access their portal.

## What Gets Sent

### Message Content (Swahili)

```
Habari [FirstName]! Karibu kwenye MamaSafe.

AKOUNTI YAKO:
Nambari: [Phone Number]
PIN: 1234

LINGANIA HAPA:
[Portal URL]

Unaweza kuingia sasa na kuanza kutumia huduma zetu za afya ya uzazi.

Asante!
```

### Credentials Included

- **Phone Number**: Patient's registered phone number
- **PIN**: Default PIN is `1234` (can be changed later)
- **Portal URL**: Link to access the patient portal

## Setup Requirements

### 1. WhatsApp API (Meta)

**Required Environment Variables:**
```env
VITE_WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

**Setup Steps:**
1. Follow instructions in `META_WHATSAPP_SETUP.md`
2. Get access token from Meta Developer Console
3. Get phone number ID from WhatsApp Business Account
4. Add to `.env.local` file

### 2. SMS API (Africa's Talking)

**Required Environment Variables:**
```env
VITE_AFRICAS_TALKING_API_KEY=your_api_key
VITE_AFRICAS_TALKING_USERNAME=your_username
```

**Setup Steps:**
1. Sign up at [africastalking.com](https://africastalking.com)
2. Create an application
3. Get API key and username
4. Register sender ID "MamaSafe" (required for SMS)
5. Add to `.env.local` file

## How It Works

### Enrollment Flow

1. **Clinic staff enrolls patient**
   - Fills enrollment form
   - Submits patient data

2. **System creates account**
   - Creates patient record in database
   - Creates user account with PIN `1234`
   - Generates patient ID

3. **Credentials sent automatically**
   - SMS sent via Africa's Talking
   - WhatsApp sent via Meta API
   - Both messages sent simultaneously
   - Portal URL included in message

4. **Patient receives credentials**
   - Gets SMS with login details
   - Gets WhatsApp message with login details
   - Can log in immediately

### Error Handling

- If SMS fails, WhatsApp still sends
- If WhatsApp fails, SMS still sends
- If both fail, enrollment still succeeds
- Errors are logged but don't block enrollment

## Testing

### Test Enrollment

1. Enroll a test patient
2. Check phone for SMS
3. Check WhatsApp for message
4. Verify credentials work
5. Test login with received PIN

### Verify Credentials

- Phone number: Should match enrolled number
- PIN: Should be `1234` (default)
- Portal URL: Should be current app URL

## Troubleshooting

### No SMS Received

1. Check Africa's Talking credentials
2. Verify sender ID is registered
3. Check phone number format (should include country code)
4. Review Africa's Talking dashboard for errors

### No WhatsApp Received

1. Check Meta WhatsApp credentials
2. Verify phone number is registered with WhatsApp
3. Check Meta Developer Console for errors
4. Ensure WhatsApp Business Account is active

### Both Failed

1. Check environment variables are set
2. Verify API credentials are valid
3. Check network connectivity
4. Review browser console for errors

## Security Notes

- Default PIN is `1234` for all patients
- Patients should change PIN after first login
- Credentials sent via secure APIs
- Phone numbers are validated before sending

## Future Enhancements

- Generate unique PINs per patient
- Allow clinic to set custom PINs
- Add PIN reset functionality
- Support for multiple languages
- Delivery status tracking

## Environment Variables Summary

Add these to your `.env.local` file:

```env
# WhatsApp (Meta)
VITE_WHATSAPP_ACCESS_TOKEN=your_token
VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# SMS (Africa's Talking)
VITE_AFRICAS_TALKING_API_KEY=your_key
VITE_AFRICAS_TALKING_USERNAME=your_username
```

## Support

For issues:
1. Check environment variables
2. Verify API credentials
3. Test with test phone number
4. Review console logs
5. Check API provider dashboards

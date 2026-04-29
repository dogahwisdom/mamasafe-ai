/**
 * Automated Reminder Sender Service
 * 
 * This service automatically sends pending reminders via WhatsApp and SMS.
 * 
 * Deployment Options:
 * 1. Railway - Deploy as Node.js service with cron
 * 2. Vercel - Use Vercel Cron Jobs
 * 3. Render - Use scheduled jobs
 * 4. EasyCron - External cron service
 * 
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - WHATSAPP_ACCESS_TOKEN
 * - WHATSAPP_PHONE_NUMBER_ID
 * - AFRICAS_TALKING_API_KEY (optional, for SMS)
 * - AFRICAS_TALKING_USERNAME (optional, for SMS)
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// WhatsApp API configuration
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

// Africa's Talking SMS configuration (for Kenya)
const AT_API_KEY = process.env.AFRICAS_TALKING_API_KEY || '';
const AT_USERNAME = process.env.AFRICAS_TALKING_USERNAME || '';
const AT_SMS_URL = 'https://api.africastalking.com/version1/messaging';

interface Reminder {
  id: string;
  patient_id: string;
  patient_name: string;
  phone: string;
  channel: 'whatsapp' | 'sms' | 'both';
  type: 'appointment' | 'medication' | 'symptom_checkin';
  message: string;
  scheduled_for: string;
  sent: boolean;
}

interface WhatsAppSendResult {
  success: boolean;
  metaMessageId?: string;
  error?: string;
}

/**
 * Send WhatsApp message
 */
async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<WhatsAppSendResult> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('WhatsApp credentials not configured');
    return { success: false, error: 'whatsapp_not_configured' };
  }

  try {
    const cleanPhone = phone.replace(/[^0-9]/g, ''); // Remove all non-digits
    const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp API Error:', error);
      return {
        success: false,
        error: error?.error?.message || 'meta_send_failed',
      };
    }

    const result = await response.json();
    const metaMessageId: string | undefined = result.messages?.[0]?.id;
    console.log(`WhatsApp message sent to ${phone}:`, metaMessageId);
    return { success: true, metaMessageId };
  } catch (error) {
    console.error(`Error sending WhatsApp to ${phone}:`, error);
    return { success: false, error: 'whatsapp_exception' };
  }
}

async function logWhatsAppReminderMessage(params: {
  reminderId: string;
  patientId: string;
  phone: string;
  body: string;
  status: 'sent' | 'failed';
  metaMessageId?: string;
  rawPayload?: Record<string, unknown>;
}) {
  const { error } = await supabase.from('whatsapp_messages').insert({
    patient_id: params.patientId,
    related_reminder_id: params.reminderId,
    phone: params.phone,
    direction: 'outbound',
    message_type: 'text',
    body: params.body,
    status: params.status,
    meta_message_id: params.metaMessageId || null,
    raw_payload: params.rawPayload || {},
    sent_at: params.status === 'sent' ? new Date().toISOString() : null,
    failed_at: params.status === 'failed' ? new Date().toISOString() : null,
  });

  if (error) {
    console.error('Failed to log reminder whatsapp message:', error.message);
  }
}

/**
 * Send SMS via Africa's Talking
 */
async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!AT_API_KEY || !AT_USERNAME) {
    console.warn('Africa\'s Talking credentials not configured');
    return false;
  }

  try {
    const cleanPhone = phone.startsWith('+') ? phone.substring(1) : phone;
    
    const response = await fetch(AT_SMS_URL, {
      method: 'POST',
      headers: {
        'ApiKey': AT_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to: cleanPhone,
        message: message,
        from: 'MamaSafe', // Sender ID (must be registered)
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SMS API Error:', error);
      return false;
    }

    const result = await response.json();
    console.log(`SMS sent to ${phone}:`, result);
    return result.SMSMessageData?.Recipients?.[0]?.statusCode === 101;
  } catch (error) {
    console.error(`Error sending SMS to ${phone}:`, error);
    return false;
  }
}

/**
 * Get patient's preferred channel
 */
async function getPatientChannelPreference(patientId: string): Promise<'whatsapp' | 'sms' | 'both'> {
  try {
    const { data } = await supabase
      .from('patients')
      .select('preferred_channel')
      .eq('id', patientId)
      .single();

    // Default to 'both' if not set
    return (data?.preferred_channel as 'whatsapp' | 'sms' | 'both') || 'both';
  } catch (error) {
    console.error('Error fetching patient preference:', error);
    return 'both'; // Default
  }
}

/**
 * Send reminder via appropriate channel(s)
 */
async function sendReminder(reminder: Reminder): Promise<boolean> {
  const channel = reminder.channel === 'both' 
    ? await getPatientChannelPreference(reminder.patient_id)
    : reminder.channel;

  let sent = false;

  // Send via WhatsApp
  if (channel === 'whatsapp' || channel === 'both') {
    const waResult = await sendWhatsAppMessage(reminder.phone, reminder.message);
    await logWhatsAppReminderMessage({
      reminderId: reminder.id,
      patientId: reminder.patient_id,
      phone: reminder.phone,
      body: reminder.message,
      status: waResult.success ? 'sent' : 'failed',
      metaMessageId: waResult.metaMessageId,
      rawPayload: waResult.error ? { error: waResult.error } : {},
    });
    if (waResult.success) sent = true;
  }

  // Send via SMS
  if (channel === 'sms' || channel === 'both') {
    const smsSent = await sendSMS(reminder.phone, reminder.message);
    if (smsSent) sent = true;
  }

  return sent;
}

/**
 * Process pending reminders
 */
export async function processPendingReminders(): Promise<void> {
  console.log('🔔 Checking for pending reminders...');
  
  const now = new Date().toISOString();

  try {
    // Fetch pending reminders
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('sent', false)
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(50); // Process max 50 at a time

    if (error) {
      console.error('Error fetching reminders:', error);
      return;
    }

    if (!reminders || reminders.length === 0) {
      console.log('✅ No pending reminders');
      return;
    }

    console.log(`📬 Found ${reminders.length} pending reminder(s)`);

    // Process each reminder
    let successCount = 0;
    let failCount = 0;

    for (const reminder of reminders) {
      try {
        console.log(`Sending reminder ${reminder.id} to ${reminder.phone}...`);
        
        const sent = await sendReminder(reminder as Reminder);

        if (sent) {
          // Mark as sent
          await supabase
            .from('reminders')
            .update({
              sent: true,
              sent_at: new Date().toISOString(),
            })
            .eq('id', reminder.id);

          successCount++;
          console.log(`✅ Reminder ${reminder.id} sent successfully`);
        } else {
          failCount++;
          console.error(`❌ Failed to send reminder ${reminder.id}`);
        }

        // Small delay between messages to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        failCount++;
      }
    }

    console.log(`\n📊 Summary: ${successCount} sent, ${failCount} failed`);
  } catch (error) {
    console.error('Fatal error processing reminders:', error);
  }
}

/**
 * Main handler for serverless functions
 */
export async function handler(req: any, res: any): Promise<void> {
  // Verify request (optional - add auth token check)
  const authToken = req.headers['x-auth-token'];
  if (process.env.CRON_SECRET && authToken !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await processPendingReminders();
    res.status(200).json({ 
      success: true, 
      message: 'Reminders processed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// For direct execution (testing or cron)
if (require.main === module) {
  processPendingReminders()
    .then(() => {
      console.log('✅ Reminder processing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

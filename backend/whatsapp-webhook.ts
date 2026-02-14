/**
 * WhatsApp Webhook Backend
 * 
 * Handles incoming WhatsApp messages from Meta WhatsApp Cloud API.
 * Processes messages through AI triage, sends responses, and manages
 * referrals and tasks for high-risk cases.
 * 
 * Deployment: Deploy as serverless function (Vercel/Railway/Render)
 * 
 * Required Environment Variables:
 * - WHATSAPP_ACCESS_TOKEN
 * - WHATSAPP_PHONE_NUMBER_ID
 * - WHATSAPP_VERIFY_TOKEN
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - TRIAGE_ENGINE_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { analyzeSymptoms } from '../services/triageAnalysisService';
import { RiskLevel } from '../types';

// Initialize Supabase with service role key (for backend operations)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// WhatsApp API configuration
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'mamasafe_secure_token_2024';

/**
 * Send WhatsApp message via Meta API
 */
async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('+', ''), // Remove + from phone number
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp API Error:', error);
      throw new Error(`Failed to send message: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('Message sent successfully:', result);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * Find patient by phone number
 */
async function findPatientByPhone(phone: string): Promise<any> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Create or update patient from WhatsApp message
 */
async function createOrUpdatePatient(phone: string, name?: string): Promise<string> {
  // Check if patient exists
  const existing = await findPatientByPhone(phone);
  
  if (existing) {
    return existing.id;
  }

  // Create new patient
  const { data, error } = await supabase
    .from('patients')
    .insert({
      name: name || 'Unknown Patient',
      phone,
      age: 25, // Default, should be updated
      gestational_weeks: 12, // Default, should be updated
      location: 'Unknown',
      risk_status: 'Low',
      alerts: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating patient:', error);
    throw error;
  }

  return data.id;
}

/**
 * Process incoming WhatsApp message
 */
async function processIncomingMessage(from: string, messageBody: string): Promise<void> {
  try {
    const phone = from.includes('+') ? from : `+${from}`;
    
    // Find or create patient
    const patientId = await createOrUpdatePatient(phone);
    const patient = await findPatientByPhone(phone);

    if (!patient) {
      await sendWhatsAppMessage(phone, 'Habari. Welcome to MamaSafe AI. We are setting up your profile. Please wait...');
      return;
    }

    // Analyze symptoms using triage AI
    const triageResult = await analyzeSymptoms(
      messageBody,
      patient.gestational_weeks || 12,
      JSON.stringify(patient.alerts || [])
    );

    // Send response to patient
    await sendWhatsAppMessage(phone, triageResult.draftResponse);

    // Create referral if high risk
    if (triageResult.riskLevel === RiskLevel.HIGH || triageResult.riskLevel === RiskLevel.CRITICAL) {
      await supabase.from('referrals').insert({
        patient_id: patientId,
        patient_name: patient.name,
        from_facility: 'MamaSafe Clinic',
        to_facility: triageResult.recommendedAction.includes('Level 4') 
          ? 'Level 4/5 Hospital' 
          : 'Local Clinic',
        reason: triageResult.reasoning,
        status: 'pending',
      });

      // Create task for clinic
      await supabase.from('tasks').insert({
        patient_id: patientId,
        patient_name: patient.name,
        type: 'Triage Alert',
        deadline: 'Due immediately',
        resolved: false,
        notes: `High-risk triage: ${triageResult.reasoning}`,
        timestamp: Date.now(),
      });
    }

    // Store conversation (optional - for analytics)
    // You can create a conversations table if needed

  } catch (error) {
    console.error('Error processing message:', error);
    // Send error message to user
    try {
      await sendWhatsAppMessage(from, 'Pole sana. Kuna tatizo la kiufundi. Tafadhali jaribu tena baadaye.');
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  }
}

/**
 * Webhook handler for Meta WhatsApp
 */
export async function handleWebhook(req: any, res: any): Promise<void> {
  // Handle webhook verification (GET request)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
    return;
  }

  // Handle incoming messages (POST request)
  if (req.method === 'POST') {
    const body = req.body;

    // Verify it's from WhatsApp
    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Handle incoming messages
            if (value.messages) {
              value.messages.forEach((message: any) => {
                const from = message.from;
                const messageBody = message.text?.body || '';
                const messageId = message.id;

                console.log(`Received message from ${from}: ${messageBody}`);

                // Process message asynchronously
                processIncomingMessage(from, messageBody).catch(console.error);
              });
            }

            // Handle status updates (message delivered, read, etc.)
            if (value.statuses) {
              value.statuses.forEach((status: any) => {
                console.log(`Message status: ${status.status} for ${status.id}`);
                // Update reminder status if needed
                // You can query reminders table and mark as sent
              });
            }
          }
        });
      });

      res.status(200).send('OK');
    } else {
      res.status(404).send('Not Found');
    }
    return;
  }

  res.status(405).send('Method Not Allowed');
}

/**
 * Send reminder via WhatsApp
 * Call this from your reminder service
 */
export async function sendReminderViaWhatsApp(
  phone: string,
  message: string,
  reminderId: string
): Promise<void> {
  try {
    await sendWhatsAppMessage(phone, message);
    
    // Mark reminder as sent in database
    await supabase
      .from('reminders')
      .update({
        sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', reminderId);

    console.log(`Reminder sent to ${phone}: ${reminderId}`);
  } catch (error) {
    console.error(`Failed to send reminder ${reminderId}:`, error);
    throw error;
  }
}

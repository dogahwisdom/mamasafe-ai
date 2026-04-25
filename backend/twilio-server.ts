import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import * as dotenv from 'dotenv';
import path from 'path';
import { analyzeSymptoms } from '../services/triageAnalysisService';
import { RiskLevel } from '../types';

// Load environment variables from the root .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Supabase with service role key
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Twilio Config
// In Twilio Sandbox, you can simply use the MessagingResponse to stringify TwiML to reply synchronously,
// or use the Twilio client to send messages asynchronously.
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || ''; // e.g., 'whatsapp:+14155238886' (Twilio Sandbox)
const twilioClient = twilioAccountSid ? twilio(twilioAccountSid, twilioAuthToken) : null;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

/**
 * Send WhatsApp message via Twilio API (Asynchronously)
 */
async function sendWhatsAppMessageTwilio(to: string, message: string): Promise<void> {
  if (!twilioClient) {
    console.error('Twilio client is not initialized. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    return;
  }

  try {
    const twilioResponse = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber, // e.g., 'whatsapp:+14155238886'
      to: to // Ensure this starts with 'whatsapp:' e.g., 'whatsapp:+1234567890'
    });
    console.log('Message sent successfully via Twilio:', twilioResponse.sid);
  } catch (error) {
    console.error('Error sending Twilio WhatsApp message:', error);
    throw error;
  }
}

/**
 * Find patient by phone number
 */
async function findPatientByPhone(phone: string): Promise<any> {
  // Assuming the phone in DB includes the plus sign e.g., +1234567890
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
  console.log(`Checking/Creating patient for phone: [${phone}]`);
  const existing = await findPatientByPhone(phone);

  if (existing) {
    console.log(`Patient already exists: ${existing.id}`);
    return existing.id;
  }

  console.log(`Patient not found. Creating new record for ${phone}...`);
  // Create new patient
  const { data, error } = await supabase
    .from('patients')
    .insert({
      name: name || 'Unknown Patient',
      phone,
      age: 25,
      gestational_weeks: 12,
      location: 'Unknown',
      risk_status: 'Low',
      alerts: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase Insert Error:', error.message);
    throw error;
  }

  console.log(`Patient created successfully: ${data.id}`);
  return data.id;
}

/**
 * Process incoming WhatsApp message
 */
async function processIncomingMessage(from: string, messageBody: string): Promise<string> {
  try {
    // Twilio `from` comes as 'whatsapp:+1234567890'. We extract just the phone number for the DB.
    const phone = from.replace('whatsapp:', '');

    // Find or create patient
    const patientId = await createOrUpdatePatient(phone);
    const patient = await findPatientByPhone(phone);

    if (!patient) {
      return 'Habari. Welcome to MamaSafe AI. We are setting up your profile. Please wait...';
    }

    // Analyze symptoms using triage AI
    const triageResult = await analyzeSymptoms(
      messageBody,
      patient.gestational_weeks || 12,
      JSON.stringify(patient.alerts || [])
    );

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

    // Return the response string to be sent via TwiML
    return triageResult.draftResponse;

  } catch (error) {
    console.error('Error processing message:', error);
    return 'Pole sana. Kuna tatizo la kiufundi. Tafadhali jaribu tena baadaye.';
  }
}

/**
 * Twilio Webhook Route
 * URL: /api/twilio-webhook
 */
app.post('/api/twilio-webhook', async (req: Request, res: Response) => {
  const { Body, From, ProfileName } = req.body;
  console.log(`Received message from ${From} (Profile: ${ProfileName}): ${Body}`);

  // Send an immediate 200 OK so Twilio doesn't timeout, then process asynchronously
  // OR we can respond directly with TwiML. Doing TwiML is easiest for the sandbox.

  // To avoid Twilio timeouts if AI takes > 15s, we can respond with an empty TwiML
  // and send the actual response asynchronously via Twilio SDK.

  const twiml = new twilio.twiml.MessagingResponse();
  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());

  // Process and send the response asynchronously
  try {
    const responseText = await processIncomingMessage(From, Body);
    await sendWhatsAppMessageTwilio(From, responseText);
  } catch (error) {
    console.error("Async processing error:", error);
  }
});

app.get('/health', (req, res) => {
  res.send('Twilio Webhook Server is running');
});

app.listen(port, () => {
  console.log(`Twilio Sandbox server listening on port ${port}`);
  console.log(`Webhook URL for Twilio: http://localhost:${port}/api/twilio-webhook`);
});

export { app };

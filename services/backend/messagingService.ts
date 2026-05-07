/**
 * Messaging Service
 * 
 * Handles sending SMS and WhatsApp messages for patient enrollment,
 * reminders, and notifications.
 */

interface MessageResult {
  success: boolean;
  channel: 'sms' | 'whatsapp';
  error?: string;
}

interface WhatsAppSendContext {
  patientId?: string;
  relatedReminderId?: string;
  /** Stored on `whatsapp_messages.raw_payload.outboundSource` for analytics / SQL filters. */
  logSource?: string;
  /** Used by Netlify `whatsapp-send` when `WHATSAPP_WELCOME_TEMPLATE_*` env is set. */
  enrollmentPatientFirstName?: string;
  /** Optional second template variable when env `WHATSAPP_WELCOME_TEMPLATE_BODY_PARAM_MODE=first_name_facility`. */
  enrollmentFacilityName?: string;
}

export type EnrollmentCredentialsOptions = {
  facilityName?: string;
  /** When false, only SMS is sent (no WhatsApp). Default true including when omitted (legacy callers). */
  whatsappOptIn?: boolean;
  patientId?: string;
};

export class MessagingService {
  private readonly AT_SMS_URL = 'https://api.africastalking.com/version1/messaging';
  private readonly WHATSAPP_FUNCTION_URL = '/.netlify/functions/whatsapp-send';

  /**
   * SMS: enrolment credentials (PIN + portal) when SMS is configured. WhatsApp: short professional welcome only (no secrets in-chat).
   */
  public async sendEnrollmentCredentials(
    phone: string,
    patientName: string,
    pin: string,
    portalUrl?: string,
    options?: EnrollmentCredentialsOptions
  ): Promise<{ sms: boolean; whatsapp: boolean }> {
    // Get portal URL from window if not provided
    if (!portalUrl && typeof window !== 'undefined') {
      portalUrl = window.location.origin;
    } else if (!portalUrl) {
      portalUrl = 'https://mamasafe.ai'; // Default fallback
    }
    const firstName = patientName.split(' ')[0];
    const facility = options?.facilityName?.trim();
    const facilityLineSms = facility ? ` Umepokelewa na ${facility}.` : '';
    const whatsappFacilityLine = facility
      ? `\n\nYou're being onboarded through ${facility}.`
      : '';

    const credentialsBlock = `AKOUNTI YAKO\nNambari ya simu: ${phone}\nPIN: ${pin}\n\nFUNGUA: ${portalUrl}`;

    const smsBody = `Karibu MamaSafe, ${firstName}!${facilityLineSms}

${credentialsBlock}

Huduma za mama na mtoto.`;

    const whatsappWelcomeBody = `Karibu MamaSafe — ${firstName}!${whatsappFacilityLine}

Thank you for registering with us. Our team supports you throughout your maternity journey.

Reply to this chat if you'd like guided information, or speak with your care team for urgent concerns.

— MamaSafe`;

    const results = {
      sms: false,
      whatsapp: false,
    };

    const sendWhatsApp = options?.whatsappOptIn !== false;

    // Send via SMS
    try {
      results.sms = await this.sendSMS(phone, smsBody);
    } catch (error) {
      console.error('Error sending SMS:', error);
    }

    if (!sendWhatsApp) {
      return results;
    }

    // Send WhatsApp welcome + credentials (via Netlify whatsapp-send)
    try {
      const ctx: WhatsAppSendContext = {
        patientId: options?.patientId,
        logSource: 'enrollment_welcome',
        enrollmentPatientFirstName: firstName,
        enrollmentFacilityName: facility || undefined,
      };
      results.whatsapp = await this.sendWhatsApp(phone, whatsappWelcomeBody, ctx);
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
    }

    return results;
  }

  /**
   * Send WhatsApp message
   */
  public async sendWhatsApp(
    phone: string,
    message: string,
    context?: WhatsAppSendContext
  ): Promise<boolean> {
    try {
      const response = await fetch(this.WHATSAPP_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          message,
          patientId: context?.patientId,
          relatedReminderId: context?.relatedReminderId,
          logSource: context?.logSource,
          enrollmentPatientFirstName: context?.enrollmentPatientFirstName,
          enrollmentFacilityName: context?.enrollmentFacilityName,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('WhatsApp send function error:', error);
        return false;
      }

      const result = await response.json().catch(() => ({}));
      console.log(`WhatsApp message sent to ${phone}:`, result.metaMessageId);
      return !!result.success;
    } catch (error) {
      console.error(`Error sending WhatsApp to ${phone}:`, error);
      return false;
    }
  }

  /**
   * Send SMS via Africa's Talking
   */
  public async sendSMS(phone: string, message: string): Promise<boolean> {
    // Try to get from environment variables (for frontend)
    const apiKey = (import.meta.env.VITE_AFRICAS_TALKING_API_KEY as string) || 
                  (typeof process !== 'undefined' && process.env?.AFRICAS_TALKING_API_KEY) || '';
    const username = (import.meta.env.VITE_AFRICAS_TALKING_USERNAME as string) || 
                    (typeof process !== 'undefined' && process.env?.AFRICAS_TALKING_USERNAME) || '';

    if (!apiKey || !username) {
      console.warn('Africa\'s Talking credentials not configured');
      return false;
    }

    try {
      const cleanPhone = phone.startsWith('+') ? phone.substring(1) : phone;
      
      const response = await fetch(this.AT_SMS_URL, {
        method: 'POST',
        headers: {
          'ApiKey': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          username: username,
          to: cleanPhone,
          message: message,
          from: 'MamaSafe',
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
   * Send notification message
   */
  public async sendNotification(
    phone: string,
    message: string,
    channels: ('sms' | 'whatsapp')[] = ['whatsapp', 'sms'],
    context?: WhatsAppSendContext
  ): Promise<MessageResult[]> {
    const results: MessageResult[] = [];

    if (channels.includes('whatsapp')) {
      const success = await this.sendWhatsApp(phone, message, context);
      results.push({
        success,
        channel: 'whatsapp',
        ...(success ? {} : { error: 'WhatsApp send failed' }),
      });
    }

    if (channels.includes('sms')) {
      const success = await this.sendSMS(phone, message);
      results.push({
        success,
        channel: 'sms',
        ...(success ? {} : { error: 'SMS send failed' }),
      });
    }

    return results;
  }
}

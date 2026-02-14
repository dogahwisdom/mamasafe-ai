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

export class MessagingService {
  private readonly WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
  private readonly AT_SMS_URL = 'https://api.africastalking.com/version1/messaging';

  /**
   * Send credentials to newly enrolled patient
   */
  public async sendEnrollmentCredentials(
    phone: string,
    patientName: string,
    pin: string,
    portalUrl?: string
  ): Promise<{ sms: boolean; whatsapp: boolean }> {
    // Get portal URL from window if not provided
    if (!portalUrl && typeof window !== 'undefined') {
      portalUrl = window.location.origin;
    } else if (!portalUrl) {
      portalUrl = 'https://mamasafe.ai'; // Default fallback
    }
    const firstName = patientName.split(' ')[0];
    
    const message = `Habari ${firstName}! Karibu kwenye MamaSafe.

AKOUNTI YAKO:
Nambari: ${phone}
PIN: ${pin}

LINGANIA HAPA:
${portalUrl}

Unaweza kuingia sasa na kuanza kutumia huduma zetu za afya ya uzazi.

Asante!`;

    const results = {
      sms: false,
      whatsapp: false,
    };

    // Send via SMS
    try {
      results.sms = await this.sendSMS(phone, message);
    } catch (error) {
      console.error('Error sending SMS:', error);
    }

    // Send via WhatsApp
    try {
      results.whatsapp = await this.sendWhatsApp(phone, message);
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
    }

    return results;
  }

  /**
   * Send WhatsApp message
   */
  public async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    // Try to get from environment variables (for frontend)
    const accessToken = (import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN as string) || 
                       (typeof process !== 'undefined' && process.env?.WHATSAPP_ACCESS_TOKEN) || '';
    const phoneNumberId = (import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID as string) || 
                         (typeof process !== 'undefined' && process.env?.WHATSAPP_PHONE_NUMBER_ID) || '';

    if (!accessToken || !phoneNumberId) {
      console.warn('WhatsApp credentials not configured');
      return false;
    }

    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      
      const response = await fetch(`${this.WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
        return false;
      }

      const result = await response.json();
      console.log(`WhatsApp message sent to ${phone}:`, result.messages?.[0]?.id);
      return true;
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
    channels: ('sms' | 'whatsapp')[] = ['whatsapp', 'sms']
  ): Promise<MessageResult[]> {
    const results: MessageResult[] = [];

    if (channels.includes('whatsapp')) {
      const success = await this.sendWhatsApp(phone, message);
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

function cleanPhone(phone) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

export class WhatsAppCloudService {
  constructor(config = {}) {
    this.apiVersion = config.apiVersion || "v20.0";
    this.accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
    this.phoneNumberId =
      config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  }

  isConfigured() {
    return !!(this.accessToken && this.phoneNumberId);
  }

  async sendTextMessage({ phone, body }) {
    if (!this.isConfigured()) {
      throw new Error("WhatsApp Cloud API is not configured.");
    }

    const to = cleanPhone(phone);
    if (!to) {
      throw new Error("Recipient phone number is required.");
    }

    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: {
            preview_url: false,
            body,
          },
        }),
      }
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail =
        payload?.error?.message || `Meta API request failed (${response.status}).`;
      throw new Error(detail);
    }

    return {
      waId: payload?.contacts?.[0]?.wa_id || to,
      metaMessageId: payload?.messages?.[0]?.id || null,
      raw: payload,
    };
  }
}

export function parseIncomingWhatsAppEvents(payload) {
  const changes = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.field === "messages") {
        changes.push(change.value || {});
      }
    }
  }
  return changes;
}

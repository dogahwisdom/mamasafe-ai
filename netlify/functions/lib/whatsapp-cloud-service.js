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
      const errObj = payload?.error || {};
      const detailParts = [
        errObj.message,
        errObj.code != null ? `code=${errObj.code}` : null,
        errObj.error_subcode != null ? `subcode=${errObj.error_subcode}` : null,
        errObj.fbtrace_id ? `fbtrace_id=${errObj.fbtrace_id}` : null,
      ].filter(Boolean);
      const suffix = detailParts.length ? ` (${detailParts.join("; ")})` : ` (HTTP ${response.status})`;
      const userTitle =
        typeof errObj.error_user_title === "string" && errObj.error_user_title
          ? ` user_title="${errObj.error_user_title}"`
          : "";
      const err = new Error(
        `${errObj.message || "Meta WhatsApp Cloud API rejected the send"}${suffix}${userTitle}`.trim()
      );
      err.meta = errObj;
      throw err;
    }

    return {
      waId: payload?.contacts?.[0]?.wa_id || to,
      metaMessageId: payload?.messages?.[0]?.id || null,
      raw: payload,
    };
  }

  /**
   * Sends an approved template (required for many business-initiated opens).
   * @param {{ phone: string; templateName: string; languageCode?: string; bodyParameters?: string[] }} opts
   */
  async sendTemplateMessage({ phone, templateName, languageCode = "en", bodyParameters = [] }) {
    if (!this.isConfigured()) {
      throw new Error("WhatsApp Cloud API is not configured.");
    }
    const to = cleanPhone(phone);
    if (!to) {
      throw new Error("Recipient phone number is required.");
    }
    const name = String(templateName || "").trim();
    if (!name) {
      throw new Error("Template name is required.");
    }

    const lang = String(languageCode || "en").trim() || "en";

    const templatePayload = {
      name,
      language: { code: lang },
    };
    const params = Array.isArray(bodyParameters) ? bodyParameters : [];
    if (params.length > 0) {
      templatePayload.components = [
        {
          type: "body",
          parameters: params.map((text) => ({
            type: "text",
            text: String(text ?? "").slice(0, 32768),
          })),
        },
      ];
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
          type: "template",
          template: templatePayload,
        }),
      }
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errObj = payload?.error || {};
      const detailParts = [
        errObj.message,
        errObj.code != null ? `code=${errObj.code}` : null,
        errObj.error_subcode != null ? `subcode=${errObj.error_subcode}` : null,
        errObj.fbtrace_id ? `fbtrace_id=${errObj.fbtrace_id}` : null,
      ].filter(Boolean);
      const suffix = detailParts.length ? ` (${detailParts.join("; ")})` : ` (HTTP ${response.status})`;
      const userTitle =
        typeof errObj.error_user_title === "string" && errObj.error_user_title
          ? ` user_title="${errObj.error_user_title}"`
          : "";
      const err = new Error(
        `${errObj.message || "Meta WhatsApp Cloud API rejected the template send"}${suffix}${userTitle}`.trim()
      );
      err.meta = errObj;
      throw err;
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

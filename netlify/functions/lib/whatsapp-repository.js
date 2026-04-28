import { createClient } from "@supabase/supabase-js";

function nowIso() {
  return new Date().toISOString();
}

export class WhatsAppRepository {
  constructor() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    this.client =
      url && serviceRole ? createClient(url, serviceRole, { auth: { persistSession: false } }) : null;
  }

  isEnabled() {
    return !!this.client;
  }

  async findPatientByPhone(phone) {
    if (!this.client || !phone) return null;
    const normalized = String(phone).replace(/[^0-9+]/g, "");
    const withPlus = normalized.startsWith("+") ? normalized : `+${normalized}`;
    const candidates = [withPlus, normalized.replace(/^\+/, "")];

    for (const candidate of candidates) {
      const { data } = await this.client
        .from("patients")
        .select("id, name, phone")
        .eq("phone", candidate)
        .maybeSingle();
      if (data) return data;
    }
    return null;
  }

  async logOutboundMessage({ patientId, phone, body, metaMessageId, rawPayload, relatedReminderId }) {
    if (!this.client) return;
    await this.client.from("whatsapp_messages").insert({
      patient_id: patientId || null,
      phone,
      direction: "outbound",
      message_type: "text",
      body,
      status: "sent",
      meta_message_id: metaMessageId,
      related_reminder_id: relatedReminderId || null,
      raw_payload: rawPayload || {},
      sent_at: nowIso(),
    });
  }

  async logInboundMessage({ patientId, phone, body, metaMessageId, rawPayload }) {
    if (!this.client) return;
    await this.client.from("whatsapp_messages").insert({
      patient_id: patientId || null,
      phone,
      direction: "inbound",
      message_type: "text",
      body,
      status: "received",
      meta_message_id: metaMessageId || null,
      raw_payload: rawPayload || {},
      received_at: nowIso(),
    });
  }

  async updateMessageStatus({ metaMessageId, status, rawPayload }) {
    if (!this.client || !metaMessageId) return;
    const patch = {
      status,
      raw_payload: rawPayload || {},
    };
    if (status === "delivered") patch.delivered_at = nowIso();
    if (status === "read") patch.read_at = nowIso();
    if (status === "failed") patch.failed_at = nowIso();

    await this.client
      .from("whatsapp_messages")
      .update(patch)
      .eq("meta_message_id", metaMessageId);
  }
}

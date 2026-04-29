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
        .select("id, name, phone, gestational_weeks, alerts")
        .eq("phone", candidate)
        .maybeSingle();
      if (data) return data;
    }
    return null;
  }

  async createOrFindPatientByPhone(phone, name = "WhatsApp Patient") {
    const existing = await this.findPatientByPhone(phone);
    if (existing) return existing;
    if (!this.client) return null;

    const normalized = String(phone).replace(/[^0-9+]/g, "");
    const withPlus = normalized.startsWith("+") ? normalized : `+${normalized}`;
    const { data, error } = await this.client
      .from("patients")
      .insert({
        name,
        phone: withPlus,
        age: 25,
        gestational_weeks: 12,
        location: "Unknown",
        risk_status: "Low",
        alerts: [],
      })
      .select("id, name, phone, gestational_weeks, alerts")
      .single();

    if (error) {
      console.error("Failed to auto-create WhatsApp patient:", error.message);
      return null;
    }
    return data;
  }

  async createReferral({ patientId, patientName, reason, recommendedAction }) {
    if (!this.client) return { ok: false, reason: "supabase_not_configured" };
    const { error } = await this.client.from("referrals").insert({
      patient_id: patientId,
      patient_name: patientName,
      from_facility: "MamaSafe AI",
      to_facility: recommendedAction?.includes("Level 4") ? "Level 4/5 Hospital" : "Clinic review",
      reason,
      status: "pending",
    });
    if (error) {
      console.error("Failed to create referral:", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }

  async createTask({ patientId, patientName, notes }) {
    if (!this.client) return { ok: false, reason: "supabase_not_configured" };
    const { data: existing } = await this.client
      .from("tasks")
      .select("id")
      .eq("patient_id", patientId)
      .eq("type", "Triage Alert")
      .eq("resolved", false)
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: true, skipped: "existing_open_triage_alert" };
    }
    const { error } = await this.client.from("tasks").insert({
      patient_id: patientId,
      patient_name: patientName,
      type: "Triage Alert",
      deadline: "Due immediately",
      resolved: false,
      notes,
      timestamp: Date.now(),
    });
    if (error) {
      console.error("Failed to create WhatsApp triage task:", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }

  async logOutboundMessage({ patientId, phone, body, metaMessageId, rawPayload, relatedReminderId }) {
    if (!this.client) return { ok: false, reason: "supabase_not_configured" };
    const { error } = await this.client.from("whatsapp_messages").insert({
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
    if (error) {
      console.error("Failed to log outbound whatsapp message:", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }

  async logInboundMessage({ patientId, phone, body, metaMessageId, rawPayload }) {
    if (!this.client) return { ok: false, reason: "supabase_not_configured" };
    const { error } = await this.client.from("whatsapp_messages").insert({
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
    if (error) {
      console.error("Failed to log inbound whatsapp message:", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }

  async updateMessageStatus({ metaMessageId, status, rawPayload }) {
    if (!this.client || !metaMessageId) return { ok: false, reason: "missing_dependency_or_id" };
    const patch = {
      status,
      raw_payload: rawPayload || {},
    };
    if (status === "delivered") patch.delivered_at = nowIso();
    if (status === "read") patch.read_at = nowIso();
    if (status === "failed") patch.failed_at = nowIso();

    const { error } = await this.client
      .from("whatsapp_messages")
      .update(patch)
      .eq("meta_message_id", metaMessageId);
    if (error) {
      console.error("Failed to update whatsapp message status:", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }
}

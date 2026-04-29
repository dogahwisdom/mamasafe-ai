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

  async getActiveSessionByPhone(phone) {
    if (!this.client || !phone) return null;
    const { data, error } = await this.client
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone", phone)
      .eq("status", "active")
      .maybeSingle();
    if (error) {
      console.error("Failed to read whatsapp session:", error.message);
      return null;
    }
    return data;
  }

  async hasInboundMessage(metaMessageId) {
    if (!this.client || !metaMessageId) return false;
    const { data, error } = await this.client
      .from("whatsapp_messages")
      .select("id")
      .eq("direction", "inbound")
      .eq("meta_message_id", metaMessageId)
      .limit(1);
    if (error) {
      console.error("Failed to check duplicate inbound whatsapp message:", error.message);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  }

  async upsertSession({
    phone,
    patientId,
    flowType,
    stepKey,
    stepIndex,
    answers,
    status,
    completedAt,
  }) {
    if (!this.client || !phone) return { ok: false, reason: "supabase_not_configured" };
    const payload = {
      phone,
      patient_id: patientId || null,
      flow_type: flowType || "intake",
      step_key: stepKey || "choose_profile",
      step_index: Number(stepIndex || 0),
      answers: Array.isArray(answers) ? answers : [],
      status: status || "active",
      completed_at: completedAt || null,
      last_user_message_at: nowIso(),
    };
    const { error } = await this.client.from("whatsapp_sessions").upsert(payload, {
      onConflict: "phone",
    });
    if (error) {
      console.error("Failed to upsert whatsapp session:", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }

  async listSessionsNeedingReminder(hours = 12) {
    if (!this.client) return [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.client
      .from("whatsapp_sessions")
      .select("phone, patient_id, flow_type, step_key, updated_at, reminder_count")
      .eq("status", "active")
      .lt("updated_at", cutoff)
      .or("reminder_count.is.null,reminder_count.eq.0")
      .limit(200);
    if (error) {
      console.error("Failed to list sessions needing reminder:", error.message);
      return [];
    }
    return data || [];
  }

  async markSessionReminderSent(phone) {
    if (!this.client || !phone) return { ok: false, reason: "supabase_not_configured_or_phone_missing" };
    const { data: session } = await this.client
      .from("whatsapp_sessions")
      .select("reminder_count")
      .eq("phone", phone)
      .maybeSingle();
    const nextCount = Number(session?.reminder_count || 0) + 1;
    const { error } = await this.client
      .from("whatsapp_sessions")
      .update({
        reminder_count: nextCount,
        reminder_sent_at: nowIso(),
        last_bot_message_at: nowIso(),
      })
      .eq("phone", phone);
    if (error) {
      console.error("Failed to mark session reminder sent:", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }

  async listPatientsWithPhone(limit = 500) {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from("patients")
      .select("id, name, phone")
      .not("phone", "is", null)
      .neq("phone", "")
      .limit(limit);
    if (error) {
      console.error("Failed to list patients with phone:", error.message);
      return [];
    }
    return data || [];
  }

  async hasRecentOutboundBySource(phone, source, hours = 24 * 7) {
    if (!this.client || !phone || !source) return false;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.client
      .from("whatsapp_messages")
      .select("id")
      .eq("direction", "outbound")
      .eq("phone", phone)
      .gte("created_at", cutoff)
      .contains("raw_payload", { source })
      .limit(1);
    if (error) {
      console.error("Failed to check recent outbound source:", error.message);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
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
    if (phone) {
      await this.client
        .from("whatsapp_sessions")
        .update({ last_bot_message_at: nowIso() })
        .eq("phone", phone)
        .eq("status", "active");
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

import { createClient } from "@supabase/supabase-js";
import { WhatsAppPhoneNormalizer } from "./whatsapp-phone-normalizer.js";

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
    const canonical = WhatsAppPhoneNormalizer.canonicalFromAny(phone);
    if (!canonical) return null;
    const variants = WhatsAppPhoneNormalizer.variantsForQueries(canonical);
    const { data, error } = await this.client
      .from("patients")
      .select("id, name, phone, gestational_weeks, alerts")
      .in("phone", variants)
      .limit(1);
    if (error) {
      console.error("Failed to find patient by phone variants:", variants.join(","), error.message);
      return null;
    }
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  async createOrFindPatientByPhone(phone, name = "WhatsApp Patient") {
    const existing = await this.findPatientByPhone(phone);
    if (existing) return existing;
    if (!this.client) return null;

    const withPlus = WhatsAppPhoneNormalizer.canonicalFromAny(phone);
    if (!withPlus) return null;
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
    const canonical = WhatsAppPhoneNormalizer.canonicalFromAny(phone);
    if (!canonical) return null;
    const variants = WhatsAppPhoneNormalizer.variantsForQueries(canonical);
    const { data, error } = await this.client
      .from("whatsapp_sessions")
      .select("*")
      .in("phone", variants)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) {
      console.error("Failed to read whatsapp session:", error.message);
      return null;
    }
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
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
    const canonical = WhatsAppPhoneNormalizer.canonicalFromAny(phone);
    if (!canonical) return { ok: false, reason: "invalid_phone" };
    const variants = WhatsAppPhoneNormalizer.variantsForQueries(canonical);
    const patch = {
      phone: canonical,
      patient_id: patientId || null,
      flow_type: flowType || "intake",
      step_key: stepKey || "choose_profile",
      step_index: Number(stepIndex || 0),
      answers: Array.isArray(answers) ? answers : [],
      status: status || "active",
      completed_at: completedAt || null,
      last_user_message_at: nowIso(),
    };

    const { data: existingRows, error: findErr } = await this.client
      .from("whatsapp_sessions")
      .select("id")
      .in("phone", variants)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (findErr) {
      console.error("Failed to locate whatsapp session for upsert:", findErr.message);
      return { ok: false, reason: findErr.message };
    }
    const existingId = Array.isArray(existingRows) && existingRows[0]?.id;

    if (existingId) {
      const { error } = await this.client.from("whatsapp_sessions").update(patch).eq("id", existingId);
      if (error) {
        console.error("Failed to update whatsapp session:", error.message);
        return { ok: false, reason: error.message };
      }
      return { ok: true };
    }

    const { error } = await this.client.from("whatsapp_sessions").insert(patch);
    if (error) {
      console.error("Failed to insert whatsapp session:", error.message);
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
    const canonical = WhatsAppPhoneNormalizer.canonicalFromAny(phone);
    const variants = WhatsAppPhoneNormalizer.variantsForQueries(canonical);
    if (!canonical || variants.length === 0) return { ok: false, reason: "invalid_phone" };
    const { data: sessions } = await this.client
      .from("whatsapp_sessions")
      .select("reminder_count")
      .in("phone", variants)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);
    const session = Array.isArray(sessions) && sessions[0];
    const nextCount = Number(session?.reminder_count || 0) + 1;
    const { error } = await this.client
      .from("whatsapp_sessions")
      .update({
        reminder_count: nextCount,
        reminder_sent_at: nowIso(),
        last_bot_message_at: nowIso(),
      })
      .in("phone", variants)
      .eq("status", "active");
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
      .eq("whatsapp_checkup_opt_out", false)
      .limit(limit);
    if (error) {
      console.error("Failed to list patients with phone:", error.message);
      return [];
    }
    return data || [];
  }

  async setPatientCheckupOptOut(phone, optOut = true) {
    if (!this.client || !phone) return { ok: false, reason: "supabase_not_configured_or_phone_missing" };
    const canonical = WhatsAppPhoneNormalizer.canonicalFromAny(phone);
    const variants = WhatsAppPhoneNormalizer.variantsForQueries(canonical);
    if (variants.length === 0) return { ok: false, reason: "invalid_phone" };
    const timestamp = optOut ? nowIso() : null;
    const patch = {
      whatsapp_checkup_opt_out: Boolean(optOut),
      whatsapp_checkup_opt_out_at: timestamp,
    };
    const { error } = await this.client
      .from("patients")
      .update(patch)
      .in("phone", variants);
    if (error) {
      console.error("Failed to update patient checkup opt-out:", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }

  async hasRecentOutboundBySource(phone, source, hours = 24 * 7) {
    if (!this.client || !phone || !source) return false;
    const canonical = WhatsAppPhoneNormalizer.canonicalFromAny(phone);
    const variants = WhatsAppPhoneNormalizer.variantsForQueries(canonical);
    if (!canonical || variants.length === 0) return false;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.client
      .from("whatsapp_messages")
      .select("id")
      .eq("direction", "outbound")
      .in("phone", variants)
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
    const canonicalPhone = WhatsAppPhoneNormalizer.canonicalFromAny(phone) || phone;
    const phoneVariants = WhatsAppPhoneNormalizer.variantsForQueries(canonicalPhone);
    const { error } = await this.client.from("whatsapp_messages").insert({
      patient_id: patientId || null,
      phone: canonicalPhone,
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
    if (canonicalPhone) {
      await this.client
        .from("whatsapp_sessions")
        .update({ last_bot_message_at: nowIso() })
        .in("phone", phoneVariants.length ? phoneVariants : [canonicalPhone])
        .eq("status", "active");
    }
    return { ok: true };
  }

  async logInboundMessage({ patientId, phone, body, metaMessageId, rawPayload, messageType = "text" }) {
    if (!this.client) return { ok: false, reason: "supabase_not_configured" };
    const canonicalPhone = WhatsAppPhoneNormalizer.canonicalFromAny(phone) || phone;
    const allowedTypes = new Set(["text", "template", "status", "system"]);
    const safeType = allowedTypes.has(messageType) ? messageType : "system";
    const { error } = await this.client.from("whatsapp_messages").insert({
      patient_id: patientId || null,
      phone: canonicalPhone,
      direction: "inbound",
      message_type: safeType,
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

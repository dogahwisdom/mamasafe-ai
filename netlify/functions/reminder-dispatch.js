import { createClient } from "@supabase/supabase-js";
import { WhatsAppCloudService } from "./lib/whatsapp-cloud-service.js";
import { authorizeReminderDispatch } from "./lib/reminder-dispatch-auth.js";

const DISPATCH_COOLDOWN_MS = 60 * 1000;
let dispatchInProgress = false;
let lastDispatchStartedAt = 0;

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** Basic UUID v1–v5 shape; avoids injecting odd values into PostgREST `or=` filters. */
function isFacilityScopeUuidLike(value) {
  const s = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function facilityPatientEnrollmentOrPrimaryFilter(scopeId) {
  const s = String(scopeId).trim();
  return `facility_id.eq.${s},primary_facility_id.eq.${s}`;
}

function dispatchMaxScan() {
  const n = Number(process.env.REMINDER_DISPATCH_MAX_PER_RUN ?? "75");
  if (!Number.isFinite(n) || n < 1) return 75;
  return Math.min(150, Math.max(1, Math.floor(n)));
}

async function filterRemindersAgainstTestPatients(client, reminders, includeTestPatients) {
  if (includeTestPatients || reminders.length === 0) return reminders;
  const pids = [...new Set(reminders.map((r) => r.patient_id).filter(Boolean))];
  if (!pids.length) return reminders;
  const banned = new Set();
  for (let i = 0; i < pids.length; i += 200) {
    const chunk = pids.slice(i, i + 200);
    const { data, error } = await client.from("patients").select("id").in("id", chunk).eq("is_test", true);
    if (error) break;
    (data || []).forEach((row) => banned.add(row.id));
  }
  return reminders.filter((r) => !r.patient_id || !banned.has(r.patient_id));
}

function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

async function getPreferredChannel(client, patientId) {
  if (!patientId) return "both";
  const { data, error } = await client
    .from("patients")
    .select("preferred_channel")
    .eq("id", patientId)
    .maybeSingle();
  if (error) {
    console.error("Failed to load patient preferred_channel:", error.message);
    return "both";
  }
  return data?.preferred_channel || "both";
}

function shouldSendWhatsApp(reminderChannel, preferredChannel) {
  if (reminderChannel === "whatsapp") return true;
  if (reminderChannel === "sms") return false;
  return preferredChannel === "whatsapp" || preferredChannel === "both";
}

async function logReminderWhatsApp(client, row) {
  const { error } = await client.from("whatsapp_messages").insert(row);
  if (error) {
    console.error("Failed to log reminder WhatsApp row:", error.message);
  }
}

function templateConfigFromEnv() {
  const templateName = String(process.env.WHATSAPP_REMINDER_TEMPLATE_NAME || "").trim();
  const templateLang = String(process.env.WHATSAPP_REMINDER_TEMPLATE_LANGUAGE || "en").trim() || "en";
  const templateHasBodyVars =
    String(process.env.WHATSAPP_REMINDER_TEMPLATE_HAS_BODY_VARS ?? "true").toLowerCase() !== "false";
  const paramMode = String(
    process.env.WHATSAPP_REMINDER_TEMPLATE_BODY_PARAM_MODE || "patient_and_message"
  ).trim();

  return { templateName, templateLang, templateHasBodyVars, paramMode };
}

function buildTemplateParams(reminder, paramMode) {
  if (!reminder) return [];
  if (paramMode === "patient_and_message") {
    return [
      String(reminder.patient_name || "").trim(),
      String(reminder.message || "").trim(),
    ];
  }
  if (paramMode === "patient_name") return [String(reminder.patient_name || "").trim()];
  if (paramMode === "type") return [String(reminder.type || "").trim()];
  if (paramMode === "scheduled_for_iso") return [String(reminder.scheduled_for || "").trim()];
  // Legacy single-var reminder body only
  if (paramMode === "message") return [String(reminder.message || "").trim()];
  return [
    String(reminder.patient_name || "").trim(),
    String(reminder.message || "").trim(),
  ];
}

async function processDueReminders(options = {}) {
  const { reminderIds = null, facilityScopeId = null, includeTestPatients = false } = options;

  const client = createSupabaseAdmin();
  if (!client) {
    return { ok: false, reason: "supabase_not_configured", processed: 0 };
  }

  const cloud = new WhatsAppCloudService();
  if (!cloud.isConfigured()) {
    return { ok: false, reason: "whatsapp_not_configured", processed: 0 };
  }

  const { templateName, templateLang, templateHasBodyVars, paramMode } = templateConfigFromEnv();

  const maxScan = dispatchMaxScan();
  const nowIso = new Date().toISOString();
  let qb = client
    .from("reminders")
    .select("id, patient_id, phone, message, channel, scheduled_for, patient_name, type")
    .eq("sent", false)
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true });

  const idList =
    reminderIds instanceof Array ? reminderIds.filter((id) => typeof id === "string" && id.length > 8).slice(0, maxScan) : [];

  if (idList.length) {
    qb = qb.in("id", idList);
  } else {
    qb = qb.limit(maxScan);
  }

  const { data: rawReminders, error } = await qb;

  if (error) {
    console.error("Failed to fetch due reminders:", error.message);
    return { ok: false, reason: error.message, processed: 0 };
  }

  let reminders = rawReminders || [];

  const scope =
    typeof facilityScopeId === "string" && facilityScopeId.trim()
      ? facilityScopeId.trim()
      : null;

  if (scope && reminders.length) {
    if (!isFacilityScopeUuidLike(scope)) {
      return {
        ok: false,
        reason: "invalid_facility_scope",
        scanned: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      };
    }
    let allowedQb = client
      .from("patients")
      .select("id")
      .or(facilityPatientEnrollmentOrPrimaryFilter(scope));
    if (!includeTestPatients) {
      allowedQb = allowedQb.eq("is_test", false);
    }
    const { data: allowedPatients } = await allowedQb;
    const allow = new Set((allowedPatients || []).map((p) => p.id));
    reminders = reminders.filter((r) => r.patient_id && allow.has(r.patient_id));
  }

  reminders = await filterRemindersAgainstTestPatients(client, reminders, includeTestPatients);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders || []) {
    const preferred = await getPreferredChannel(client, reminder.patient_id);
    if (!shouldSendWhatsApp(reminder.channel, preferred)) {
      skipped += 1;
      continue;
    }

    try {
      const usingTemplate = !!templateName;
      const reply = usingTemplate
        ? await cloud.sendTemplateMessage({
            phone: reminder.phone,
            templateName,
            languageCode: templateLang,
            bodyParameters: templateHasBodyVars
              ? buildTemplateParams(reminder, paramMode)
              : [],
          })
        : await cloud.sendTextMessage({
            phone: reminder.phone,
            body: reminder.message,
          });

      const messageType = usingTemplate ? "template" : "text";

      await client
        .from("reminders")
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq("id", reminder.id)
        .eq("sent", false);

      await logReminderWhatsApp(client, {
        patient_id: reminder.patient_id || null,
        related_reminder_id: reminder.id,
        phone: reminder.phone,
        direction: "outbound",
        message_type: messageType,
        body: usingTemplate
          ? `[template:${templateName}|${templateLang}] ${reminder.message}`
          : reminder.message,
        status: "sent",
        meta_message_id: reply.metaMessageId || null,
        raw_payload: {
          ...(reply.raw || {}),
          outboundSource: "scheduled_reminder_dispatch",
        },
        sent_at: new Date().toISOString(),
      });
      sent += 1;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await logReminderWhatsApp(client, {
        patient_id: reminder.patient_id || null,
        related_reminder_id: reminder.id,
        phone: reminder.phone,
        direction: "outbound",
        message_type: templateName ? "template" : "text",
        body: reminder.message,
        status: "failed",
        raw_payload: {
          outboundSource: "scheduled_reminder_dispatch",
          template_name: templateName || null,
          error: errorMessage,
        },
        failed_at: new Date().toISOString(),
      });
      failed += 1;
    }
  }

  return { ok: true, scanned: (reminders || []).length, sent, failed, skipped };
}

export const config = {
  schedule: "*/15 * * * *",
};

function parseDispatchRequestBody(eventBody) {
  if (!eventBody || typeof eventBody !== "string") {
    return { reminderIds: [], facilityScopeId: null, includeTestPatientsRequest: false };
  }
  try {
    const parsed = JSON.parse(eventBody);
    const idsRaw = parsed?.reminderIds;
    const facilityScopeId =
      typeof parsed?.facilityScopeId === "string" && parsed.facilityScopeId.trim().length > 0
        ? parsed.facilityScopeId.trim()
        : null;
    const reminderIds =
      idsRaw instanceof Array
        ? idsRaw.filter((id) => typeof id === "string" && id.length > 8).slice(0, 150)
        : [];
    const includeTestPatientsRequest = parsed?.includeTestPatients === true;
    return { reminderIds, facilityScopeId, includeTestPatientsRequest };
  } catch {
    return { reminderIds: [], facilityScopeId: null, includeTestPatientsRequest: false };
  }
}

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." });
  }

  const auth = await authorizeReminderDispatch(event, createSupabaseAdmin);
  if (!auth.ok) {
    return json(401, {
      ok: false,
      reason: auth.reason || "unauthorized_reminder_dispatch",
      error: "Reminder dispatch is not authorized for this caller.",
      scanned: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });
  }

  const { reminderIds: manualReminderIds, facilityScopeId, includeTestPatientsRequest } = parseDispatchRequestBody(
    event?.body || ""
  );
  const manualSelect = manualReminderIds.length > 0;

  /** Only authenticated superadmins may include QA/test patients (server-enforced). */
  const includeTestPatients = auth.role === "superadmin" && includeTestPatientsRequest === true;

  const now = Date.now();

  if (dispatchInProgress) {
    return json(429, {
      ok: false,
      reason: "dispatch_in_progress",
      error: "Reminder dispatch is already running. Please wait for completion.",
    });
  }

  if (!manualSelect) {
    if (now - lastDispatchStartedAt < DISPATCH_COOLDOWN_MS) {
      return json(429, {
        ok: false,
        reason: "dispatch_cooldown",
        error: "Reminder dispatch was run recently. Please wait one minute before retrying.",
      });
    }
  }

  dispatchInProgress = true;
  if (!manualSelect) {
    lastDispatchStartedAt = now;
  }
  try {
    const result = await processDueReminders({
      reminderIds: manualSelect ? manualReminderIds : null,
      facilityScopeId,
      includeTestPatients,
    });
    let statusCode = 200;
    if (!result.ok) {
      if (result.reason === "invalid_facility_scope") statusCode = 400;
      else statusCode = 500;
    }
    return json(statusCode, result);
  } finally {
    dispatchInProgress = false;
  }
}

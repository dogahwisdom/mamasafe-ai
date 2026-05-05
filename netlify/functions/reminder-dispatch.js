import { createClient } from "@supabase/supabase-js";
import { WhatsAppCloudService } from "./lib/whatsapp-cloud-service.js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
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

async function processDueReminders() {
  const client = createSupabaseAdmin();
  if (!client) {
    return { ok: false, reason: "supabase_not_configured", processed: 0 };
  }

  const cloud = new WhatsAppCloudService();
  if (!cloud.isConfigured()) {
    return { ok: false, reason: "whatsapp_not_configured", processed: 0 };
  }

  const nowIso = new Date().toISOString();
  const { data: reminders, error } = await client
    .from("reminders")
    .select("id, patient_id, phone, message, channel, scheduled_for")
    .eq("sent", false)
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(100);

  if (error) {
    console.error("Failed to fetch due reminders:", error.message);
    return { ok: false, reason: error.message, processed: 0 };
  }

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
      const reply = await cloud.sendTextMessage({
        phone: reminder.phone,
        body: reminder.message,
      });

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
        message_type: "text",
        body: reminder.message,
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
        message_type: "text",
        body: reminder.message,
        status: "failed",
        raw_payload: {
          outboundSource: "scheduled_reminder_dispatch",
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

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." });
  }

  const result = await processDueReminders();
  const statusCode = result.ok ? 200 : 500;
  return json(statusCode, result);
}

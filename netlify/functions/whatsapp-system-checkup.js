import { WhatsAppCloudService } from "./lib/whatsapp-cloud-service.js";
import { WhatsAppRepository } from "./lib/whatsapp-repository.js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const OUTREACH_SOURCE = "whatsapp-system-checkup";
const DEFAULT_COOLDOWN_HOURS = 24 * 7;
const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

function buildCheckupMessage(patientName) {
  return [
    `Hello ${patientName || "Patient"}, MamaSafe AI is checking on you today.`,
    "How are you feeling?",
    "",
    "Please reply with one option:",
    "1. I am okay",
    "2. I have a health concern",
    "",
    "You can also type 'hello' to start a guided check-up.",
  ].join("\n");
}

export const config = {
  schedule: "0 9 * * *",
};

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const repo = new WhatsAppRepository();
  const cloud = new WhatsAppCloudService();
  const enabled = String(process.env.WHATSAPP_SYSTEM_CHECKUP_ENABLED || "false").toLowerCase() === "true";
  if (!enabled) {
    return json(200, { ok: true, skipped: true, reason: "system_checkup_disabled" });
  }

  const startHour = Number(process.env.WHATSAPP_CHECKUP_START_HOUR || DEFAULT_START_HOUR);
  const endHour = Number(process.env.WHATSAPP_CHECKUP_END_HOUR || DEFAULT_END_HOUR);
  const nowHour = new Date().getUTCHours();
  if (nowHour < startHour || nowHour >= endHour) {
    return json(200, {
      ok: true,
      skipped: true,
      reason: "outside_quiet_hours_window",
      nowHourUtc: nowHour,
      startHourUtc: startHour,
      endHourUtc: endHour,
    });
  }

  const cooldownHours = Number(process.env.WHATSAPP_CHECKUP_COOLDOWN_HOURS || DEFAULT_COOLDOWN_HOURS);
  const batchSize = Number(process.env.WHATSAPP_CHECKUP_BATCH_SIZE || DEFAULT_BATCH_SIZE);
  const patients = await repo.listPatientsWithPhone(batchSize);

  let sent = 0;
  let skipped = 0;

  for (const patient of patients) {
    const hasRecent = await repo.hasRecentOutboundBySource(
      patient.phone,
      OUTREACH_SOURCE,
      cooldownHours
    );
    if (hasRecent) {
      skipped += 1;
      continue;
    }

    const body = buildCheckupMessage(patient.name);
    try {
      const reply = await cloud.sendTextMessage({
        phone: patient.phone,
        body,
      });
      await repo.logOutboundMessage({
        patientId: patient.id,
        phone: patient.phone,
        body,
        metaMessageId: reply.metaMessageId,
        rawPayload: {
          ...reply.raw,
          source: OUTREACH_SOURCE,
          flow_type: "system_checkup",
        },
      });
      sent += 1;
    } catch (error) {
      console.error("Failed to send system checkup:", patient.phone, error);
    }
  }

  return json(200, {
    ok: true,
    scanned: patients.length,
    sent,
    skipped,
    cooldownHours,
    source: OUTREACH_SOURCE,
  });
}

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
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_START_HOUR_LOCAL = 8;
const DEFAULT_END_HOUR_LOCAL = 18;
const DEFAULT_UNKNOWN_COUNTRY_UTC_OFFSET = 0;

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

function getCountryUtcOffsetByPhone(phone) {
  const normalized = String(phone || "").trim();
  if (normalized.startsWith("+233")) return 0; // Ghana
  if (normalized.startsWith("+254")) return 3; // Kenya
  return null;
}

function getLocalHour(utcHour, utcOffset) {
  return (utcHour + utcOffset + 24) % 24;
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

  const startHourLocal = Number(
    process.env.WHATSAPP_CHECKUP_LOCAL_START_HOUR || DEFAULT_START_HOUR_LOCAL
  );
  const endHourLocal = Number(process.env.WHATSAPP_CHECKUP_LOCAL_END_HOUR || DEFAULT_END_HOUR_LOCAL);
  const defaultUtcOffset = Number(
    process.env.WHATSAPP_CHECKUP_DEFAULT_UTC_OFFSET || DEFAULT_UNKNOWN_COUNTRY_UTC_OFFSET
  );
  const nowHourUtc = new Date().getUTCHours();
  const cooldownHours = Number(process.env.WHATSAPP_CHECKUP_COOLDOWN_HOURS || DEFAULT_COOLDOWN_HOURS);
  const batchSize = Number(process.env.WHATSAPP_CHECKUP_BATCH_SIZE || DEFAULT_BATCH_SIZE);
  const patients = await repo.listPatientsWithPhone(batchSize);

  let sent = 0;
  let skipped = 0;
  let skippedQuietHours = 0;

  for (const patient of patients) {
    const countryUtcOffset = getCountryUtcOffsetByPhone(patient.phone);
    const utcOffset = countryUtcOffset === null ? defaultUtcOffset : countryUtcOffset;
    const localHour = getLocalHour(nowHourUtc, utcOffset);
    if (localHour < startHourLocal || localHour >= endHourLocal) {
      skipped += 1;
      skippedQuietHours += 1;
      continue;
    }

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
    const templateName = String(process.env.WHATSAPP_CHECKUP_TEMPLATE_NAME || "").trim();
    const templateLang = String(process.env.WHATSAPP_CHECKUP_TEMPLATE_LANGUAGE || "en").trim() || "en";
    const templateBodyVars =
      String(process.env.WHATSAPP_CHECKUP_TEMPLATE_HAS_BODY_VARS ?? "true").toLowerCase() !== "false";
    try {
      const reply = templateName
        ? await cloud.sendTemplateMessage({
            phone: patient.phone,
            templateName,
            languageCode: templateLang,
            bodyParameters: templateBodyVars ? [patient.name || "Patient"] : [],
          })
        : await cloud.sendTextMessage({
            phone: patient.phone,
            body,
          });
      await repo.logOutboundMessage({
        patientId: patient.id,
        phone: patient.phone,
        body: templateName ? `[template:${templateName}|${templateLang}] ${body}` : body,
        metaMessageId: reply.metaMessageId,
        rawPayload: {
          ...reply.raw,
          source: OUTREACH_SOURCE,
          flow_type: "system_checkup",
          ...(templateName ? { template_name: templateName, template_language: templateLang } : {}),
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
    skippedQuietHours,
    cooldownHours,
    source: OUTREACH_SOURCE,
    nowHourUtc,
    quietHoursLocal: `${startHourLocal}:00-${endHourLocal}:00`,
  });
}

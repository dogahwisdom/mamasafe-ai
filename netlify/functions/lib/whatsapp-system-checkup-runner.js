import { WhatsAppCloudService } from "./whatsapp-cloud-service.js";
import { WhatsAppRepository } from "./whatsapp-repository.js";

const OUTREACH_SOURCE = "whatsapp-system-checkup";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const DEFAULT_COOLDOWN_HOURS = 24 * 7;
const DEFAULT_BATCH_SIZE = 20;

/** Allows morning, midday, afternoon, and reasonable evening local outreach (Ghana UTC+0, Kenya UTC+3). */
const DEFAULT_START_HOUR_LOCAL = 7;

/** Stored end is exclusive (`localHour >= end` skips), so `22` permits local hours up through 21. */
const DEFAULT_END_HOUR_LOCAL = 22;
const DEFAULT_UNKNOWN_COUNTRY_UTC_OFFSET = 0;

function resolveFacilityName(patient) {
  const name = String(patient?.primary_facility_name || "").trim();
  return name || "your health facility";
}

function buildCheckupMessage(patientName, facilityName) {
  return [
    `Hello ${patientName || "Patient"}, this is MamaSafe AI supporting ${facilityName}.`,
    "We are checking in on your health today.",
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
  if (normalized.startsWith("+233")) return 0;
  if (normalized.startsWith("+254")) return 3;
  return null;
}

function getLocalHour(utcHour, utcOffset) {
  return (utcHour + utcOffset + 24) % 24;
}

/**
 * Executes one outbound batch scan. Used by cron (no body) or manual POST.
 * @returns {Promise<{ statusCode: number; headers: Record<string,string>; body: string }>}
 */
export async function runWhatsAppSystemCheckup(event = {}) {
  const method = event.httpMethod ?? "POST";
  if (method !== "POST") {
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
  const endHourLocal = Number(
    process.env.WHATSAPP_CHECKUP_LOCAL_END_HOUR || DEFAULT_END_HOUR_LOCAL
  );
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
    const facilityName = resolveFacilityName(patient);
    const countryUtcOffset = getCountryUtcOffsetByPhone(patient.phone);
    const utcOffset = countryUtcOffset === null ? defaultUtcOffset : countryUtcOffset;
    const localHour = getLocalHour(nowHourUtc, utcOffset);
    if (localHour < startHourLocal || localHour >= endHourLocal) {
      skipped += 1;
      skippedQuietHours += 1;
      continue;
    }

    const hasRecent = await repo.hasRecentOutboundBySource(patient.phone, OUTREACH_SOURCE, cooldownHours);
    if (hasRecent) {
      skipped += 1;
      continue;
    }

    const body = buildCheckupMessage(patient.name, facilityName);
    const templateName = String(process.env.WHATSAPP_CHECKUP_TEMPLATE_NAME || "").trim();
    const templateLang = String(process.env.WHATSAPP_CHECKUP_TEMPLATE_LANGUAGE || "en").trim() || "en";
    const templateBodyVars =
      String(process.env.WHATSAPP_CHECKUP_TEMPLATE_HAS_BODY_VARS ?? "true").toLowerCase() !== "false";
    const includeFacilityVariable =
      String(process.env.WHATSAPP_CHECKUP_TEMPLATE_INCLUDE_FACILITY ?? "false").toLowerCase() === "true";
    const templateParams = templateBodyVars
      ? includeFacilityVariable
        ? [patient.name || "Patient", facilityName]
        : [patient.name || "Patient"]
      : [];

    try {
      const reply = templateName
        ? await cloud.sendTemplateMessage({
            phone: patient.phone,
            templateName,
            languageCode: templateLang,
            bodyParameters: templateParams,
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

  const lastAllowedHour = Math.max(startHourLocal, endHourLocal - 1);

  return json(200, {
    ok: true,
    scanned: patients.length,
    sent,
    skipped,
    skippedQuietHours,
    cooldownHours,
    source: OUTREACH_SOURCE,
    nowHourUtc,
    quietHoursPolicy: `patients only when local hour H satisfies ${startHourLocal} <= H < ${endHourLocal}`,
    quietHoursLocalInclusive: `${startHourLocal}:00 through ${lastAllowedHour}:59`,
  });
}

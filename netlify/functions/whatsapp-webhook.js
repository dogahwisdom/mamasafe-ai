/**
 * Meta WhatsApp Cloud API webhook for Netlify Functions.
 */
import { parseIncomingWhatsAppEvents } from "./lib/whatsapp-cloud-service.js";
import { WhatsAppCloudService } from "./lib/whatsapp-cloud-service.js";
import { WhatsAppRepository } from "./lib/whatsapp-repository.js";
import { RiskLevel, WhatsAppTriageService } from "./lib/whatsapp-triage-service.js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const repo = new WhatsAppRepository();
  const cloud = new WhatsAppCloudService();
  const triage = new WhatsAppTriageService();

  if (!verifyToken) {
    console.error("Missing WHATSAPP_VERIFY_TOKEN");
    return json(500, { error: "Webhook verify token is not configured." });
  }

  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};
    const mode = params["hub.mode"];
    const token = params["hub.verify_token"];
    const challenge = params["hub.challenge"];

    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified successfully.");
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/plain" },
        body: challenge || "",
      };
    }

    console.warn("WhatsApp webhook verification failed.", { mode });
    return {
      statusCode: 403,
      headers: { "Content-Type": "text/plain" },
      body: "Forbidden",
    };
  }

  if (event.httpMethod === "POST") {
    try {
      const payload = event.body ? JSON.parse(event.body) : {};
      const changes = parseIncomingWhatsAppEvents(payload);

      for (const change of changes) {
        for (const message of change.messages || []) {
          if (message?.type !== "text") {
            continue;
          }
          const phone = message?.from ? `+${String(message.from).replace(/^\+/, "")}` : "";
          const patient =
            (await repo.findPatientByPhone(phone)) ||
            (await repo.createOrFindPatientByPhone(phone, change?.contacts?.[0]?.profile?.name));
          await repo.logInboundMessage({
            patientId: patient?.id || null,
            phone,
            body: message?.text?.body || "",
            metaMessageId: message?.id || null,
            rawPayload: message,
          });

          const triageResult = await triage.analyzeSymptoms({
            symptoms: message?.text?.body || "",
            gestationalAge: Number(patient?.gestational_weeks || 12),
            previousConditions: JSON.stringify(patient?.alerts || []),
          });

          try {
            const reply = await cloud.sendTextMessage({
              phone,
              body: triageResult.draftResponse,
            });
            await repo.logOutboundMessage({
              patientId: patient?.id || null,
              phone,
              body: triageResult.draftResponse,
              metaMessageId: reply.metaMessageId,
              rawPayload: {
                ...reply.raw,
                triage: triageResult,
                source: "whatsapp-webhook-auto-reply",
              },
            });
          } catch (replyError) {
            console.error("Failed to send WhatsApp auto-reply:", replyError);
          }

          if (
            patient?.id &&
            (triageResult.riskLevel === RiskLevel.HIGH ||
              triageResult.riskLevel === RiskLevel.CRITICAL)
          ) {
            await repo.createReferral({
              patientId: patient.id,
              patientName: patient.name || "WhatsApp Patient",
              reason: triageResult.reasoning,
              recommendedAction: triageResult.recommendedAction,
            });
            await repo.createTask({
              patientId: patient.id,
              patientName: patient.name || "WhatsApp Patient",
              notes: `WhatsApp triage (${triageResult.riskLevel}): ${triageResult.reasoning}`,
            });
          }
        }

        for (const status of change.statuses || []) {
          await repo.updateMessageStatus({
            metaMessageId: status?.id || null,
            status: status?.status || "sent",
            rawPayload: status,
          });
        }
      }

      console.log(
        "WhatsApp webhook event:",
        JSON.stringify(
          {
            object: payload?.object,
            entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0,
            changes: changes.length,
          },
          null,
          2
        )
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "text/plain" },
        body: "EVENT_RECEIVED",
      };
    } catch (error) {
      console.error("Failed to parse WhatsApp webhook payload:", error);
      return json(400, { error: "Invalid webhook payload." });
    }
  }

  return json(405, { error: "Method not allowed." });
}

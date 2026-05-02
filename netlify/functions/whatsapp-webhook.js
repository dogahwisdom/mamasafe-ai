/**
 * Meta WhatsApp Cloud API webhook for Netlify Functions.
 *
 * Operational note (Meta platform, not MamaSafe-specific): WhatsApp Cloud API outbound messages reach
 * a given customer only once your Meta app/WABA is configured for production and the customer has opted
 * in appropriately. Sandbox / test apps often allow only administrators or invited testers; symptom:
 * admins receive replies while strangers see nothing. Inspect Netlify function logs for sends that fail
 * with Meta error codes (e.g. recipient / permission related).
 */
import { parseIncomingWhatsAppEvents, WhatsAppCloudService } from "./lib/whatsapp-cloud-service.js";
import { WhatsAppQuestionnaireService } from "./lib/whatsapp-questionnaire-service.js";
import { WhatsAppRepository } from "./lib/whatsapp-repository.js";
import { WhatsAppInboundOrchestrator } from "./lib/whatsapp-inbound-orchestrator.js";

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
  const questionnaire = new WhatsAppQuestionnaireService();
  const inbound = new WhatsAppInboundOrchestrator({ repo, cloud, questionnaire });

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
          try {
            await inbound.handleInboundMessage(message);
          } catch (messageError) {
            console.error("WhatsApp webhook: inbound message handling error:", messageError);
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

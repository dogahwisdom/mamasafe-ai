/**
 * Meta WhatsApp Cloud API webhook for Netlify Functions.
 */
import { parseIncomingWhatsAppEvents } from "./lib/whatsapp-cloud-service.js";
import { WhatsAppCloudService } from "./lib/whatsapp-cloud-service.js";
import { WhatsAppQuestionnaireService } from "./lib/whatsapp-questionnaire-service.js";
import { WhatsAppRepository } from "./lib/whatsapp-repository.js";

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
          if (message?.id && (await repo.hasInboundMessage(message.id))) {
            console.log("Skipping duplicate inbound whatsapp message:", message.id);
            continue;
          }
          const phone = message?.from ? `+${String(message.from).replace(/^\+/, "")}` : "";
          const inboundBody = message?.text?.body || "";
          const patient = await repo.findPatientByPhone(phone);
          await repo.logInboundMessage({
            patientId: patient?.id || null,
            phone,
            body: inboundBody,
            metaMessageId: message?.id || null,
            rawPayload: message,
          });

          const activeSession = await repo.getActiveSessionByPhone(phone);
          if (!patient && !activeSession) {
            const responseText = [
              "Hello, welcome to MamaSafe AI. How can I assist you today?",
              "",
              "Please reply with one option:",
              "1. Pregnant mother",
              "2. Baby (0-12 months)",
              "3. General patient",
            ].join("\n");
            await repo.upsertSession({
              phone,
              patientId: null,
              flowType: "intake",
              stepKey: "choose_profile",
              stepIndex: 0,
              answers: [],
              status: "active",
              completedAt: null,
            });
            try {
              const reply = await cloud.sendTextMessage({ phone, body: responseText });
              await repo.logOutboundMessage({
                patientId: null,
                phone,
                body: responseText,
                metaMessageId: reply.metaMessageId,
                rawPayload: {
                  ...reply.raw,
                  source: "whatsapp-webhook-unregistered-welcome",
                  flow_type: "intake",
                },
              });
            } catch (replyError) {
              console.error("Failed to send WhatsApp welcome reply:", replyError);
            }
            continue;
          }

          const shouldUseQuestionnaire = questionnaire.shouldStartFlow(inboundBody, activeSession);
          let triageResult = null;
          let responseText = "";
          let source = "whatsapp-webhook-auto-reply";
          let flowType = activeSession?.flow_type || "intake";

          if (shouldUseQuestionnaire) {
            const flow = questionnaire.handleMessage({
              messageText: inboundBody,
              session: activeSession,
              patientName: patient?.name || "Mum/Patient",
            });
            responseText = flow.responseText;
            source = "whatsapp-webhook-questionnaire";
            flowType = flow.nextSession?.flow_type || flow.nextSession?.flowType || flowType;
            await repo.upsertSession({
              phone,
              patientId: patient?.id || null,
              flowType: flow.nextSession?.flow_type || flow.nextSession?.flowType || "intake",
              stepKey: flow.nextSession?.step_key || flow.nextSession?.stepKey || "choose_profile",
              stepIndex: flow.nextSession?.step_index ?? flow.nextSession?.stepIndex ?? 0,
              answers: flow.nextSession?.answers || [],
              status: flow.nextSession?.status || "active",
              completedAt: flow.nextSession?.completed_at || flow.nextSession?.completedAt || null,
            });
            triageResult = flow.triageResult || null;
          } else {
            triageResult = questionnaire.buildRuleBasedSymptomResponse(inboundBody);
            responseText = triageResult.draftResponse;
            source = "whatsapp-webhook-rule-based";
            flowType = activeSession?.flow_type || "free_text";
          }

          try {
            const reply = await cloud.sendTextMessage({
              phone,
              body: responseText,
            });
            await repo.logOutboundMessage({
              patientId: patient?.id || null,
              phone,
              body: responseText,
              metaMessageId: reply.metaMessageId,
              rawPayload: {
                ...reply.raw,
                triage: triageResult,
                source,
                flow_type: flowType,
              },
            });
          } catch (replyError) {
            console.error("Failed to send WhatsApp auto-reply:", replyError);
          }

          if (
            patient?.id &&
            triageResult &&
            (String(triageResult.riskLevel).toLowerCase() === "high" ||
              String(triageResult.riskLevel).toLowerCase() === "critical")
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

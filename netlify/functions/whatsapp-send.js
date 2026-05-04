import { WhatsAppCloudService } from "./lib/whatsapp-cloud-service.js";
import { WhatsAppRepository } from "./lib/whatsapp-repository.js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const phone = payload.phone;
    const body = String(payload.message || "").trim();

    if (!phone || !body) {
      return json(400, { error: "phone and message are required." });
    }

    const cloud = new WhatsAppCloudService();
    const repo = new WhatsAppRepository();
    const sendResult = await cloud.sendTextMessage({ phone, body });
    const patient =
      payload.patientId || !repo.isEnabled() ? null : await repo.findPatientByPhone(phone);

    const metaRaw =
      sendResult.raw && typeof sendResult.raw === "object" ? sendResult.raw : {};
    const logSource = payload.logSource ? String(payload.logSource).trim() : "";
    const rawPayload = {
      ...metaRaw,
      ...(logSource ? { outboundSource: logSource } : {}),
    };

    const logResult = await repo.logOutboundMessage({
      patientId: payload.patientId || patient?.id || null,
      phone,
      body,
      metaMessageId: sendResult.metaMessageId,
      rawPayload,
      relatedReminderId: payload.relatedReminderId || null,
    });

    return json(200, {
      success: true,
      waId: sendResult.waId,
      metaMessageId: sendResult.metaMessageId,
      dbLogged: !!logResult?.ok,
      dbLogReason: logResult?.reason || null,
    });
  } catch (error) {
    console.error("whatsapp-send failed:", error);
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown WhatsApp send error.",
    });
  }
}

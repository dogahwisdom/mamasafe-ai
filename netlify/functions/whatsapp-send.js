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

    const welcomeTemplate = String(process.env.WHATSAPP_WELCOME_TEMPLATE_NAME || "").trim();
    const welcomeLang =
      String(process.env.WHATSAPP_WELCOME_TEMPLATE_LANGUAGE || "en").trim() || "en";
    /** @type {"first_name_only"|"first_name_facility"} */
    const welcomeParamModeRaw = (
      process.env.WHATSAPP_WELCOME_TEMPLATE_BODY_PARAM_MODE || "first_name_only"
    ).trim();
    const welcomeParamMode =
      welcomeParamModeRaw === "first_name_facility"
        ? "first_name_facility"
        : "first_name_only";

    const logSource = String(payload.logSource || "").trim();
    const enrollmentFirst = String(payload.enrollmentPatientFirstName ?? "").trim();
    const enrollmentFacility = String(payload.enrollmentFacilityName ?? "").trim();

    const useWelcomeTemplate =
      !!welcomeTemplate &&
      logSource === "enrollment_welcome" &&
      enrollmentFirst.length > 0;

    const patient =
      payload.patientId || !repo.isEnabled() ? null : await repo.findPatientByPhone(phone);

    let sendResult;
    /** @type {"text"|"template"} */
    let outboundMessageType = "text";
    let bodyForLog = body;

    if (useWelcomeTemplate) {
      const bodyParameters =
        welcomeParamMode === "first_name_facility"
          ? [enrollmentFirst, enrollmentFacility || "Your care facility"]
          : [enrollmentFirst];
      sendResult = await cloud.sendTemplateMessage({
        phone,
        templateName: welcomeTemplate,
        languageCode: welcomeLang,
        bodyParameters,
      });
      outboundMessageType = "template";
      bodyForLog = `[template:${welcomeTemplate}|${welcomeLang}] ${body}`;
    } else {
      sendResult = await cloud.sendTextMessage({ phone, body });
    }

    const metaRaw =
      sendResult.raw && typeof sendResult.raw === "object" ? sendResult.raw : {};
    const logSourceTrim = payload.logSource ? String(payload.logSource).trim() : "";
    const rawPayload = {
      ...metaRaw,
      ...(logSourceTrim ? { outboundSource: logSourceTrim } : {}),
      ...(useWelcomeTemplate
        ? { template_name: welcomeTemplate, template_language: welcomeLang }
        : {}),
    };

    const logResult = await repo.logOutboundMessage({
      patientId: payload.patientId || patient?.id || null,
      phone,
      body: bodyForLog,
      messageType: outboundMessageType,
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
      usedTemplate: useWelcomeTemplate,
      templateName: useWelcomeTemplate ? welcomeTemplate : null,
    });
  } catch (error) {
    console.error("whatsapp-send failed:", error);
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown WhatsApp send error.",
    });
  }
}

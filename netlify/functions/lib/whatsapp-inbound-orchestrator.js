import { WhatsAppInboundContentExtractor } from "./whatsapp-inbound-content-extractor.js";
import { WhatsAppPhoneNormalizer } from "./whatsapp-phone-normalizer.js";

/**
 * Coordinates logging, session state, and outbound replies for a single webhook message envelope.
 */
export class WhatsAppInboundOrchestrator {
  /**
   * @param {{
   *   repo: import("./whatsapp-repository.js").WhatsAppRepository;
   *   cloud: import("./whatsapp-cloud-service.js").WhatsAppCloudService;
   *   questionnaire: import("./whatsapp-questionnaire-service.js").WhatsAppQuestionnaireService;
   * }} deps
   */
  constructor(deps) {
    this.repo = deps.repo;
    this.cloud = deps.cloud;
    this.questionnaire = deps.questionnaire;
  }

  getDisplayName(patient) {
    const rawName = String(patient?.name || "").trim();
    if (!rawName) return "there";
    const lowered = rawName.toLowerCase();
    const blockedNameFragments = ["test", "terminal", "demo", "sample", "whatsapp patient"];
    if (blockedNameFragments.some((item) => lowered.includes(item))) {
      return "there";
    }
    return rawName.split(/\s+/)[0].slice(0, 40);
  }

  appendUnregisteredPrompt(messageText) {
    const text = String(messageText || "").trim();
    if (!text) return text;
    if (text.toLowerCase().includes("register")) return text;
    return `${text}\n\nFor personalized follow-up and records, please register at your nearest MamaSafe-supported facility.`;
  }

  /**
   * Processes one inbound `messages[]` item (idempotent by meta message id).
   * @param {Record<string, unknown>} message
   */
  async handleInboundMessage(message) {
    const fromRaw = message?.from;
    if (!WhatsAppPhoneNormalizer.isLikelyWhatsAppCaller(fromRaw)) {
      console.warn("WhatsApp webhook skipped message with unusable sender id:", fromRaw);
      return;
    }

    const phone = WhatsAppPhoneNormalizer.canonicalFromMetaFrom(fromRaw);
    const content = WhatsAppInboundContentExtractor.fromCloudMessage(message);

    if (content.kind !== "text") {
      await this.handleUnsupportedInbound(message, phone, content.label);
      return;
    }

    const inboundBody = content.body;

    if (message?.id && (await this.repo.hasInboundMessage(message.id))) {
      console.log("Skipping duplicate inbound whatsapp message:", message.id);
      return;
    }

    const patient = await this.repo.findPatientByPhone(phone);
    await this.repo.logInboundMessage({
      patientId: patient?.id || null,
      phone,
      body: inboundBody,
      metaMessageId: message?.id || null,
      rawPayload: message,
      messageType: "text",
    });

    await this.dispatchTextInbound({ phone, inboundBody, patient, message });
  }

  /**
   * Voice notes/images etc.: log and ask for typed text where possible (Meta only delivers transcripts when enabled).
   * @private
   */
  async handleUnsupportedInbound(message, phone, logLabel) {
    if (message?.id && (await this.repo.hasInboundMessage(message.id))) {
      console.log("Skipping duplicate inbound whatsapp message:", message.id);
      return;
    }

    const patient = await this.repo.findPatientByPhone(phone);
    await this.repo.logInboundMessage({
      patientId: patient?.id || null,
      phone,
      body: logLabel,
      metaMessageId: message?.id || null,
      rawPayload: message,
      messageType: "system",
    });

    const responseText =
      "Thank you for your message. For safe and accurate screening, MamaSafe AI can only read typed text replies on this number.\n\n" +
      "Please send plain text only (tap the microphone keyboard icon to switch to typing), for example:\nhello\n1";

    await this.maybeSendOutbound({
      phone,
      patientId: patient?.id || null,
      body: responseText,
      rawExtras: {
        source: "whatsapp-webhook-non-text",
        flow_type: "assist",
      },
      logContext: `non-text (${message?.type})`,
    });
  }

  /**
   * @private
   */
  async maybeSendOutbound({ phone, patientId, body, rawExtras = {}, logContext = "" }) {
    if (!this.cloud.isConfigured()) {
      console.error(
        `[${logContext}] WhatsApp outbound skipped: WhatsApp Cloud API credentials are not configured.`,
        phone
      );
      return;
    }
    try {
      const reply = await this.cloud.sendTextMessage({ phone, body });
      await this.repo.logOutboundMessage({
        patientId: patientId ?? null,
        phone,
        body,
        metaMessageId: reply.metaMessageId,
        rawPayload: { ...reply.raw, ...rawExtras },
      });
    } catch (replyError) {
      console.error(`[${logContext}] WhatsApp send failed (${phone}):`, replyError);
    }
  }

  /**
   * @private
   */
  async dispatchTextInbound({ phone, inboundBody, patient, message }) {
    const normalizedInbound = String(inboundBody || "").trim().toLowerCase();
    const isRegisteredPatient = Boolean(patient?.id);

    if (["stop", "unsubscribe", "opt out"].includes(normalizedInbound)) {
      await this.repo.setPatientCheckupOptOut(phone, true);
      await this.maybeSendOutbound({
        phone,
        patientId: patient?.id ?? null,
        body:
          "You have been unsubscribed from proactive MamaSafe check-up messages. You can still message us anytime. Send START to opt in again.",
        rawExtras: { source: "whatsapp-webhook-opt-out", flow_type: "system_checkup" },
        logContext: "opt-out",
      });
      return;
    }

    if (["start", "subscribe", "opt in"].includes(normalizedInbound)) {
      await this.repo.setPatientCheckupOptOut(phone, false);
      await this.maybeSendOutbound({
        phone,
        patientId: patient?.id ?? null,
        body:
          "You are now subscribed to proactive MamaSafe check-up messages again. Send hello to start a guided check-up now.",
        rawExtras: { source: "whatsapp-webhook-opt-in", flow_type: "system_checkup" },
        logContext: "opt-in",
      });
      return;
    }

    const activeSession = await this.repo.getActiveSessionByPhone(phone);
    if (!patient && !activeSession) {
      const responseText = [
        "Hello, welcome to MamaSafe AI. How can I assist you today?",
        "",
        "Please reply with one option:",
        "1. Pregnant mother",
        "2. Baby (0-12 months)",
        "3. General patient",
      ].join("\n");
      await this.repo.upsertSession({
        phone,
        patientId: null,
        flowType: "intake",
        stepKey: "choose_profile",
        stepIndex: 0,
        answers: [],
        status: "active",
        completedAt: null,
      });
      await this.maybeSendOutbound({
        phone,
        patientId: null,
        body: responseText,
        rawExtras: { source: "whatsapp-webhook-unregistered-welcome", flow_type: "intake" },
        logContext: "welcome",
      });
      return;
    }

    const shouldUseQuestionnaire = this.questionnaire.shouldStartFlow(inboundBody, activeSession);
    let triageResult = null;
    let responseText = "";
    let source = "whatsapp-webhook-auto-reply";
    let flowType = activeSession?.flow_type || "intake";
    let shouldAppendRegistrationPrompt = false;

    if (shouldUseQuestionnaire) {
      const flow = this.questionnaire.handleMessage({
        messageText: inboundBody,
        session: activeSession,
        patientName: this.getDisplayName(patient),
      });
      responseText = flow.responseText;
      source = "whatsapp-webhook-questionnaire";
      flowType = flow.nextSession?.flow_type || flow.nextSession?.flowType || flowType;
      await this.repo.upsertSession({
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
      if (!isRegisteredPatient) {
        const flowStatus = flow.nextSession?.status || "active";
        shouldAppendRegistrationPrompt =
          flow.kind === "complete" || flow.kind === "end" || flowStatus === "completed" || flowStatus === "cancelled";
      }
    } else {
      triageResult = this.questionnaire.buildRuleBasedSymptomResponse(inboundBody);
      responseText = triageResult.draftResponse;
      source = "whatsapp-webhook-rule-based";
      flowType = activeSession?.flow_type || "free_text";
      shouldAppendRegistrationPrompt = !isRegisteredPatient;
    }

    if (shouldAppendRegistrationPrompt) {
      responseText = this.appendUnregisteredPrompt(responseText);
    }

    await this.maybeSendOutbound({
      phone,
      patientId: patient?.id ?? null,
      body: responseText,
      rawExtras: {
        triage: triageResult,
        source,
        flow_type: flowType,
      },
      logContext: "auto-reply",
    });

    if (
      patient?.id &&
      triageResult &&
      (String(triageResult.riskLevel).toLowerCase() === "high" ||
        String(triageResult.riskLevel).toLowerCase() === "critical")
    ) {
      await this.repo.createReferral({
        patientId: patient.id,
        patientName: patient.name || "WhatsApp Patient",
        reason: triageResult.reasoning,
        recommendedAction: triageResult.recommendedAction,
      });
      await this.repo.createTask({
        patientId: patient.id,
        patientName: patient.name || "WhatsApp Patient",
        notes: `WhatsApp triage (${triageResult.riskLevel}): ${triageResult.reasoning}`,
      });
    }
  }
}

import { WhatsAppCloudService } from "./lib/whatsapp-cloud-service.js";
import { WhatsAppRepository } from "./lib/whatsapp-repository.js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const config = {
  schedule: "0 */12 * * *",
};

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const repo = new WhatsAppRepository();
  const cloud = new WhatsAppCloudService();
  const sessions = await repo.listSessionsNeedingReminder(12);
  let sent = 0;

  for (const session of sessions) {
    const reminderText = [
      "Hello from MamaSafe AI. We are waiting for your reply to continue your health check.",
      "Reply with your next answer, or send 'restart' to begin again, or 'end' to stop.",
    ].join(" ");
    try {
      const reply = await cloud.sendTextMessage({
        phone: session.phone,
        body: reminderText,
      });
      await repo.logOutboundMessage({
        patientId: session.patient_id || null,
        phone: session.phone,
        body: reminderText,
        metaMessageId: reply.metaMessageId,
        rawPayload: {
          ...reply.raw,
          source: "whatsapp-session-reminder",
          flow_type: session.flow_type || "intake",
        },
      });
      await repo.markSessionReminderSent(session.phone);
      sent += 1;
    } catch (error) {
      console.error("Failed to send session reminder:", session.phone, error);
    }
  }

  return json(200, { ok: true, scanned: sessions.length, remindersSent: sent });
}

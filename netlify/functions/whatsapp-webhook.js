/**
 * Meta WhatsApp Cloud API webhook for Netlify Functions.
 *
 * GET  -> verification handshake from Meta
 * POST -> inbound messages and status updates
 *
 * Callback URL example:
 *   https://<your-site>.netlify.app/.netlify/functions/whatsapp-webhook
 */

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

      // For now we acknowledge immediately and log the event.
      // Next step: persist inbound messages / statuses and trigger MamaSafe workflows.
      console.log(
        "WhatsApp webhook event:",
        JSON.stringify(
          {
            object: payload?.object,
            entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0,
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

import { authorizeReminderDispatch } from "./lib/reminder-dispatch-auth.js";

export const config = {
  schedule: "*/15 * * * *",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function baseUrlFromEnv() {
  const url = String(process.env.URL || process.env.DEPLOY_PRIME_URL || "").trim();
  return url.replace(/\/+$/, "");
}

export async function handler(event) {
  // This function exists purely to call the real dispatcher with a shared secret
  // so scheduled invocations aren't authenticated via spoofable headers.
  const enforce = String(process.env.REMINDER_DISPATCH_ENFORCE_AUTH || "").toLowerCase() === "true";
  const secret = String(process.env.REMINDER_DISPATCH_SECRET || "").trim();

  if (enforce && !secret) {
    return json(500, {
      ok: false,
      reason: "missing_dispatch_secret",
      error: "REMINDER_DISPATCH_SECRET must be set when REMINDER_DISPATCH_ENFORCE_AUTH=true for scheduled dispatch.",
    });
  }

  const baseUrl = baseUrlFromEnv();
  if (!baseUrl) {
    return json(500, { ok: false, reason: "missing_site_url", error: "Missing Netlify URL/DEPLOY_PRIME_URL." });
  }

  const res = await fetch(`${baseUrl}/.netlify/functions/reminder-dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({}),
  });

  const payload = await res.json().catch(() => ({}));
  return json(res.status, payload);
}


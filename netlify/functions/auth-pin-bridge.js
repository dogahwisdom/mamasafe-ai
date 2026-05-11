import { createClient } from "@supabase/supabase-js";
import {
  hashPinForCompare,
  pinBridgeEmail,
  syntheticPasswordForPinBridge,
} from "./lib/pin-bridge-core.js";

function headerGet(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  const want = String(name).toLowerCase();
  for (const key of Object.keys(headers)) {
    if (String(key).toLowerCase() === want) return headers[key] || "";
  }
  return "";
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function isUuidLike(id) {
  const s = String(id || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function parseHostname(urlish) {
  try {
    const u = String(urlish || "").trim();
    if (!u) return "";
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    return new URL(withProto).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function stripLeadingWww(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

/** deploy-preview-12--mysite.netlify.app → mysite.netlify.app */
function deployNormalizedHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  const m = h.match(/^deploy-(?:preview-\d+|[^-]+)--(.+)$/);
  return m ? m[1] : h;
}

function normalizedSiteHost(hostname) {
  return deployNormalizedHost(stripLeadingWww(hostname));
}

function originLikelyFirstParty(event) {
  const originRaw = String(headerGet(event?.headers || {}, "origin") || "").trim();
  const refererRaw = String(headerGet(event?.headers || {}, "referer") || "").trim();
  const origin = originRaw.replace(/\/+$/, "");

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (refererRaw && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(refererRaw)) return true;

  const candidateUrls = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
    process.env.AUTH_PIN_BRIDGE_EXTRA_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((x) => String(x).split(","))
    .map((x) => x.trim())
    .filter(Boolean);

  const originHost = origin ? normalizedSiteHost(parseHostname(origin)) : "";
  const refHost = refererRaw ? normalizedSiteHost(parseHostname(refererRaw)) : "";
  const probe = originHost || refHost;

  if (candidateUrls.length === 0) return true;

  const allowedHosts = new Set(
    candidateUrls.map((c) => normalizedSiteHost(parseHostname(c))).filter(Boolean)
  );

  if (!probe) return false;

  for (const ah of allowedHosts) {
    if (!ah) continue;
    if (probe === ah) return true;
    if (probe.endsWith(`--${ah}`)) return true;
  }
  return false;
}

function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function createAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*" } };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  if (!originLikelyFirstParty(event)) {
    return json(403, { ok: false, error: "Origin not allowed for pin bridge." });
  }

  const pepper = String(process.env.AUTH_PIN_BRIDGE_PEPPER || "").trim();
  if (!pepper || pepper.length < 8) {
    return json(503, {
      ok: false,
      error:
        "AUTH_PIN_BRIDGE_PEPPER is not set (min 8 chars). Set it in Netlify env to enable reminder dispatch auth.",
    });
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body." });
  }

  const userId = String(body.userId || "").trim();
  const pin = String(body.pin || "");
  if (!isUuidLike(userId) || !pin) {
    return json(400, { ok: false, error: "userId and pin are required." });
  }

  const admin = createServiceClient();
  const anon = createAnonClient();
  if (!admin || !anon) {
    return json(500, { ok: false, error: "Supabase is not configured on the server." });
  }

  const { data: row, error: rowErr } = await admin.from("users").select("id, pin_hash").eq("id", userId).maybeSingle();
  if (rowErr || !row?.pin_hash) {
    return json(401, { ok: false, error: "Invalid credentials." });
  }
  if (hashPinForCompare(pin) !== String(row.pin_hash)) {
    return json(401, { ok: false, error: "Invalid credentials." });
  }

  const emailDomain = String(process.env.AUTH_PIN_BRIDGE_EMAIL_DOMAIN || "pin-bridge.local").trim() || "pin-bridge.local";
  const email = pinBridgeEmail(userId, emailDomain);
  const synthetic = syntheticPasswordForPinBridge(userId, pin, pepper);

  const up = await admin.auth.admin.updateUserById(userId, {
    email,
    password: synthetic,
    email_confirm: true,
  });
  if (up.error) {
    const cr = await admin.auth.admin.createUser({
      id: userId,
      email,
      password: synthetic,
      email_confirm: true,
    });
    if (cr.error) {
      const msg = String(cr.error.message || "").toLowerCase();
      if (!msg.includes("already") && !msg.includes("registered")) {
        console.error("auth-pin-bridge createUser:", cr.error);
        return json(500, { ok: false, error: "Could not create auth session user." });
      }
      const up2 = await admin.auth.admin.updateUserById(userId, {
        email,
        password: synthetic,
        email_confirm: true,
      });
      if (up2.error) {
        console.error("auth-pin-bridge updateUserById after create:", up2.error);
        return json(500, { ok: false, error: "Could not sync auth credentials." });
      }
    }
  }

  const { data: signData, error: signErr } = await anon.auth.signInWithPassword({
    email,
    password: synthetic,
  });

  if (signErr || !signData?.session?.access_token) {
    console.error("auth-pin-bridge signInWithPassword:", signErr?.message);
    return json(500, { ok: false, error: "Could not start Supabase session." });
  }

  const s = signData.session;
  return json(200, {
    ok: true,
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_in: s.expires_in ?? null,
    expires_at: s.expires_at ?? null,
    token_type: s.token_type || "bearer",
  });
}

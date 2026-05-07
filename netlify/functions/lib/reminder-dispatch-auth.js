import { createClient } from "@supabase/supabase-js";

function headerGet(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  const want = String(name).toLowerCase();
  for (const key of Object.keys(headers)) {
    if (String(key).toLowerCase() === want) return headers[key] || "";
  }
  return "";
}

/** Netlify scheduled invocations omit custom Bearer tokens; UA / event header identifies them (spoofable from open internet — pair with REMINDER_DISPATCH_ENFORCE_AUTH). */
export function isLikelyNetlifyScheduledInvocation(event) {
  const nf = String(headerGet(event?.headers || {}, "x-nf-event")).toLowerCase();
  const ua = String(headerGet(event?.headers || {}, "user-agent")).toLowerCase();
  return nf === "schedule" || ua.includes("netlify clockwork");
}

/**
 * @returns {Promise<{ ok: boolean, reason?: string, role?: string | null, kind?: string }>}
 */
export async function authorizeReminderDispatch(event, createSupabaseAdmin) {
  const enforce = String(process.env.REMINDER_DISPATCH_ENFORCE_AUTH || "").toLowerCase() === "true";
  const sharedSecret = String(process.env.REMINDER_DISPATCH_SECRET || "").trim();

  const headers = event?.headers || {};
  const authHeader = String(headerGet(headers, "authorization"));

  if (sharedSecret && authHeader === `Bearer ${sharedSecret}`) {
    return { ok: true, kind: "shared_secret", role: null };
  }

  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearer && bearer !== sharedSecret) {
    const fromJwt = await validateSupabaseUserToken(bearer, createSupabaseAdmin);
    if (fromJwt.ok) return fromJwt;
  }

  if (isLikelyNetlifyScheduledInvocation(event)) {
    return { ok: true, kind: "schedule", role: null };
  }

  if (!enforce && !sharedSecret) {
    return { ok: true, kind: "legacy_open", role: null };
  }

  return { ok: false, reason: "unauthorized_reminder_dispatch" };
}

async function validateSupabaseUserToken(accessToken, createSupabaseAdmin) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anonKey || !accessToken) {
    return { ok: false, reason: "missing_supabase_or_token" };
  }

  try {
    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(accessToken);
    if (userErr || !userData?.user?.id) {
      return { ok: false, reason: "invalid_token" };
    }

    const admin = createSupabaseAdmin();
    if (!admin) {
      return { ok: false, reason: "service_role_missing" };
    }

    const { data: profile, error: profileErr } = await admin
      .from("users")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return { ok: false, reason: "profile_not_found" };
    }

    const role = String(profile.role || "");
    if (!["superadmin", "clinic", "pharmacy"].includes(role)) {
      return { ok: false, reason: "forbidden_role" };
    }

    return { ok: true, kind: "user_jwt", role };
  } catch {
    return { ok: false, reason: "auth_error" };
  }
}

import { createClient } from "@supabase/supabase-js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

async function requireSuperadmin(event) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const auth = String(event?.headers?.authorization || event?.headers?.Authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!url || !anonKey || !token) return { ok: false, reason: "missing_auth" };

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user?.id) return { ok: false, reason: "invalid_token" };

  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false, reason: "supabase_not_configured" };

  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile || String(profile.role) !== "superadmin") return { ok: false, reason: "forbidden" };
  return { ok: true };
}

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  const gate = await requireSuperadmin(event);
  if (!gate.ok) {
    return json(401, { ok: false, reason: gate.reason, error: "Unauthorized" });
  }

  const admin = createSupabaseAdmin();
  if (!admin) return json(500, { ok: false, reason: "supabase_not_configured" });

  const url = new URL(event.rawUrl || "https://example.invalid");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "50") || 50));
  const eventType = String(url.searchParams.get("eventType") || "").trim();

  let q = admin
    .from("system_events")
    .select("id, created_at, event_type, facility_id, meta")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (eventType) q = q.eq("event_type", eventType);

  const { data, error } = await q;
  if (error) return json(500, { ok: false, reason: "db_error", error: error.message });
  return json(200, { ok: true, events: data || [] });
}


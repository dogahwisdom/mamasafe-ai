import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type PinSessionSyncResult =
  | { ok: true }
  | { ok: false; error: string; httpStatus?: number };

/**
 * After PIN login, establish a real Supabase Auth session so Netlify functions
 * (e.g. reminder-dispatch) can validate `Authorization: Bearer <access_token>`.
 * Requires `auth-pin-bridge` + `AUTH_PIN_BRIDGE_PEPPER` on Netlify.
 */
export async function syncSupabaseSessionAfterPinLogin(
  userId: string,
  pin: string
): Promise<PinSessionSyncResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "App is missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY." };
  }
  if (typeof window === "undefined") {
    return { ok: false, error: "Not running in a browser." };
  }
  if (!userId || !pin) {
    return { ok: false, error: "Missing user id or PIN for session sync." };
  }

  try {
    const res = await fetch("/.netlify/functions/auth-pin-bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, pin }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      access_token?: string;
      refresh_token?: string;
      error?: string;
    };
    if (!res.ok || !payload.access_token || !payload.refresh_token) {
      const errMsg =
        typeof payload.error === "string" && payload.error.trim()
          ? payload.error.trim()
          : `HTTP ${res.status}`;
      console.warn("[MamaSafe] auth-pin-bridge failed:", errMsg);
      return { ok: false, error: errMsg, httpStatus: res.status };
    }
    const { error } = await supabase.auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });
    if (error) {
      console.warn("[MamaSafe] setSession after pin bridge failed:", error.message);
      return { ok: false, error: error.message, httpStatus: undefined };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[MamaSafe] auth-pin-bridge request failed:", msg);
    return { ok: false, error: msg };
  }
}

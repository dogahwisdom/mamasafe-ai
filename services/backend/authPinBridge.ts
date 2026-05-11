import { supabase, isSupabaseConfigured } from "../supabaseClient";

/**
 * After PIN login, establish a real Supabase Auth session so Netlify functions
 * (e.g. reminder-dispatch) can validate `Authorization: Bearer <access_token>`.
 * Requires `auth-pin-bridge` + `AUTH_PIN_BRIDGE_PEPPER` on Netlify.
 */
export async function syncSupabaseSessionAfterPinLogin(
  userId: string,
  pin: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || typeof window === "undefined") return false;
  if (!userId || !pin) return false;

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
      if (import.meta.env.DEV) {
        console.warn("[MamaSafe] auth-pin-bridge:", payload?.error || `HTTP ${res.status}`);
      }
      return false;
    }
    const { error } = await supabase.auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });
    if (error) {
      console.warn("[MamaSafe] setSession after pin bridge failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[MamaSafe] auth-pin-bridge request failed:", e);
    return false;
  }
}

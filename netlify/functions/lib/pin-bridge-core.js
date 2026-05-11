import CryptoJS from "crypto-js";

/**
 * Deterministic email for Supabase Auth rows that mirror `public.users` PIN logins.
 * Domain must be accepted by your Supabase project (or disable strict email checks for dev).
 */
export function pinBridgeEmail(userId, domain) {
  const d = String(domain || "pin-bridge.local").trim() || "pin-bridge.local";
  return `pin+${String(userId).toLowerCase().trim()}@${d}`;
}

/** Long password derived from PIN so Supabase min-length rules stay satisfied. */
export function syntheticPasswordForPinBridge(userId, pin, pepper) {
  return CryptoJS.SHA256(`${String(userId)}|${String(pin)}|${String(pepper)}`).toString();
}

export function hashPinForCompare(plain) {
  return CryptoJS.SHA256(`salt_${plain}_secure`).toString();
}

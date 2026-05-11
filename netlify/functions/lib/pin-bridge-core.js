import CryptoJS from "crypto-js";

/**
 * Deterministic email for Supabase Auth rows that mirror `public.users` PIN logins.
 * Domain must be accepted by your Supabase project (or disable strict email checks for dev).
 */
export function pinBridgeEmail(userId, domain) {
  const d = String(domain || "pin-bridge.local").trim() || "pin-bridge.local";
  return `pin+${String(userId).toLowerCase().trim()}@${d}`;
}

/**
 * Deterministic synthetic email for non-UUID public `users.id` (RFC-safe local part).
 */
export function pinBridgeEmailStable(publicUserId, domain) {
  const d = String(domain || "pin-bridge.local").trim() || "pin-bridge.local";
  const h = CryptoJS.SHA256(`mamasafe_pin_bridge|${String(publicUserId)}`).toString().slice(0, 48);
  return `b${h}@${d}`;
}

/** Long password derived from PIN so Supabase min-length rules stay satisfied. */
export function syntheticPasswordForPinBridge(userId, pin, pepper) {
  return CryptoJS.SHA256(`${String(userId)}|${String(pin)}|${String(pepper)}`).toString();
}

export function hashPinForCompare(plain) {
  return CryptoJS.SHA256(`salt_${plain}_secure`).toString();
}

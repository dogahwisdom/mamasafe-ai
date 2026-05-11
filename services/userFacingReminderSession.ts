/**
 * End-user copy for reminder / session issues. Technical details belong in logs only.
 */

export function reminderSessionBannerAfterPinFailure(error?: string): string {
  const e = String(error || "").toLowerCase();
  if (
    e.includes("uuid") ||
    e.includes("legacy") ||
    e.includes("must be updated") ||
    e.includes("automated reminders")
  ) {
    return "Automated WhatsApp reminders aren’t available for this account version yet. Everything else works as usual. Please contact MamaSafe support and we’ll update your facility login.";
  }
  if (e.includes("origin not allowed") || e.includes("403")) {
    return "We couldn’t verify this browser with our servers. Try signing out and signing in again, or open the app using the link your facility was given.";
  }
  if (e.includes("pepper") || e.includes("503") || e.includes("not configured")) {
    return "A configuration step is still pending on our side before reminders can send. Please contact MamaSafe support.";
  }
  if (e.includes("invalid credentials")) {
    return "We couldn’t refresh your secure session. Sign out, sign in with your PIN again, then try reminders once more.";
  }
  return "We couldn’t finish connecting automated reminders for this session. Sign out, sign in with your PIN again, or contact MamaSafe support if this continues.";
}

export function reminderSessionBannerColdStart(): string {
  return "To send WhatsApp reminders from this device, sign out once and sign back in with your facility PIN.";
}

export function reminderQueueModalSessionHint(): string {
  return "Reminders need a fresh sign-in: sign out, then sign in with your PIN, and open this queue again.";
}

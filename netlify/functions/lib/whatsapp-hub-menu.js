/**
 * MamaSafe AI — WhatsApp main menu copy (text-first; works without interactive buttons).
 * Tone: warm, clinical, concise. One optional emoji in the header only.
 */

const EMERGENCY_LINE =
  "If this is an emergency (severe pain, heavy bleeding, breathing difficulty, loss of consciousness), go to the nearest hospital or call emergency services now.";

/**
 * @param {{ firstName?: string; facilityLabel?: string | null; isRegistered?: boolean }} p
 */
export function formatHubWelcome(p) {
  const name = String(p.firstName || "").trim();
  const facility = String(p.facilityLabel || "").trim();
  const registered = p.isRegistered === true;

  const greet =
    name && name.toLowerCase() !== "there"
      ? `Welcome to MamaSafe AI, ${name}`
      : "Welcome to MamaSafe AI";

  const scope = facility
    ? `We support safer maternal and family care with ${facility}.`
    : "We support safer maternal and family care with your health facility.";

  const who = registered
    ? "How would you like to continue?"
    : "This channel can guide a short health check and point you to next steps. How can we help today?";

  return [
    `${greet} — ${scope}`,
    "",
    who,
    "",
    EMERGENCY_LINE,
    "",
    formatHubMenuBody(),
    "",
    "Reply with a number (1–6), or send *hello* anytime to see this menu again. Send *end* to stop.",
  ].join("\n");
}

export function formatHubMenuBody() {
  return [
    "1 — Guided health check — Pregnancy",
    "2 — Guided health check — Baby (0–12 months)",
    "3 — Guided health check — General",
    "4 — Visit & scheduling",
    "5 — Billing & payments",
    "6 — Contact a care team member",
  ].join("\n");
}

/**
 * Parse digits 1–6 and light keywords (WhatsApp users often type words).
 * @returns {number | null}
 */
export function parseMainMenuChoice(raw) {
  const s0 = String(raw ?? "")
    .replace(/[\u200e\u200f]/g, "")
    .trim();
  if (!s0) return null;
  const lines = s0.split(/\r?\n/).map((l) => l.replace(/^\s*>\s?/, "").trim()).filter(Boolean);
  const last = lines.length ? lines[lines.length - 1] : s0;

  const only = last.match(/^([1-6])[\s.)]*$/);
  if (only) return Number(only[1]);

  const digit = last.match(/\b([1-6])\b/);
  if (digit) return Number(digit[1]);

  const t = last.toLowerCase();
  if (/schedul|appointment|visit|book/i.test(t)) return 4;
  if (/bill|pay|payment|mpesa|kes/i.test(t)) return 5;
  if (/human|person|staff|nurse|doctor|call|speak/i.test(t)) return 6;
  if (/pregn|ante|natal|mother|mum|mom/i.test(t)) return 1;
  if (/baby|infant|newborn/i.test(t)) return 2;
  if (/general|adult|patient/i.test(t)) return 3;

  return null;
}

/**
 * @param {string | undefined | null} facilityName
 */
export function staticReplyScheduling(facilityName) {
  const f = String(facilityName || "").trim();
  const line = f
    ? `Visit times and booking rules are set by ${f}. Please call or visit them directly for appointments.`
    : "Visit times and booking are managed by your registered health facility. Please contact them for appointments.";
  return [line, "", "Reply *hello* to return to the menu, or send *1*, *2*, or *3* to start a guided check when you are ready."].join(
    "\n"
  );
}

/**
 * @param {string | undefined | null} facilityName
 */
export function staticReplyPayments(facilityName) {
  const f = String(facilityName || "").trim();
  const line = f
    ? `Billing and payments are handled by ${f} (on-site or their approved channels). MamaSafe AI does not collect payments in this chat.`
    : "Billing and payments are handled directly by your health facility. MamaSafe AI does not collect payments in this chat.";
  return [line, "", "Reply *hello* to return to the menu."].join("\n");
}

/**
 * @param {string | undefined | null} facilityName
 */
export function staticReplyHumanHandoff(facilityName) {
  const f = String(facilityName || "").trim();
  const lines = [
    f
      ? `For clinical questions, contact ${f} during their opening hours. The front desk can connect you with the right clinician.`
      : "For clinical questions and follow-up, contact your health facility during their opening hours.",
    "",
    EMERGENCY_LINE,
    "",
    "Reply *hello* anytime to return to the menu.",
  ];
  return lines.join("\n");
}

export function hubMenuInvalidHint() {
  return "We did not catch that choice. Please send a number from 1 to 6, matching the menu below.\n\n";
}

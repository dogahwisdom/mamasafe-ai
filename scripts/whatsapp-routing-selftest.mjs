#!/usr/bin/env node
/**
 * Self-test for WhatsApp inbound routing (phone variants, interactive → text, non-text replies).
 * Run: node scripts/whatsapp-routing-selftest.mjs
 */
import assert from "node:assert/strict";
import { WhatsAppPhoneNormalizer } from "../netlify/functions/lib/whatsapp-phone-normalizer.js";
import { WhatsAppInboundContentExtractor } from "../netlify/functions/lib/whatsapp-inbound-content-extractor.js";
import { WhatsAppInboundOrchestrator } from "../netlify/functions/lib/whatsapp-inbound-orchestrator.js";
import { WhatsAppQuestionnaireService } from "../netlify/functions/lib/whatsapp-questionnaire-service.js";

// --- WhatsAppPhoneNormalizer ---
assert.equal(WhatsAppPhoneNormalizer.canonicalFromMetaFrom("254712345678"), "+254712345678");
assert.equal(WhatsAppPhoneNormalizer.canonicalFromMetaFrom(undefined), "");

const kenyaVariants = WhatsAppPhoneNormalizer.variantsForQueries("+254712345678");
assert.ok(kenyaVariants.includes("+254712345678"));
assert.ok(kenyaVariants.includes("0712345678"), `expected Kenyan local 0-variant, got: ${kenyaVariants.join(",")}`);

const ghVariants = WhatsAppPhoneNormalizer.variantsForQueries("+233241234567");
assert.ok(ghVariants.includes("+233241234567"));
assert.ok(
  ghVariants.some((x) => x.startsWith("0") && x.length > 9),
  `expected Ghana local 0-variant, got: ${ghVariants.join(",")}`
);

// --- WhatsAppInboundContentExtractor ---
const textMsg = {
  id: "m1",
  from: "233241234567",
  type: "text",
  text: { body: "hello" },
};
const extText = WhatsAppInboundContentExtractor.fromCloudMessage(textMsg);
assert.deepEqual(extText, { kind: "text", body: "hello", logSnippet: "hello" });

const buttonMsg = {
  id: "m2",
  from: "233241234567",
  type: "interactive",
  interactive: {
    type: "button_reply",
    button_reply: { id: "opt_yes", title: "Yes" },
  },
};
const extBtn = WhatsAppInboundContentExtractor.fromCloudMessage(buttonMsg);
assert.equal(extBtn.kind, "text");
assert.equal(extBtn.body, "Yes");

const unsupported = WhatsAppInboundContentExtractor.fromCloudMessage({
  id: "m3",
  from: "254712345678",
  type: "image",
});
assert.equal(unsupported.kind, "unsupported");

// --- Stateful mock: remembers active session rows like Supabase ---
class StatefulRecordingRepo {
  constructor(patientLookup = null) {
    this.session = null;
    this.inbounds = [];
    this.outbounds = [];
    this.upserts = [];
    this.seenInboundIds = new Set();
    this.patientLookup = patientLookup;
  }

  async hasInboundMessage(mid) {
    return mid ? this.seenInboundIds.has(mid) : false;
  }

  async findPatientByPhone() {
    return this.patientLookup;
  }

  async getActiveSessionByPhone() {
    return this.session?.status === "active" ? this.session : null;
  }

  async logInboundMessage(row) {
    if (row.metaMessageId) this.seenInboundIds.add(row.metaMessageId);
    this.inbounds.push(row);
    return { ok: true };
  }

  async logOutboundMessage(row) {
    this.outbounds.push(row);
    return { ok: true };
  }

  async upsertSession(patch) {
    this.upserts.push(patch);
    if ((patch.status || "active") === "active") {
      this.session = {
        phone: patch.phone,
        status: "active",
        flow_type: patch.flowType || "intake",
        patient_id: patch.patientId || null,
        step_key: patch.stepKey || "choose_profile",
        step_index: patch.stepIndex ?? 0,
        answers: patch.answers || [],
      };
    } else {
      this.session = null;
    }
    return { ok: true };
  }

  async setPatientCheckupOptOut() {
    return { ok: true };
  }

  async createReferral() {
    return { ok: true };
  }

  async createTask() {
    return { ok: true };
  }
}

class MockCloud {
  isConfigured() {
    return true;
  }

  async sendTextMessage({ body }) {
    return { metaMessageId: `mock-${body.slice(0, 8)}`, raw: {} };
  }
}

const questionnaire = new WhatsAppQuestionnaireService();
const cloud = new MockCloud();

// Unregistered user: hello → welcome; then "1" → pregnancy flow question
{
  const repo = new StatefulRecordingRepo(null);
  const orch = new WhatsAppInboundOrchestrator({ repo, cloud, questionnaire });
  await orch.handleInboundMessage({ ...textMsg, id: "u1", text: { body: "hello" } });
  assert.ok(repo.outbounds.some((r) => r.body.includes("MamaSafe AI")), "welcome");
  await orch.handleInboundMessage({
    id: "u2",
    from: "233241234567",
    type: "text",
    text: { body: "1" },
  });
  assert.ok(
    repo.outbounds.some((r) =>
      /\bsevere headache\b/i.test(String(r.body)) || /severe headache/i.test(String(r.body))
    ),
    "after option 1, expect pregnancy triage wording"
  );
}

// Registered patient, no session row yet (e.g. only saw a template / outbound): "1" must not repeat the intro
{
  const patient = {
    id: "p-no-session",
    name: "Edward",
    phone: "+233241234567",
    gestational_weeks: 12,
    alerts: [],
  };
  const repo = new StatefulRecordingRepo(patient);
  repo.session = null;
  const orch = new WhatsAppInboundOrchestrator({ repo, cloud, questionnaire });
  await orch.handleInboundMessage({
    id: "ns1",
    from: "233241234567",
    type: "text",
    text: { body: "1" },
  });
  assert.ok(
    /severe headache|blurred vision|bleeding|fever/i.test(repo.outbounds.at(-1).body),
    "first inbound 1 without session should go to pregnancy Q1, not repeat intake intro"
  );
  assert.ok(!repo.outbounds.at(-1).body.includes("Who is this check"), "should not loop intake prompt");
}

// "Choose 1" without session routes to questionnaire (not generic triage stub)
{
  const patient = {
    id: "p-choose",
    name: "Edward",
    phone: "+254712000003",
    gestational_weeks: 10,
    alerts: [],
  };
  const repo = new StatefulRecordingRepo(patient);
  repo.session = null;
  const orch = new WhatsAppInboundOrchestrator({ repo, cloud, questionnaire });
  await orch.handleInboundMessage({
    id: "ch1",
    from: "254712000003",
    type: "text",
    text: { body: "Choose 1" },
  });
  assert.ok(
    /severe headache|blurred vision/i.test(repo.outbounds.at(-1).body),
    "Choose 1 should parse as intake option 1"
  );
}

// Registered patient: hi → intake; "1" → pregnancy Q1; tap "No" (interactive) counts as answering that question
{
  const patient = {
    id: "p-demo",
    name: "Grace",
    phone: "+233241234567",
    gestational_weeks: 18,
    alerts: [],
  };
  const repo = new StatefulRecordingRepo(patient);
  const orch = new WhatsAppInboundOrchestrator({ repo, cloud, questionnaire });
  await orch.handleInboundMessage({ id: "r1", from: "233241234567", type: "text", text: { body: "hi" } });
  assert.ok(repo.outbounds.at(-1).body.includes("Who is this check"));
  await orch.handleInboundMessage({ id: "r2", from: "233241234567", type: "text", text: { body: "1" } });
  assert.ok(/severe headache|blurred vision|bleeding|fever/i.test(repo.outbounds.at(-1).body));

  repo.inbounds.length = 0;
  repo.outbounds.length = 0;
  await orch.handleInboundMessage({
    id: "r3btn",
    from: "233241234567",
    type: "interactive",
    interactive: {
      type: "button_reply",
      button_reply: { id: "n", title: "No" },
    },
  });
  assert.equal(repo.inbounds[0]?.body, "No");
  assert.ok(
    repo.outbounds.at(-1).body.includes("antenatal") ||
      repo.outbounds.at(-1).body.includes("check-up"),
    `expected next pregnancy question text, got: ${repo.outbounds.at(-1).body.slice(0, 80)}`
  );
}

// Non-text inbound gets guidance
{
  const repo = new StatefulRecordingRepo(null);
  const orch = new WhatsAppInboundOrchestrator({ repo, cloud, questionnaire });
  await orch.handleInboundMessage({
    id: "v1",
    from: "233241234567",
    type: "image",
  });
  assert.equal(repo.inbounds[0]?.messageType, "system");
  assert.ok(repo.outbounds[0]?.body.includes("typed text"));
}

console.log("whatsapp-routing-selftest: OK");

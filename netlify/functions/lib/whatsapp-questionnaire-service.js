const RISK = {
  LOW: "Low",
  HIGH: "High",
  CRITICAL: "Critical",
};

const DANGER_KEYWORDS = [
  "bleeding",
  "convulsion",
  "faint",
  "blurred vision",
  "severe headache",
  "not breathing",
  "difficulty breathing",
  "fever",
  "vomit",
  "vomiting",
  "reduced movement",
];

const FLOW_QUESTION_BANK = {
  pregnancy: [
    {
      key: "preg_danger_signs",
      text: "Are you having severe headache, blurred vision, bleeding, or fever?",
      options: ["Yes", "No"],
      criticalOn: [1],
    },
    {
      key: "preg_appointment",
      text: "Have you missed your recent antenatal check-up?",
      options: ["Yes", "No"],
      riskOn: [1],
    },
    {
      key: "preg_diabetes",
      text: "Hello Mum, have you tested for diabetes in this pregnancy?",
      options: ["Yes", "No"],
      riskOn: [2],
    },
  ],
  baby: [
    {
      key: "baby_feeding",
      text: "Is your baby feeding every 2-3 hours?",
      options: ["Yes", "No"],
      criticalOn: [2],
    },
    {
      key: "baby_fever",
      text: "Does your baby have fever, difficulty breathing, or convulsions?",
      options: ["Yes", "No"],
      criticalOn: [1],
    },
    {
      key: "baby_diarrhea",
      text: "Has your baby had diarrhea or vomiting since morning?",
      options: ["Yes", "No"],
      riskOn: [1],
    },
  ],
  general: [
    {
      key: "gen_danger",
      text: "Do you have severe pain, bleeding, breathing difficulty, or very high fever?",
      options: ["Yes", "No"],
      criticalOn: [1],
    },
    {
      key: "gen_chronic",
      text: "Do you have diabetes, hypertension, or another chronic condition?",
      options: ["Yes", "No"],
      riskOn: [1],
    },
    {
      key: "gen_duration",
      text: "Have these symptoms lasted for more than 48 hours?",
      options: ["Yes", "No"],
      riskOn: [1],
    },
  ],
};

/**
 * Handles reply-in-thread and quoted lines: users often put "1" on the last line after a quote block.
 */
function sanitizeQuestionnaireInput(raw) {
  const s0 = String(raw ?? "")
    .replace(/[\u200e\u200f]/g, "")
    .trim();
  if (!s0) return "";
  const lines = s0.split(/\r?\n/).map((l) => l.replace(/^\s*>\s?/, "").trim());
  const nonempty = lines.filter(Boolean);
  if (nonempty.length === 0) return "";
  const last = nonempty[nonempty.length - 1];
  if (nonempty.length >= 2) {
    if (/^[1-3]([\s.\)]|$)/.test(last)) return last;
    if (/^(yes|no)\b/i.test(last) || /^[yn]\b/i.test(last)) return last;
  }
  return nonempty.join(" ");
}

function normalizeText(text) {
  return String(text || "").trim().toLowerCase();
}

/** Intake "who is this check for" — 1 / 2 / 3 and common natural-language patterns. */
function parseIntakeChoice(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  const onlyDigit = s.match(/^([1-3])[\s.)]*$/);
  if (onlyDigit) return Number(onlyDigit[1]);
  const bracket = s.match(/\b([1-3])\b/);
  if (bracket) return Number(bracket[1]);
  if (/(^|\s)(option|choose|select|pick)\s*[:\-]?\s*([1-3])\b/i.test(s)) {
    const m = s.match(/\b([1-3])\b/);
    if (m) return Number(m[1]);
  }
  if (lower.includes("pregnant") || lower.includes("mother") || lower.includes("mum")) return 1;
  if (lower.includes("baby") || lower.includes("newborn") || lower.includes("infant")) return 2;
  if (lower.includes("general") || /\bgeneral\s+patient\b/i.test(s) || /^patient$/i.test(s.trim()) || lower.includes("adult"))
    return 3;
  return null;
}

/** Yes/No questionnaire steps — 1 / 2, words, or a digit embedded in a short reply. */
function parseBinaryChoice(text) {
  const s = String(text || "").trim();
  const t = normalizeText(s);
  if (t === "1" || t === "2") return Number(t);
  const d = s.match(/\b([12])\b/);
  if (d) return Number(d[1]);
  if (/^(yes|y|true)\b/.test(t)) return 1;
  if (/^(no|n|false)\b/.test(t)) return 2;
  return null;
}

function renderQuestion(prompt, options) {
  const lines = [`${prompt}`];
  options.forEach((option, idx) => lines.push(`${idx + 1}. ${option}`));
  return lines.join("\n");
}

function guidanceSuffix() {
  return "\n\nReply with 1 or 2, or send 'restart' to start over, or 'end' to stop.";
}

export class WhatsAppQuestionnaireService {
  constructor() {
    this.startKeywords = new Set(["start", "hello", "hi", "hey", "menu", "checkup"]);
    this.restartKeywords = new Set(["restart", "reset", "start over"]);
    this.endKeywords = new Set(["end", "stop", "cancel", "quit"]);
  }

  shouldStartFlow(messageText, existingSession) {
    if (existingSession?.status === "active") return true;
    const sanitized = sanitizeQuestionnaireInput(messageText);
    const normalized = normalizeText(sanitized);
    if (!normalized) return true;
    if (this.startKeywords.has(normalized)) return true;
    if (/^[1-3]$/.test(normalized)) return true;
    if (parseIntakeChoice(sanitized)) return true;
    if (
      normalized.includes("pregnant") ||
      normalized.includes("baby") ||
      /\bgeneral\b/.test(normalized) ||
      /\bgeneral\s+patient\b/.test(normalized)
    ) {
      return true;
    }
    return false;
  }

  startMessage(patientName = "Mum/Patient") {
    return [
      `Hello ${patientName}, we have 3 quick questions to support your care.`,
      "Your answers are private and will only be used by MamaSafe AI and your registered health facility.",
      "",
      renderQuestion("Who is this check for today?", [
        "Pregnant mother",
        "Baby (0-12 months)",
        "General patient",
      ]),
    ].join("\n");
  }

  buildStartSession(flowOwnerPatientId) {
    const id = flowOwnerPatientId || null;
    return {
      phone: null,
      patientId: id,
      patient_id: id,
      flowType: "intake",
      flow_type: "intake",
      stepKey: "choose_profile",
      step_key: "choose_profile",
      stepIndex: 0,
      step_index: 0,
      answers: [],
      status: "active",
    };
  }

  /** @private */
  ownerPatientId(session) {
    return session?.patient_id ?? session?.patientId ?? null;
  }

  /** First question after user picks 1/2/3 on intake (works even when there was no DB session yet). */
  transitionIntakeToBranch(option, priorSession) {
    const flowTypeName = option === 1 ? "pregnancy" : option === 2 ? "baby" : "general";
    const first = FLOW_QUESTION_BANK[flowTypeName][0];
    const ownerId = this.ownerPatientId(priorSession);
    return {
      kind: "question",
      responseText: renderQuestion(first.text, first.options),
      nextSession: {
        patient_id: ownerId,
        patientId: ownerId,
        flow_type: flowTypeName,
        flowType: flowTypeName,
        step_key: first.key,
        stepKey: first.key,
        step_index: 0,
        stepIndex: 0,
        answers: [],
        status: "active",
        completed_at: null,
        completedAt: null,
      },
    };
  }

  handleMessage({ messageText, session, patientName }) {
    const sanitized = sanitizeQuestionnaireInput(messageText);
    const normalizedMessage = normalizeText(sanitized);

    if (session?.status === "active" && this.startKeywords.has(normalizedMessage)) {
      const resume = this.resumePromptForActiveSession(session, patientName);
      return {
        kind: "resume",
        responseText: resume,
        nextSession: session,
      };
    }

    if (this.restartKeywords.has(normalizedMessage)) {
      return {
        kind: "restart",
        responseText: this.startMessage(patientName),
        nextSession: this.buildStartSession(this.ownerPatientId(session)),
      };
    }
    if (this.endKeywords.has(normalizedMessage)) {
      return {
        kind: "end",
        responseText:
          "Your health check session has been ended. Send 'hello' anytime when you want to continue.",
        nextSession: {
          ...(session || this.buildStartSession(this.ownerPatientId(session))),
          status: "cancelled",
          completed_at: new Date().toISOString(),
        },
      };
    }

    const option = this.resolveOption(sanitized, session);
    const inactive = !session || session.status !== "active";

    if (inactive) {
      const intakePick = parseIntakeChoice(sanitized);
      if (intakePick >= 1 && intakePick <= 3) {
        return this.transitionIntakeToBranch(intakePick, session);
      }
      return {
        kind: "start",
        responseText: this.startMessage(patientName),
        nextSession: this.buildStartSession(this.ownerPatientId(session)),
      };
    }

    if (session.flow_type === "intake") {
      if (!option) {
        return {
          kind: "invalid",
          responseText:
            "Please choose one option by sending 1, 2, or 3.\n\nYou can also type words like 'pregnant mother', 'baby', or 'general patient'.",
          nextSession: session,
        };
      }

      return this.transitionIntakeToBranch(option, session);
    }

    const questions = FLOW_QUESTION_BANK[session.flow_type] || [];
    const current = questions[session.step_index];
    if (!current) {
      return {
        kind: "complete",
        responseText:
          "Thank you for your responses. MamaSafe AI will use your answers to support the best care.",
        nextSession: { ...session, status: "completed", completed_at: new Date().toISOString() },
        triageResult: {
          riskLevel: RISK.LOW,
          reasoning: "Questionnaire completed.",
          recommendedAction: "Continue routine care.",
        },
      };
    }

    if (!option || option > current.options.length) {
      return {
        kind: "invalid",
        responseText: `Please answer this question by sending 1 or 2.\n\n${renderQuestion(
          current.text,
          current.options
        )}`,
        nextSession: session,
      };
    }

    const answers = [...(session.answers || []), { key: current.key, value: option }];
    const nextIndex = session.step_index + 1;
    if (nextIndex < questions.length) {
      const next = questions[nextIndex];
      return {
        kind: "question",
        responseText: renderQuestion(next.text, next.options),
        nextSession: {
          ...session,
          answers,
          step_index: nextIndex,
          step_key: next.key,
        },
      };
    }

    const triageResult = this.scoreRisk(session.flow_type, answers);
    return {
      kind: "complete",
      responseText: this.completionText(triageResult.riskLevel),
      nextSession: {
        ...session,
        answers,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      triageResult,
    };
  }

  resumePromptForActiveSession(session, patientName) {
    if (!session || session.status !== "active") {
      return this.startMessage(patientName);
    }
    if (session.flow_type === "intake") {
      return `${this.startMessage(patientName)}\n\nReply with 1, 2, or 3, or send 'end' to stop.`;
    }
    const questions = FLOW_QUESTION_BANK[session.flow_type] || [];
    const current = questions[session.step_index];
    if (!current) {
      return "Your session is almost complete. Send 'restart' to begin again or 'end' to close this session.";
    }
    return `${renderQuestion(current.text, current.options)}${guidanceSuffix()}`;
  }

  buildRuleBasedSymptomResponse(messageText) {
    const normalized = normalizeText(sanitizeQuestionnaireInput(messageText));
    const hits = DANGER_KEYWORDS.filter((term) => normalized.includes(term));
    if (hits.length >= 2) {
      return {
        riskLevel: RISK.CRITICAL,
        reasoning: `Danger-sign keywords detected: ${hits.join(", ")}.`,
        recommendedAction: "Immediate hospital review and clinician follow-up.",
        draftResponse:
          "I am concerned about your symptoms. Please go to the nearest hospital immediately. Our care team has been alerted to follow up.",
      };
    }
    if (hits.length === 1) {
      return {
        riskLevel: RISK.HIGH,
        reasoning: `Potential risk symptom detected: ${hits[0]}.`,
        recommendedAction: "Urgent clinician review recommended.",
        draftResponse:
          "Thank you for sharing. Your symptom needs urgent review. Please visit the nearest health facility today, and our team will follow up.",
      };
    }
    return {
      riskLevel: RISK.LOW,
      reasoning: "No immediate danger keywords found in free-text input.",
      recommendedAction: "Continue monitoring and complete guided questionnaire.",
      draftResponse:
        "Thank you. To support safe care, please type 'hello' to begin our 3-question health check.",
    };
  }

  completionText(riskLevel) {
    if (riskLevel === RISK.CRITICAL || riskLevel === RISK.HIGH) {
      return "Thank you for your responses. We identified urgent risk signs and have flagged your case for the doctor. Please go to the nearest hospital immediately while our team follows up.";
    }
    return "Thank you for your responses. MamaSafe AI and your health facility will use your answers to provide the best care. We will not share your personal information without your permission.";
  }

  scoreRisk(flowType, answers) {
    const questions = FLOW_QUESTION_BANK[flowType] || [];
    let riskHits = 0;
    let criticalHit = false;

    for (const answer of answers) {
      const question = questions.find((q) => q.key === answer.key);
      if (!question) continue;
      if ((question.criticalOn || []).includes(answer.value)) criticalHit = true;
      if ((question.riskOn || []).includes(answer.value)) riskHits += 1;
    }

    const riskLevel = criticalHit ? RISK.CRITICAL : riskHits >= 2 ? RISK.HIGH : riskHits === 1 ? RISK.HIGH : RISK.LOW;
    const reasoning = `Questionnaire flow "${flowType}" completed with ${answers.length} answers; critical=${criticalHit}, riskHits=${riskHits}.`;
    const recommendedAction =
      riskLevel === RISK.LOW
        ? "Continue routine follow-up and monitor symptoms."
        : "Escalate to clinician review immediately.";

    return { riskLevel, reasoning, recommendedAction };
  }

  resolveOption(sanitizedText, session) {
    const text = String(sanitizedText || "").trim();
    const flow = session?.flow_type ?? session?.flowType;
    const isIntake = !session || flow === "intake";

    if (isIntake) {
      return parseIntakeChoice(text);
    }

    const binary = parseBinaryChoice(text);
    if (binary !== null) return binary;

    const normalized = normalizeText(text);
    if (["yes", "y", "true"].includes(normalized)) return 1;
    if (["no", "n", "false"].includes(normalized)) return 2;
    return null;
  }
}

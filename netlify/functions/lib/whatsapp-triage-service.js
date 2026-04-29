const RiskLevel = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

function normalizeRiskLevel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critical") return RiskLevel.CRITICAL;
  if (normalized === "high") return RiskLevel.HIGH;
  if (normalized === "medium") return RiskLevel.MEDIUM;
  if (normalized === "low") return RiskLevel.LOW;
  return RiskLevel.MEDIUM;
}

export class WhatsAppTriageService {
  constructor() {
    // Primary key for Groq; TRIAGE_ENGINE_API_KEY kept as fallback for compatibility.
    const apiKey = process.env.GROQ_API_KEY || process.env.TRIAGE_ENGINE_API_KEY || "";
    this.apiKey = apiKey;
  }

  async analyzeSymptoms({ symptoms, gestationalAge, previousConditions = "None" }) {
    if (!this.apiKey) {
      return {
        riskLevel: RiskLevel.MEDIUM,
        reasoning:
          "Triage AI key is not configured, so an automated maternal-risk assessment could not be completed.",
        recommendedAction: "Ask the patient to contact the clinic directly for manual review.",
        draftResponse:
          "Hello. MamaSafe received your message, but the automated assessment is temporarily unavailable. Please contact your clinic directly or visit the facility if your symptoms are worsening.",
      };
    }

    const prompt = `
Act as a maternal-health triage clinician for Kenya.

PATIENT
- Gestational age: ${gestationalAge} weeks
- Previous conditions: ${previousConditions}
- Incoming WhatsApp message: "${symptoms}"

GUIDANCE
1. CRITICAL/HIGH danger signs: bleeding, convulsions, severe headache with blurred vision, fever, severe abdominal pain, reduced fetal movement, preterm labour concern, breathing difficulty.
2. Give a concise explanation and safe next step.
3. Draft response should be plain, empathetic WhatsApp text suitable for a patient.
4. If danger signs exist, direct immediate facility/hospital review.

Return strict JSON only with keys:
{
  "riskLevel": "Low|Medium|High|Critical",
  "reasoning": "string",
  "recommendedAction": "string",
  "draftResponse": "string"
}
`;

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are a careful maternal health triage assistant. Always return valid JSON.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        }
      );
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Triage API failed (${response.status}): ${body}`);
      }
      const payload = await response.json();
      const text = payload?.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("No triage model response.");
      const parsed = JSON.parse(text);
      return {
        riskLevel: normalizeRiskLevel(parsed?.riskLevel),
        reasoning: parsed?.reasoning || "No reasoning provided.",
        recommendedAction: parsed?.recommendedAction || "Clinician review recommended.",
        draftResponse:
          parsed?.draftResponse ||
          "MamaSafe received your message. Please contact your clinic if your symptoms worsen.",
      };
    } catch (error) {
      console.error("WhatsApp triage failed:", error);
      return {
        riskLevel: RiskLevel.HIGH,
        reasoning:
          "Automated triage failed during processing; defaulted high for patient safety until a clinician reviews.",
        recommendedAction: "Manual clinician review as soon as possible.",
        draftResponse:
          "MamaSafe received your message but could not complete the automated assessment. Please contact your clinic or come in for a check-up as soon as possible, especially if you have pain, bleeding, fever, or reduced baby movements.",
      };
    }
  }
}

export { RiskLevel };

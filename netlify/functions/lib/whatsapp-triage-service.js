const RiskLevel = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export class WhatsAppTriageService {
  constructor() {
    const apiKey = process.env.TRIAGE_ENGINE_API_KEY || "";
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

Return JSON only.
`;

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Triage API failed (${response.status}): ${body}`);
      }
      const payload = await response.json();
      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("No triage model response.");
      const parsed = JSON.parse(text);
      return {
        riskLevel: parsed?.riskLevel || RiskLevel.MEDIUM,
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

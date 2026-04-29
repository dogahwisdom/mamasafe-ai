import { GoogleGenAI, Type } from "@google/genai";

const RiskLevel = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const triageSchema = {
  type: Type.OBJECT,
  properties: {
    riskLevel: {
      type: Type.STRING,
      enum: Object.values(RiskLevel),
    },
    reasoning: { type: Type.STRING },
    recommendedAction: { type: Type.STRING },
    draftResponse: { type: Type.STRING },
  },
  required: ["riskLevel", "reasoning", "recommendedAction", "draftResponse"],
};

export class WhatsAppTriageService {
  constructor() {
    const apiKey = process.env.TRIAGE_ENGINE_API_KEY || "";
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async analyzeSymptoms({ symptoms, gestationalAge, previousConditions = "None" }) {
    if (!this.client) {
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
      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: triageSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No triage model response.");
      return JSON.parse(text);
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

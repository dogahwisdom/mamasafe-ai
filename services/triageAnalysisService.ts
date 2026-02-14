import { GoogleGenAI as TriageEngineClient, Type } from "@google/genai";
import { TriageResult, RiskLevel } from "../types";

class TriageAnalysisService {
  private client: TriageEngineClient | null;

  private triageSchema = {
    type: Type.OBJECT,
    properties: {
      riskLevel: {
        type: Type.STRING,
        enum: [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL],
        description:
          "The assessed risk level based on symptoms. CRITICAL for immediate life threats.",
      },
      reasoning: {
        type: Type.STRING,
        description:
          "Detailed clinical reasoning citing WHO guidelines and specific symptoms.",
      },
      recommendedAction: {
        type: Type.STRING,
        description:
          "Actionable advice for the provider (e.g., 'Immediate referral to Level 4 facility', 'Prescribe paracetamol').",
      },
      draftResponse: {
        type: Type.STRING,
        description:
          "A warm, empathetic WhatsApp message for the patient in plain English. Use WhatsApp formatting (single * for bold).",
      },
    },
    required: ["riskLevel", "reasoning", "recommendedAction", "draftResponse"],
  };

  constructor() {
    const apiKey = process.env.TRIAGE_ENGINE_API_KEY;
    this.client = apiKey ? new TriageEngineClient({ apiKey }) : null;
  }

  public async analyzeSymptoms(
    symptoms: string,
    gestationalAge: number,
    prevConditions: string = "None"
  ): Promise<TriageResult> {
    if (!this.client) {
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              riskLevel: RiskLevel.MEDIUM,
              reasoning:
                "Demo Mode: Secure triage engine key missing. Simulating analysis. Please add your triage engine key to environment variables.",
              recommendedAction: "Check system configuration.",
              draftResponse:
                "Hello mama! *Please note:* This is a simulated response because the automated assessment system is offline. Ideally, I would advise you based on your symptoms. Please visit the clinic if you are unwell.",
            }),
          1000
        )
      );
    }

    try {
      const prompt = `
      Act as MamaSafe's Chief Medical Officer for rural and peri-urban Kenya.

      PATIENT PROFILE:
      - Gestational Age: ${gestationalAge} weeks
      - Medical History: ${prevConditions}
      - Reported Symptoms: "${symptoms}"

      CLINICAL GUIDELINES (WHO & Kenya Ministry of Health):
      1. **Danger Signs (Immediate Referral):** Vaginal bleeding, convulsions, severe headache with blurred vision (Pre-eclampsia), fever >38°C, severe abdominal pain, reduced fetal movement, water breaking before 37 weeks.
      2. **Risk Stratification:**
         - **CRITICAL:** Immediate life threat. Refer to Level 4/5 Hospital instantly.
         - **HIGH:** Potential complication (e.g., hypertensive disorders). Urgent assessment required.
         - **MEDIUM:** Non-urgent but requires medical attention (e.g., UTI symptoms, mild anemia).
         - **LOW:** Normal physiological changes or minor ailments manageable at home.
      3. **Draft Response Tone & Format:** 
         - Empathetic, sisterly ("Mama"), clear, and reassuring. 
         - Avoid medical jargon. 
         - Use Swahili/Sheng terms of endearment where appropriate (e.g., "Pole sana", "Sawa").
         - **CRITICAL:** Use WhatsApp formatting. Use single asterisks (*) for bold text (e.g., *Go to the hospital*). Do NOT use double asterisks (**).
         - Include relevant emojis.

      TASK:
      Analyze the symptoms deeply. Consider the gestational age risks (e.g., preterm labor vs Braxton Hicks).
      Return a JSON response with the assessment.
    `;

      const response = await this.client.models.generateContent({
        model: "triage-engine-fast",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: this.triageSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from triage engine");

      return JSON.parse(text) as TriageResult;
    } catch (error) {
      console.error("Triage Analysis Error:", error);

      return {
        riskLevel: RiskLevel.HIGH,
        reasoning:
          "The automated assessment service encountered an interruption. Defaulting to High Risk for patient safety.",
        recommendedAction: "Conduct manual triage immediately.",
        draftResponse:
          "Pole sana mama. We are having technical trouble. Please come to the clinic immediately for a check-up. *Safety first!*",
      };
    }
  }
}

export const triageAnalysisService = new TriageAnalysisService();

export const analyzeSymptoms = (
  symptoms: string,
  gestationalAge: number,
  prevConditions?: string
) => triageAnalysisService.analyzeSymptoms(symptoms, gestationalAge, prevConditions);


/** Question banks for pregnancy / baby / general WhatsApp triage steps. */
export const FLOW_QUESTION_BANK = {
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

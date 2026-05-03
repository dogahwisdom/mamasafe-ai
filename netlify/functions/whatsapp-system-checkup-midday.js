import { runWhatsAppSystemCheckup } from "./lib/whatsapp-system-checkup-runner.js";

export const config = {
  schedule: "0 12 * * *",
};

export async function handler(event) {
  return runWhatsAppSystemCheckup(event);
}

import { runWhatsAppSystemCheckup } from "./lib/whatsapp-system-checkup-runner.js";

export const config = {
  schedule: "0 17 * * *",
};

export async function handler(event) {
  return runWhatsAppSystemCheckup(event);
}

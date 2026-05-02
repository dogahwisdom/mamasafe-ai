/**
 * Alias endpoint for Meta "Callback URL": /.netlify/functions/whatsapp
 * (Primary implementation lives in whatsapp-webhook.js.)
 */
export { handler } from "./whatsapp-webhook.js";

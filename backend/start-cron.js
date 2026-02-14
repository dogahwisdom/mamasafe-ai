/**
 * Continuous Cron Runner
 * 
 * Runs reminder sender every 15 minutes
 * Use this for Railway/Render deployments
 * 
 * This file is executed via tsx, which handles TypeScript compilation
 */

import { processPendingReminders } from './reminder-sender';

const INTERVAL_MINUTES = 15;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

console.log(`🚀 Reminder Sender Service Started`);
console.log(`⏰ Checking for reminders every ${INTERVAL_MINUTES} minutes`);
console.log(`📅 First check in ${INTERVAL_MINUTES} minutes...\n`);

// Run immediately on start
processPendingReminders().catch(console.error);

// Then run every 15 minutes
setInterval(() => {
  console.log(`\n⏰ [${new Date().toISOString()}] Running scheduled check...`);
  processPendingReminders().catch(console.error);
}, INTERVAL_MS);

// Keep process alive
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

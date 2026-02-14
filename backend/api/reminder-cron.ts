/**
 * Vercel Serverless Function for Reminder Cron Job
 * 
 * Deploy this to Vercel and configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/reminder-cron",
 *     "schedule": "*/15 * * * *"
 *   }]
 * }
 */

import { handler } from '../reminder-sender';

export default async function(req: any, res: any) {
  return handler(req, res);
}

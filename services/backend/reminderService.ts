import { Reminder, Patient, Medication } from "../../types";
import { KEYS, storage } from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";

const HOURS_24 = 24 * 60 * 60 * 1000;

function mapReminderRow(r: Record<string, any>): Reminder {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patient_name,
    phone: r.phone,
    channel: r.channel as 'whatsapp' | 'sms',
    type: r.type as 'appointment' | 'medication' | 'symptom_checkin',
    message: r.message,
    scheduledFor: r.scheduled_for,
    sent: r.sent,
    sentAt: r.sent_at || undefined,
  };
}

export class ReminderService {
  public async dispatchDueReminders(options?: {
    reminderIds?: string[];
    facilityScopeId?: string | null;
  }): Promise<{
    ok: boolean;
    scanned?: number;
    sent?: number;
    failed?: number;
    skipped?: number;
    reason?: string;
    error?: string;
  }> {
    try {
      const bodyPayload: Record<string, unknown> = {};
      const ids = options?.reminderIds?.filter((id) => typeof id === 'string' && id.length > 0).slice(0, 100);
      if (ids?.length) {
        bodyPayload.reminderIds = ids;
      }
      if (typeof options?.facilityScopeId === 'string' && options.facilityScopeId.trim()) {
        bodyPayload.facilityScopeId = options.facilityScopeId.trim();
      }

      const response = await fetch('/.netlify/functions/reminder-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(Object.keys(bodyPayload).length > 0 ? { body: JSON.stringify(bodyPayload) } : {}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          reason: payload?.reason || payload?.error || `http_${response.status}`,
          error: payload?.error,
          scanned: payload?.scanned,
          sent: payload?.sent,
          failed: payload?.failed,
          skipped: payload?.skipped,
        };
      }
      return {
        ok: !!payload?.ok,
        scanned: payload?.scanned,
        sent: payload?.sent,
        failed: payload?.failed,
        skipped: payload?.skipped,
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'dispatch_request_failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async getAll(): Promise<Reminder[]> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reminders:', error);
        return storage.get<Reminder[]>(KEYS.REMINDERS, []);
      }

      return (data || []).map((r: any) => mapReminderRow(r));
    }

    // Fallback to localStorage
    return storage.get<Reminder[]>(KEYS.REMINDERS, []);
  }

  /** Pending reminders (due, unsent), scoped by `patients.facility_id` when `facilityUserId` is set. */
  public async getPendingForFacility(facilityUserId: string | null): Promise<Reminder[]> {
    if (isSupabaseConfigured()) {
      const now = new Date().toISOString();
      if (!facilityUserId) {
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('sent', false)
          .lte('scheduled_for', now)
          .order('scheduled_for', { ascending: true })
          .limit(150);

        if (error) {
          console.error('Error fetching HQ pending reminders:', error);
          return [];
        }
        return (data || []).map((r: any) => mapReminderRow(r));
      }

      const { data: patientRows, error: pe } = await supabase
        .from('patients')
        .select('id')
        .eq('facility_id', facilityUserId);

      if (pe) {
        console.error('Error fetching facility patients for reminders:', pe);
        return [];
      }

      const pids = (patientRows || []).map((row: any) => row.id as string).filter(Boolean);
      if (!pids.length) {
        return [];
      }

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .in('patient_id', pids)
        .eq('sent', false)
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('Error fetching facility pending reminders:', error);
        return [];
      }

      return (data || []).map((r: any) => mapReminderRow(r));
    }

    const pending = await this.getPending();
    if (!facilityUserId) {
      return pending;
    }
    const patients = storage.get<Patient[]>(KEYS.PATIENTS, []);
    const allowed = new Set(
      patients.filter((p) => p.facilityId === facilityUserId).map((p) => p.id)
    );
    return pending.filter((r) => allowed.has(r.patientId));
  }

  /** Recently marked sent, for reassurance in the HQ UI. */
  public async getRecentlySentForFacility(
    facilityUserId: string | null,
    windowHoursBack = 72,
    limit = 50
  ): Promise<Reminder[]> {
    if (isSupabaseConfigured()) {
      const cutoffIso = new Date(Date.now() - windowHoursBack * 60 * 60 * 1000).toISOString();

      if (!facilityUserId) {
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('sent', true)
          .gte('sent_at', cutoffIso)
          .order('sent_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('Error fetching recently sent reminders:', error);
          return [];
        }

        return (data || []).map((r: any) => mapReminderRow(r));
      }

      const { data: patientRows, error: pe } = await supabase
        .from('patients')
        .select('id')
        .eq('facility_id', facilityUserId);

      if (pe || !(patientRows || []).length) {
        if (pe) console.error('Error fetching facility patients for sent reminders:', pe);
        return [];
      }

      const pids = (patientRows || []).map((row: any) => row.id as string).filter(Boolean);

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .in('patient_id', pids)
        .eq('sent', true)
        .gte('sent_at', cutoffIso)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching facility recently sent reminders:', error);
        return [];
      }

      return (data || []).map((r: any) => mapReminderRow(r));
    }

    const all = storage.get<Reminder[]>(KEYS.REMINDERS, []);
    const cutoff = Date.now() - windowHoursBack * 60 * 60 * 1000;
    const sent = all
      .filter((r) => r.sent && r.sentAt && new Date(r.sentAt).getTime() >= cutoff)
      .sort(
        (a, b) =>
          new Date(b.sentAt || 0).getTime() -
          new Date(a.sentAt || 0).getTime()
      )
      .slice(0, limit);

    if (!facilityUserId) {
      return sent;
    }

    const patients = storage.get<Patient[]>(KEYS.PATIENTS, []);
    const allowed = new Set(
      patients.filter((p) => p.facilityId === facilityUserId).map((p) => p.id)
    );
    return sent.filter((r) => allowed.has(r.patientId));
  }

  public async getPending(): Promise<Reminder[]> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('sent', false)
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('Error fetching pending reminders:', error);
        return [];
      }

      return (data || []).map((r: any) => mapReminderRow(r));
    }

    // Fallback to localStorage
    const reminders = storage.get<Reminder[]>(KEYS.REMINDERS, []);
    const now = Date.now();
    return reminders.filter(
      (r) => !r.sent && new Date(r.scheduledFor).getTime() <= now
    );
  }

  public async markSent(id: string): Promise<void> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('reminders')
        .update({
          sent: true,
          sent_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error marking reminder as sent:', error);
        throw error;
      }
      return;
    }

    // Fallback to localStorage
    const reminders = storage.get<Reminder[]>(KEYS.REMINDERS, []);
    const updated = reminders.map((r) =>
      r.id === id ? { ...r, sent: true, sentAt: new Date().toISOString() } : r
    );
    storage.set(KEYS.REMINDERS, updated);
  }

  public async generateDailyReminders(): Promise<Reminder[]> {
    // Get patients from Supabase or localStorage
    let patients: Patient[] = [];
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('patients')
        .select(`
          *,
          medications (*)
        `);
      if (data) {
        patients = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          age: p.age,
          gestationalWeeks: p.gestational_weeks,
          location: p.location,
          phone: p.phone,
          lastCheckIn: p.last_check_in || '',
          riskStatus: p.risk_status as any,
          nextAppointment: p.next_appointment || '',
          alerts: (p.alerts as any) || [],
          medications: (p.medications || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            time: m.time,
            instructions: m.instructions || '',
            type: m.type,
            adherenceRate: m.adherence_rate,
            taken: m.taken,
          })),
        }));
      }
    } else {
      patients = storage.get<Patient[]>(KEYS.PATIENTS, []);
    }

    const existing = await this.getAll();
    const now = new Date();
    const todayKey = now.toISOString().split("T")[0];

    const newReminders: Reminder[] = [];

    patients.forEach((p) => {
      const baseIdPrefix = `${todayKey}_${p.id}`;

      // Appointment reminders (if appointment within 24h)
      if (p.nextAppointment) {
        const apptTime = new Date(p.nextAppointment).getTime();
        if (apptTime - now.getTime() <= HOURS_24 && apptTime >= now.getTime()) {
          const id = `${baseIdPrefix}_appointment`;
          if (!existing.find((r) => r.id === id)) {
            newReminders.push({
              id,
              patientId: p.id,
              patientName: p.name,
              phone: p.phone,
              channel: "whatsapp",
              type: "appointment",
              message: `Habari ${p.name.split(" ")[0]}. Hii ni kumbukumbu yako ya miadi ya ANC kesho. Tafadhali fika kwa kliniki kama ilivyopangwa.`,
              scheduledFor: new Date(apptTime - 2 * 60 * 60 * 1000).toISOString(),
              sent: false,
            });
          }
        }
      }

      // Medication reminders for today - scheduled at medication time
      (p.medications || []).forEach((m: Medication) => {
        const id = `${baseIdPrefix}_med_${m.id}`;
        if (!existing.find((r) => r.id === id)) {
          // Parse medication time (e.g., "08:00 AM" or use type for default times)
          let scheduledTime = new Date();
          
          if (m.time) {
            // Parse time string (e.g., "08:00 AM", "2:00 PM")
            const timeMatch = m.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const period = timeMatch[3].toUpperCase();
              
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
              
              scheduledTime.setHours(hours, minutes, 0, 0);
            } else {
              // Fallback to type-based times
              if (m.type === 'morning') scheduledTime.setHours(8, 0, 0, 0);
              else if (m.type === 'afternoon') scheduledTime.setHours(14, 0, 0, 0);
              else if (m.type === 'evening') scheduledTime.setHours(19, 0, 0, 0);
              else scheduledTime.setHours(9, 0, 0, 0); // Default 9 AM
            }
          } else {
            // Use type for default times
            if (m.type === 'morning') scheduledTime.setHours(8, 0, 0, 0);
            else if (m.type === 'afternoon') scheduledTime.setHours(14, 0, 0, 0);
            else if (m.type === 'evening') scheduledTime.setHours(19, 0, 0, 0);
            else scheduledTime.setHours(9, 0, 0, 0); // Default 9 AM
          }

          // Only schedule if time hasn't passed today
          if (scheduledTime.getTime() > now.getTime()) {
            newReminders.push({
              id,
              patientId: p.id,
              patientName: p.name,
              phone: p.phone,
              channel: "whatsapp",
              type: "medication",
              message: `Habari ${p.name.split(" ")[0]}. Tafadhali kumbuka kuchukua ${m.name} (${m.dosage}) kama ilivyoelekezwa.`,
              scheduledFor: scheduledTime.toISOString(),
              sent: false,
            });
          }
        }
      });
    });

    // Save to Supabase or localStorage
    if (isSupabaseConfigured() && newReminders.length > 0) {
      const remindersToInsert = newReminders.map(r => ({
        patient_id: r.patientId,
        patient_name: r.patientName,
        phone: r.phone,
        channel: r.channel,
        type: r.type,
        message: r.message,
        scheduled_for: r.scheduledFor,
        sent: false,
      }));

      const { error } = await supabase
        .from('reminders')
        .insert(remindersToInsert);

      if (error) {
        console.error('Error creating reminders:', error);
      }
    } else {
      const merged = [...existing, ...newReminders];
      storage.set(KEYS.REMINDERS, merged);
    }

    return newReminders;
  }
}


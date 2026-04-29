import { OutreachMonitorSummary, OutreachPatientRow, UserProfile } from "../../types";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { normalizePhone } from "./shared";

const CHECKUP_SOURCE = "whatsapp-system-checkup";

interface OutreachMonitorData {
  summary: OutreachMonitorSummary;
  rows: OutreachPatientRow[];
}

type PatientDbRow = {
  id: string;
  name: string;
  phone: string;
  whatsapp_checkup_opt_out: boolean | null;
  whatsapp_checkup_opt_out_at: string | null;
};

type MessageDbRow = {
  patient_id: string | null;
  phone: string;
  direction: "inbound" | "outbound";
  created_at: string;
};

export class OutreachMonitorService {
  private assertPortalUser(user: UserProfile): void {
    if (user.role !== "clinic" && user.role !== "pharmacy") {
      throw new Error("Outreach monitor is available for clinic and pharmacy portals only.");
    }
  }

  public async getMonitorData(
    user: UserProfile,
    lookbackDays = 30
  ): Promise<OutreachMonitorData> {
    this.assertPortalUser(user);
    if (!isSupabaseConfigured()) {
      return {
        summary: {
          totalPatients: 0,
          sentCheckups: 0,
          optedOut: 0,
          repliedAfterOutreach: 0,
        },
        rows: [],
      };
    }

    const patients = await this.loadFacilityPatients(user.id);
    if (!patients.length) {
      return {
        summary: {
          totalPatients: 0,
          sentCheckups: 0,
          optedOut: 0,
          repliedAfterOutreach: 0,
        },
        rows: [],
      };
    }

    const sinceIso = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const patientIds = patients.map((p) => p.id);
    const [outreachRows, inboundRows] = await Promise.all([
      this.loadOutreachRows(patientIds, sinceIso),
      this.loadInboundRows(patientIds, sinceIso),
    ]);

    const byPatient = new Map<string, OutreachPatientRow>();
    for (const patient of patients) {
      byPatient.set(patient.id, {
        patientId: patient.id,
        patientName: patient.name,
        phone: patient.phone,
        checkupSentCount: 0,
        optedOut: Boolean(patient.whatsapp_checkup_opt_out),
        optedOutAt: patient.whatsapp_checkup_opt_out_at || undefined,
        repliedAfterOutreach: false,
      });
    }

    for (const row of outreachRows) {
      const matched = this.resolveRowPatient(row, patients);
      if (!matched) continue;
      const current = byPatient.get(matched.id);
      if (!current) continue;
      current.checkupSentCount += 1;
      if (!current.lastCheckupSentAt || row.created_at > current.lastCheckupSentAt) {
        current.lastCheckupSentAt = row.created_at;
      }
    }

    for (const row of inboundRows) {
      const matched = this.resolveRowPatient(row, patients);
      if (!matched) continue;
      const current = byPatient.get(matched.id);
      if (!current || !current.lastCheckupSentAt) continue;
      if (row.created_at > current.lastCheckupSentAt) {
        current.repliedAfterOutreach = true;
        if (!current.lastReplyAt || row.created_at > current.lastReplyAt) {
          current.lastReplyAt = row.created_at;
        }
      }
    }

    const rows = [...byPatient.values()].sort((a, b) => {
      const aKey = a.lastCheckupSentAt || "";
      const bKey = b.lastCheckupSentAt || "";
      return bKey.localeCompare(aKey);
    });

    return {
      summary: {
        totalPatients: rows.length,
        sentCheckups: rows.filter((r) => r.checkupSentCount > 0).length,
        optedOut: rows.filter((r) => r.optedOut).length,
        repliedAfterOutreach: rows.filter((r) => r.repliedAfterOutreach).length,
      },
      rows,
    };
  }

  private async loadFacilityPatients(facilityId: string): Promise<PatientDbRow[]> {
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, phone, whatsapp_checkup_opt_out, whatsapp_checkup_opt_out_at")
      .or(`facility_id.eq.${facilityId},primary_facility_id.eq.${facilityId}`);
    if (error) throw new Error(error.message);
    return (data || []) as PatientDbRow[];
  }

  private async loadOutreachRows(
    patientIds: string[],
    sinceIso: string
  ): Promise<MessageDbRow[]> {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("patient_id, phone, direction, created_at")
      .eq("direction", "outbound")
      .contains("raw_payload", { source: CHECKUP_SOURCE })
      .gte("created_at", sinceIso)
      .in("patient_id", patientIds);
    if (error) throw new Error(error.message);
    return (data || []) as MessageDbRow[];
  }

  private async loadInboundRows(
    patientIds: string[],
    sinceIso: string
  ): Promise<MessageDbRow[]> {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("patient_id, phone, direction, created_at")
      .eq("direction", "inbound")
      .gte("created_at", sinceIso)
      .in("patient_id", patientIds);
    if (error) throw new Error(error.message);
    return (data || []) as MessageDbRow[];
  }

  private resolveRowPatient(row: MessageDbRow, patients: PatientDbRow[]): PatientDbRow | null {
    if (row.patient_id) {
      const byId = patients.find((p) => p.id === row.patient_id);
      if (byId) return byId;
    }
    const phone = normalizePhone(row.phone);
    return patients.find((p) => normalizePhone(p.phone) === phone) || null;
  }
}

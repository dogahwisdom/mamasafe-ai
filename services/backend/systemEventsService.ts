import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type SystemEventRow = {
  id: string;
  createdAt: string;
  eventType: string;
  facilityId?: string | null;
  meta: Record<string, unknown>;
};

export class SystemEventsService {
  public async list(options?: {
    limit?: number;
    eventType?: string;
  }): Promise<SystemEventRow[]> {
    const limit = Math.min(200, Math.max(1, options?.limit ?? 50));
    const eventType = String(options?.eventType || "").trim();

    const headers: Record<string, string> = {};
    if (isSupabaseConfigured()) {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const qs = new URLSearchParams();
    qs.set("limit", String(limit));
    if (eventType) qs.set("eventType", eventType);

    const res = await fetch(`/.netlify/functions/system-events-list?${qs.toString()}`, {
      method: "GET",
      headers,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.error || payload?.reason || `http_${res.status}`);
    }

    const rows = (payload?.events || []) as any[];
    return rows.map((r) => ({
      id: String(r.id),
      createdAt: String(r.created_at),
      eventType: String(r.event_type),
      facilityId: r.facility_id ?? null,
      meta: (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>,
    }));
  }
}


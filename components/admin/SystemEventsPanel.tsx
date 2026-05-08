import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { backend } from "../../services/backend";
import { ClinicTimestampFormatter } from "../../services/formatClinicTimestamp";

type Props = {
  timeZone?: string;
};

const EVENT_TYPES = [
  "",
  "reminder_dispatch_run",
  "reminder_dispatch_error",
  "reminder_dispatch_unauthorized",
] as const;

export const SystemEventsPanel: React.FC<Props> = ({ timeZone }) => {
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>("");
  const [rows, setRows] = useState<
    Array<{
      id: string;
      createdAt: string;
      eventType: string;
      facilityId?: string | null;
      meta: Record<string, unknown>;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await backend.systemEvents.list({
        limit: 75,
        eventType: eventType || undefined,
      });
      setRows(data);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Failed to load system events.");
    } finally {
      setLoading(false);
    }
  }, [eventType]);

  useEffect(() => {
    void load();
  }, [load]);

  const compactRows = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      detail: (() => {
        const ok = r.meta?.ok;
        const sent = r.meta?.sent;
        const failed = r.meta?.failed;
        const skipped = r.meta?.skipped;
        const scanned = r.meta?.scanned;
        const reason = r.meta?.reason;
        const manual = r.meta?.manualSelect;
        const authKind = r.meta?.authKind;
        const parts = [
          typeof ok === "boolean" ? `ok=${ok}` : null,
          typeof scanned === "number" ? `scanned=${scanned}` : null,
          typeof sent === "number" ? `sent=${sent}` : null,
          typeof failed === "number" ? `failed=${failed}` : null,
          typeof skipped === "number" ? `skipped=${skipped}` : null,
          typeof manual === "boolean" ? `manual=${manual}` : null,
          typeof authKind === "string" ? `auth=${authKind}` : null,
          typeof reason === "string" && reason ? `reason=${reason}` : null,
        ].filter(Boolean);
        return parts.join(" · ");
      })(),
    }));
  }, [rows]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1c1e] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Job runs</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit trail for reminder dispatch runs (server-side).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-[#3a3a3c] disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Filter
        </label>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c2c2e] text-sm"
        >
          <option value="">All</option>
          <option value="reminder_dispatch_run">Dispatch runs</option>
          <option value="reminder_dispatch_error">Dispatch errors</option>
          <option value="reminder_dispatch_unauthorized">Unauthorized</option>
        </select>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <ShieldAlert size={16} className="mt-0.5" />
          <div className="text-sm font-semibold">{error}</div>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300">
            <tr>
              <th className="text-left font-semibold px-3 py-2">When</th>
              <th className="text-left font-semibold px-3 py-2">Event</th>
              <th className="text-left font-semibold px-3 py-2">Facility</th>
              <th className="text-left font-semibold px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {compactRows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {ClinicTimestampFormatter.formatDateTime(r.createdAt, { timeZone })}
                </td>
                <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                  {r.eventType}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 font-mono text-[12px]">
                  {r.facilityId || "—"}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                  {r.detail || "—"}
                </td>
              </tr>
            ))}
            {!loading && compactRows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
                  No events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};


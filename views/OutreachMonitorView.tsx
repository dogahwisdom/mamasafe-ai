import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Loader2,
  MessageSquareShare,
  ShieldAlert,
  UserCheck,
  UserRoundPlus,
  UserX,
} from "lucide-react";
import { backend } from "../services/backend";
import type { OutreachMonitorSummary, OutreachPatientRow, Task, UserProfile } from "../types";

interface OutreachMonitorViewProps {
  user: UserProfile;
  onBack: () => void;
}

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : "-");

const toCsvCell = (value: string | number | boolean | undefined) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ElementType;
  toneClass: string;
  hint?: React.ReactNode;
}> = ({ title, value, icon: Icon, toneClass, hint }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1c1e] p-5">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <div className={`p-2 rounded-lg ${toneClass}`}>
        <Icon size={16} />
      </div>
    </div>
    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-3">{value}</p>
    {hint ? (
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-snug">{hint}</p>
    ) : null}
  </div>
);

export const OutreachMonitorView: React.FC<OutreachMonitorViewProps> = ({ user, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [creatingTaskFor, setCreatingTaskFor] = useState<string | null>(null);
  const [rows, setRows] = useState<OutreachPatientRow[]>([]);
  const [summary, setSummary] = useState<OutreachMonitorSummary>({
    totalPatients: 0,
    sentCheckups: 0,
    optedOut: 0,
    repliedAfterOutreach: 0,
  });
  const [lookbackDays, setLookbackDays] = useState(30);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "replied" | "opted_out">(
    "all"
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await backend.outreachMonitor.getMonitorData(user, lookbackDays);
      setRows(data.rows);
      setSummary(data.summary);
    } catch (error) {
      console.error("Failed to load outreach monitor:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [lookbackDays, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "sent" && row.checkupSentCount < 1) return false;
      if (statusFilter === "replied" && !row.repliedAfterOutreach) return false;
      if (statusFilter === "opted_out" && !row.optedOut) return false;
      if (!q) return true;
      return (
        row.patientName.toLowerCase().includes(q) || row.phone.toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const exportCsv = () => {
    const header = [
      "Patient Name",
      "Phone",
      "Checkups Sent",
      "Last Checkup Sent",
      "Replied After Outreach",
      "Last Reply At",
      "Opted Out",
      "Opted Out At",
    ];
    const lines = filteredRows.map((row) =>
      [
        toCsvCell(row.patientName),
        toCsvCell(row.phone),
        toCsvCell(row.checkupSentCount),
        toCsvCell(row.lastCheckupSentAt || ""),
        toCsvCell(row.repliedAfterOutreach ? "Yes" : "No"),
        toCsvCell(row.lastReplyAt || ""),
        toCsvCell(row.optedOut ? "Yes" : "No"),
        toCsvCell(row.optedOutAt || ""),
      ].join(",")
    );
    const csv = `${header.join(",")}\n${lines.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outreach-monitor-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createFollowUpTask = async (row: OutreachPatientRow) => {
    setCreatingTaskFor(row.patientId);
    try {
      const task: Task = {
        id: `outreach_followup_${row.patientId}_${Date.now()}`,
        patientId: row.patientId,
        patientName: row.patientName,
        type: "Missed Visit",
        deadline: "Follow up within 24h",
        resolved: false,
        notes: `No reply after outreach checkup. Last sent: ${row.lastCheckupSentAt || "n/a"} · Phone: ${
          row.phone
        }`,
        timestamp: Date.now(),
      };
      await backend.clinic.addTask(task);
      alert(`Follow-up task created for ${row.patientName}.`);
    } catch (error) {
      console.error("Failed to create follow-up task:", error);
      alert("Could not create follow-up task.");
    } finally {
      setCreatingTaskFor(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Outreach Monitor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track checkup outreach delivery, opt-outs, and patient responses for {user.name}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Patients in scope"
          value={summary.totalPatients}
          icon={UserCheck}
          toneClass="bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
        />
        <StatCard
          title="Sent checkups"
          value={summary.sentCheckups}
          icon={MessageSquareShare}
          toneClass="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
          hint={
            <>
              Rows must exist in{' '}
              <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1 rounded">whatsapp_messages</code>{' '}
              (outbound, tagged by the check-up job). If Netlify sends succeed but this stays zero, anon RLS often
              blocks reads — apply migration{' '}
              <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1 rounded">
                20260504100000_whatsapp_messages_rls_select
              </code>
              . Otherwise check cron logs or Meta rejecting non-template sends.
            </>
          }
        />
        <StatCard
          title="Replied after outreach"
          value={summary.repliedAfterOutreach}
          icon={ShieldAlert}
          toneClass="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
        />
        <StatCard
          title="Opted out"
          value={summary.optedOut}
          icon={UserX}
          toneClass="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1c1e] p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Window
            </label>
            <select
              value={lookbackDays}
              onChange={(e) => setLookbackDays(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c2c2e] text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
            </select>
            <button
              type="button"
              onClick={() => void load()}
              className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-semibold"
            >
              Refresh
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient or phone"
              className="w-52 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#2c2c2e] text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c2c2e] text-sm"
            >
              <option value="all">All</option>
              <option value="sent">Sent checkups</option>
              <option value="replied">Replied</option>
              <option value="opted_out">Opted out</option>
            </select>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c2c2e] text-sm font-semibold"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1c1e] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-brand-600">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">
            No outreach rows found for this filter window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Patient</th>
                  <th className="text-left font-semibold px-4 py-3">Phone</th>
                  <th className="text-left font-semibold px-4 py-3">Checkups sent</th>
                  <th className="text-left font-semibold px-4 py-3">Last sent</th>
                  <th className="text-left font-semibold px-4 py-3">Reply status</th>
                  <th className="text-left font-semibold px-4 py-3">Opt-out</th>
                  <th className="text-left font-semibold px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const canCreateFollowUp =
                    row.checkupSentCount > 0 && !row.repliedAfterOutreach && !row.optedOut;
                  return (
                    <tr
                      key={row.patientId}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {row.patientName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.phone}</td>
                      <td className="px-4 py-3">{row.checkupSentCount}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatDate(row.lastCheckupSentAt)}
                      </td>
                      <td className="px-4 py-3">
                        {row.repliedAfterOutreach ? (
                          <span className="text-green-700 dark:text-green-300 font-semibold">
                            Replied ({formatDate(row.lastReplyAt)})
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">No reply yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.optedOut ? (
                          <span className="text-amber-700 dark:text-amber-300 font-semibold">
                            Yes ({formatDate(row.optedOutAt)})
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!canCreateFollowUp || creatingTaskFor === row.patientId}
                          onClick={() => void createFollowUpTask(row)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        >
                          {creatingTaskFor === row.patientId ? (
                            <Loader2 className="animate-spin" size={12} />
                          ) : (
                            <UserRoundPlus size={12} />
                          )}
                          Follow up
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Send, RefreshCw } from 'lucide-react';
import { backend } from '../../services/backend';
import type { Reminder } from '../../types';

type Props = {
  open: boolean;
  onClose: () => void;
  /** `null` = show all reminders (superadmin-style scope). Otherwise filter to this facility user id. */
  facilityScopeId: string | null;
  /** When true, show a control to run the unscoped batch (first 100 due system-wide). */
  showGlobalDispatch?: boolean;
  onAmbientMessage?: (message: string) => void;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const ReminderQueueModal: React.FC<Props> = ({
  open,
  onClose,
  facilityScopeId,
  showGlobalDispatch = false,
  onAmbientMessage,
}) => {
  const [tab, setTab] = useState<'due' | 'sent'>('due');
  const [loading, setLoading] = useState(false);
  const [dueRows, setDueRows] = useState<Reminder[]>([]);
  const [recentSent, setRecentSent] = useState<Reminder[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setStatusLine('');
    try {
      const [due, sent] = await Promise.all([
        backend.reminders.getPendingForFacility(facilityScopeId),
        backend.reminders.getRecentlySentForFacility(facilityScopeId, 72, 50),
      ]);
      setDueRows(due);
      setRecentSent(sent);
      setSelected(new Set());
    } catch (e) {
      setStatusLine(e instanceof Error ? e.message : 'Could not load reminder queue.');
    } finally {
      setLoading(false);
    }
  }, [facilityScopeId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllDue = () => {
    setSelected(new Set(dueRows.map((r) => r.id)));
  };

  const runDispatch = async (ids: string[], label: string) => {
    if (ids.length === 0 || busy) return;
    setBusy(true);
    setStatusLine(`${label}…`);
    try {
      const result = await backend.reminders.dispatchDueReminders({
        reminderIds: ids,
        facilityScopeId: facilityScopeId ?? undefined,
      });
      if (result.ok) {
        const msg = `Sent ${result.sent ?? 0}, failed ${result.failed ?? 0}, skipped ${result.skipped ?? 0}.`;
        setStatusLine(msg);
        onAmbientMessage?.(msg);
        await load();
      } else {
        const err = result.error || result.reason || 'Dispatch failed.';
        setStatusLine(err);
        onAmbientMessage?.(err);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Dispatch failed.';
      setStatusLine(msg);
      onAmbientMessage?.(msg);
    } finally {
      setBusy(false);
    }
  };

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-queue-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#1c1c1e]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 id="reminder-queue-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Reminder queue
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Due reminders listed here belong to your facility. Send WhatsApp reminders only to recipients who still
              show as unsent below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex shrink-0 gap-2 border-b border-slate-100 px-5 py-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTab('due')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'due'
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Due ({dueRows.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('sent')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'sent'
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Recently delivered
          </button>
          <div className="ml-auto flex items-center gap-2">
            {loading ? <span className="text-[11px] text-slate-400">Loading…</span> : null}
            <button
              type="button"
              disabled={loading || busy}
              onClick={() => void load()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Reload due and sent lists"
            >
              <RefreshCw size={12} aria-hidden />
              Refresh
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          {tab === 'due' && (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-[#1c1c1e]">
                <tr className="border-b border-slate-100 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="w-8 py-2 pr-2">&nbsp;</th>
                  <th className="py-2 pr-2 font-medium">Patient</th>
                  <th className="py-2 pr-2 font-medium">When</th>
                  <th className="py-2 pr-2 font-medium">Type</th>
                  <th className="py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-800 dark:text-slate-100">
                {dueRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 dark:border-slate-800/80">
                    <td className="py-2 pr-2 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        className="rounded border-slate-300 dark:border-slate-600"
                        aria-label={`Select ${row.patientName}`}
                      />
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <div className="font-semibold">{row.patientName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.phone}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {row.message}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-2 align-top text-slate-600 dark:text-slate-300">
                      {formatWhen(row.scheduledFor)}
                      <div className="text-[11px] text-slate-400">{row.channel}</div>
                    </td>
                    <td className="py-2 pr-2 align-top capitalize text-slate-600 dark:text-slate-300">{row.type}</td>
                    <td className="py-2 align-middle text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runDispatch([row.id], `Sending to ${row.patientName}`)}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        <Send size={12} aria-hidden /> Send
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'due' && dueRows.length === 0 && !loading && (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No due reminders right now for this clinic.
            </p>
          )}

          {tab === 'sent' && (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-[#1c1c1e]">
                <tr className="border-b border-slate-100 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-2 font-medium">Patient</th>
                  <th className="py-2 pr-2 font-medium">Sent</th>
                  <th className="py-2 pr-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="text-slate-800 dark:text-slate-100">
                {recentSent.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 dark:border-slate-800/80">
                    <td className="py-2 pr-2">
                      <div className="font-semibold">{row.patientName}</div>
                      <div className="text-[11px] text-slate-500">{row.phone}</div>
                    </td>
                    <td className="py-2 pr-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {row.sentAt ? formatWhen(row.sentAt) : '—'}
                    </td>
                    <td className="py-2 pr-2 capitalize">{row.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'sent' && recentSent.length === 0 && !loading && (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No reminders delivered in this window yet.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          {tab === 'due' && dueRows.length > 0 && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={selectAllDue}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={busy || selectedIds.length === 0}
                onClick={() => runDispatch(selectedIds, 'Sending selected')}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Send selected ({selectedIds.length})
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runDispatch(
                  dueRows.map((r) => r.id).slice(0, 100),
                  'Sending all listed due reminders',
                )}
                className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                Send all due listed
              </button>
            </>
          )}
          {showGlobalDispatch && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setStatusLine('System batch…');
                try {
                  const result = await backend.reminders.dispatchDueReminders({});
                  const msg = result.ok
                    ? `System batch: sent ${result.sent ?? 0}, failed ${result.failed ?? 0}, skipped ${result.skipped ?? 0}.`
                    : result.error || result.reason || 'Failed.';
                  setStatusLine(msg);
                  onAmbientMessage?.(msg);
                  await load();
                } finally {
                  setBusy(false);
                }
              }}
              className="ml-auto rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900"
            >
              System dispatch (global)
            </button>
          )}
        </div>
        {statusLine ? (
          <p className="border-t border-slate-50 px-5 pb-3 text-[11px] text-slate-600 dark:border-slate-900 dark:text-slate-400">
            {statusLine}
          </p>
        ) : null}
      </div>
    </div>
  );
};

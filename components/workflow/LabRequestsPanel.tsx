import React, { useMemo, useState } from "react";
import { LabRequest } from "../../types";
import { LabTestsCatalog, type LabTestType } from "../../services/labTestsCatalog";
import { Loader2, Plus } from "lucide-react";

export type LabPriority = "routine" | "urgent" | "stat";

export interface LabRequestDraft {
  search: string;
  selectedIds: string[];
  testName: string;
  testType: LabTestType;
  priority: LabPriority;
  clinicalIndication: string;
  doctorNotes: string;
}

interface LabRequestsPanelProps {
  saving: boolean;
  draft: LabRequestDraft;
  setDraft: React.Dispatch<React.SetStateAction<LabRequestDraft>>;
  requested: LabRequest[];
  onAddRequests: (items: Array<{ name: string; type: LabTestType; category?: string; indication?: string }>, priority: LabPriority) => Promise<void>;
}

function buildIndication(indication: string, doctorNotes: string): string | undefined {
  const i = indication.trim();
  const n = doctorNotes.trim();
  const merged = [i, n].filter(Boolean).join(" · ");
  return merged.length ? merged : undefined;
}

export const LabRequestsPanel: React.FC<LabRequestsPanelProps> = ({
  saving,
  draft,
  setDraft,
  requested,
  onAddRequests,
}) => {
  const results = useMemo(() => LabTestsCatalog.search(draft.search).slice(0, 25), [draft.search]);

  const canAdd =
    (draft.selectedIds.length > 0 || draft.testName.trim().length > 0) && !saving;

  const handleToggle = (id: string) => {
    setDraft((prev) => {
      const has = prev.selectedIds.includes(id);
      return {
        ...prev,
        selectedIds: has ? prev.selectedIds.filter((x) => x !== id) : [...prev.selectedIds, id],
      };
    });
  };

  const handleAdd = async () => {
    const items: Array<{ name: string; type: LabTestType; category?: string; indication?: string }> = [];
    const indication = buildIndication(draft.clinicalIndication, draft.doctorNotes);

    for (const id of draft.selectedIds) {
      const t = LabTestsCatalog.findById(id);
      if (!t) continue;
      items.push({ name: t.name, type: t.type, category: t.category, indication });
    }

    const manual = draft.testName.trim();
    if (items.length === 0 && manual) {
      items.push({ name: manual, type: draft.testType, category: undefined, indication });
    }

    if (items.length === 0) return;

    await onAddRequests(items, draft.priority);

    setDraft((prev) => ({
      ...prev,
      search: "",
      selectedIds: [],
      testName: "",
      testType: "blood",
      priority: "routine",
      clinicalIndication: "",
      doctorNotes: "",
    }));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Lab Requests</h3>

      <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Add Lab Request</h4>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Search common tests
            </label>
            <input
              type="text"
              className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              placeholder="Type: CBC, HbA1c, urinalysis, ultrasound…"
              value={draft.search}
              onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
            />
            {results.length > 0 && (
              <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c1c1e]">
                {results.map((t) => {
                  const checked = draft.selectedIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-start gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#2c2c2e]"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => handleToggle(t.id)}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {t.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {t.type}
                          {t.category ? ` • ${t.category}` : ""}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Select multiple tests above, or add a custom test name on the right.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Custom test name
              </label>
              <input
                type="text"
                className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                placeholder="If not in list, type it here…"
                value={draft.testName}
                onChange={(e) => setDraft((p) => ({ ...p, testName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Test Type
                </label>
                <select
                  className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  value={draft.testType}
                  onChange={(e) => setDraft((p) => ({ ...p, testType: e.target.value as LabTestType }))}
                >
                  <option value="blood">Blood</option>
                  <option value="urine">Urine</option>
                  <option value="stool">Stool</option>
                  <option value="imaging">Imaging</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Priority
                </label>
                <select
                  className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  value={draft.priority}
                  onChange={(e) => setDraft((p) => ({ ...p, priority: e.target.value as LabPriority }))}
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Clinical indication
              </label>
              <input
                type="text"
                className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                placeholder="e.g. Fever, anemia screen, UTI symptoms…"
                value={draft.clinicalIndication}
                onChange={(e) => setDraft((p) => ({ ...p, clinicalIndication: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Doctor notes / recommended tests
              </label>
              <textarea
                className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none h-20"
                placeholder="Add extra guidance for the lab (or recommended tests)…"
                value={draft.doctorNotes}
                onChange={(e) => setDraft((p) => ({ ...p, doctorNotes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Add request{draft.selectedIds.length > 1 ? "s" : ""}
        </button>
      </div>

      {requested.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 dark:text-white">Requested Tests</h4>
          {requested.map((lab) => (
            <div
              key={lab.id}
              className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{lab.testName}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {lab.testType} • {lab.priority}
                    {lab.testCategory ? ` • ${lab.testCategory}` : ""}
                  </div>
                  {lab.clinicalIndication && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {lab.clinicalIndication}
                    </div>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    lab.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : lab.status === "in_progress"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  }`}
                >
                  {lab.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


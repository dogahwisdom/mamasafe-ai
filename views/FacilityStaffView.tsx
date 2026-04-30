import React, { useCallback, useEffect, useState } from "react";
import type { CreateFacilityStaffInput, FacilityStaffSummary, UserProfile } from "../types";
import { backend } from "../services/backend";
import { Permissions } from "../services/permissions";
import { ArrowLeft, Loader2, UserMinus, UserPlus, Users } from "lucide-react";

interface FacilityStaffViewProps {
  user: UserProfile;
  onBack: () => void;
}

export const FacilityStaffView: React.FC<FacilityStaffViewProps> = ({ user, onBack }) => {
  const [staff, setStaff] = useState<FacilityStaffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFacilityStaffInput>({
    name: "",
    phone: "",
    email: "",
    pin: "",
    location: "",
    staffPermissionRole: "attendant",
  });

  const canManage = Permissions.isOwnerOrAdmin(user);

  const load = useCallback(async () => {
    if (!canManage) {
      setStaff([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await backend.facilityStaff.listStaffForCurrentFacility(user);
      setStaff(rows);
    } catch (e) {
      console.error(e);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [user, canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      await backend.facilityStaff.createStaffMember(user, {
        ...form,
        email: form.email?.trim() || undefined,
        location: form.location?.trim() || undefined,
      });
      setForm({
        name: "",
        phone: "",
        email: "",
        pin: "",
        location: "",
        staffPermissionRole: form.staffPermissionRole,
      });
      await load();
      alert(
        "Staff account created. They sign in with their own phone (or email) and PIN N/A not the owner’s login."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not create staff.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const removeStaff = async (staffUserId: string, displayName: string) => {
    if (!canManage) return;
    const ok = window.confirm(
      `Remove ${displayName} from your team? They will keep their account but lose access to this facility’s data and permissions until re-added.`
    );
    if (!ok) return;
    setRemovingId(staffUserId);
    try {
      await backend.facilityStaff.removeStaffFromFacility(user, staffUserId);
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not remove staff.";
      alert(msg);
    } finally {
      setRemovingId(null);
    }
  };

  if (!canManage) {
    return (
      <div className="p-8 bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 mb-6"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Team</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Only owners and admins can view or add facility staff.
        </p>
      </div>
    );
  }

  const portalLabel = user.role === "pharmacy" ? "Pharmacy" : "Clinic";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-brand-600" size={28} />
            {portalLabel} team
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Staff listed here have their own login (phone or email + PIN). Grant modules in Settings →
            Permissions. Use Remove to unlink someone who has left; their account stays, but they lose
            access to this facility until you add them again.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add staff</h2>
          <form onSubmit={submitAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Full name
              </label>
              <input
                required
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                required
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                placeholder="+254…"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Initial PIN (they can change later if you add that flow)
              </label>
              <input
                required
                type="password"
                minLength={4}
                autoComplete="new-password"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                value={form.pin}
                onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Role
              </label>
              <select
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white"
                value={form.staffPermissionRole}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    staffPermissionRole: e.target.value as CreateFacilityStaffInput["staffPermissionRole"],
                  }))
                }
              >
                <option value="attendant">Attendant</option>
                <option value="tech">Pharm tech</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
              Create staff login
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">People on your team</h2>
          {loading ? (
            <div className="flex justify-center py-12 text-brand-600">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : staff.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              No linked staff yet. Add someone above N/A they’ll use their own credentials to sign in.
            </p>
          ) : (
            <ul className="space-y-3">
              {staff.map((s) => (
                <li
                  key={s.id}
                  className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#2c2c2e] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {s.phone}
                      {s.email ? ` · ${s.email}` : ""}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                      Role: <span className="font-mono">{s.permissionRole || "N/A"}</span>
                      {s.permissions && (
                        <span className="ml-2">
                          · O:{s.permissions.overview ? "✓" : "N/A"} I:{s.permissions.inventory ? "✓" : "N/A"}{" "}
                          E:{s.permissions.expenses ? "✓" : "N/A"}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStaff(s.id, s.name)}
                    disabled={removingId === s.id}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50"
                  >
                    {removingId === s.id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <UserMinus size={14} />
                    )}
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from "react";
import type { UserProfile } from "../../types";
import { backend } from "../../services/backend";
import { Permissions } from "../../services/permissions";
import { Loader2, Search, Shield } from "lucide-react";

interface PermissionsManagerProps {
  currentUser: UserProfile;
}

function normalizeIdentifier(s: string): string {
  return s.trim();
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({ currentUser }) => {
  const canManage = Permissions.isOwnerOrAdmin(currentUser);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<UserProfile | null>(null);

  const canEditTarget = useMemo(
    () => !!target && Permissions.canManageStaffProfile(currentUser, target),
    [currentUser, target]
  );

  const targetPermissions = useMemo(() => {
    return target?.facilityData?.permissions ?? {};
  }, [target]);

  const findUser = async () => {
    const q = normalizeIdentifier(query);
    if (!q) return;
    setLoading(true);
    try {
      // Reuse auth helper that resolves by phone/email/name.
      const resolved = await backend.auth.getUserProfileByIdentifier(q);
      setTarget(resolved);
      if (!resolved) alert("No user found with that identifier.");
    } catch (e) {
      console.error(e);
      alert("Could not search users.");
    } finally {
      setLoading(false);
    }
  };

  const updateTarget = async (updates: Partial<UserProfile["facilityData"]>) => {
    if (!target) return;
    if (!canManage) {
      alert("Access restricted. Only Owners/Admins can manage permissions.");
      return;
    }
    if (!Permissions.canManageStaffProfile(currentUser, target)) {
      alert(
        "You can only change permissions for your own account or staff employed by your facility."
      );
      return;
    }
    setLoading(true);
    try {
      const next: UserProfile = {
        ...target,
        facilityData: {
          ...(target.facilityData || { managerName: target.name }),
          ...updates,
        },
      };
      await backend.auth.updateProfile(next);
      setTarget(next);
    } catch (e) {
      console.error(e);
      alert("Failed to update permissions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="text-brand-600" size={18} />
            Permissions
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Owners/Admins can grant Overview, Inventory, and Expenses to staff linked to their facility
            (<span className="font-mono text-xs">employer_facility_id</span>).
          </p>
        </div>
      </div>

      {!canManage && (
        <div className="mt-4 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/15">
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            Access restricted
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">
            This account cannot manage permissions yet.
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            Detected: role=<span className="font-mono">{String(currentUser.role)}</span>, permissionRole=<span className="font-mono">{String(currentUser.facilityData?.permissionRole || "-")}</span>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Find user by phone, email, or name
          </label>
          <input
            type="text"
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            placeholder="e.g. +2547…, name, or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={findUser}
          disabled={loading || !query.trim() || !canManage}
          className="self-end inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          Search
        </button>
      </div>

      {target && (
        <div className="mt-5 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#2c2c2e]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{target.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {target.role} · {target.phone || "-"} · {target.email || "-"}
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Staff role: {target.facilityData?.permissionRole || "-"}
            </div>
          </div>

          {canManage && !canEditTarget && (
            <div className="mt-3 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/15 text-sm text-slate-700 dark:text-slate-300">
              View only: this user is not employed by your facility (or you are not their superadmin).
              Ask a superadmin to set <span className="font-mono text-xs">employer_facility_id</span>{" "}
              to your facility user id so you can manage them.
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Staff role
              </label>
              <select
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white"
                value={target.facilityData?.permissionRole || ""}
                disabled={!canManage || !canEditTarget}
                onChange={(e) =>
                  updateTarget({ permissionRole: e.target.value as any })
                }
              >
                <option value="">-</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="tech">Pharm tech</option>
                <option value="attendant">Attendant</option>
              </select>
            </div>

            {(["overview", "inventory", "expenses"] as const).map((k) => (
              <label
                key={k}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c1c1e]"
              >
                <input
                  type="checkbox"
                  checked={!!(targetPermissions as any)[k]}
                  disabled={!canManage || !canEditTarget}
                  onChange={(e) =>
                    updateTarget({
                      permissions: {
                        ...(target.facilityData?.permissions || {}),
                        [k]: e.target.checked,
                      },
                    })
                  }
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                    {k}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Allow access
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


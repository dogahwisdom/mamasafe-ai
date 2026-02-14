import React, { useEffect, useState } from 'react';
import { backend } from '../services/backend';
import { Referral } from '../types';
import { Activity, ArrowRight, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface ReferralsViewProps {
  onBack: () => void;
}

const statusLabel: Record<Referral['status'], string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColor: Record<Referral['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export const ReferralsView: React.FC<ReferralsViewProps> = ({ onBack }) => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filter, setFilter] = useState<Referral['status'] | 'all'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await backend.referrals.getAll();
      setReferrals(data);
      setLoading(false);
    };
    load();
  }, []);

  const updateStatus = async (id: string, status: Referral['status']) => {
    setReferrals(prev =>
      prev.map(r => (r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)),
    );
    await backend.referrals.updateStatus(id, status);
  };

  const filtered =
    filter === 'all' ? referrals : referrals.filter(r => r.status === filter);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded-full bg-white dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ← Back
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Referrals
        </h1>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 text-xs font-semibold">
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Total: {referrals.length}
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700">
            Pending: {referrals.filter(r => r.status === 'pending').length}
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">
            In Progress: {referrals.filter(r => r.status === 'in_progress').length}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
            Completed: {referrals.filter(r => r.status === 'completed').length}
          </span>
        </div>

        <div className="ml-auto flex gap-2 text-xs font-semibold">
          {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map(v => (
            <button
              key={v}
              onClick={() => setFilter(v as any)}
              className={`px-3 py-1 rounded-full border ${
                filter === v
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white'
                  : 'bg-white dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {v === 'all' ? 'All' : statusLabel[v as Referral['status']]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-slate-400">
            <Activity className="animate-spin mr-2" size={18} /> Loading referrals...
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400">
            <AlertTriangle size={32} className="mb-2" />
            <p className="text-sm font-semibold">No referrals to display</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
            {filtered.map(ref => (
              <div
                key={ref.id}
                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e] flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {ref.fromFacility}
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      {ref.toFacility}
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[ref.status]}`}
                    >
                      {statusLabel[ref.status]}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {ref.patientName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {ref.reason}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                    <Clock size={10} />
                    Created {new Date(ref.createdAt).toLocaleString('en-KE')}
                  </p>
                </div>

                <div className="flex gap-2 md:flex-col">
                  {ref.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(ref.id, 'in_progress')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      Start <Activity size={12} />
                    </button>
                  )}
                  {ref.status === 'in_progress' && (
                    <button
                      onClick={() => updateStatus(ref.id, 'completed')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                    >
                      Complete <CheckCircle size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


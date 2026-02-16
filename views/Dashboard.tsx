
import React, { useState, useEffect } from 'react';
import { ActionCard } from '../components/ActionCard';
import { backend } from '../services/backend';
import { Users, AlertTriangle, Calendar, Activity, ChevronRight, Building2, TrendingUp, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Patient, UserProfile, Task, Reminder } from '../types';

// Mock Data for Analytics
const visitData = [
  { name: 'Mon', visits: 12 },
  { name: 'Tue', visits: 19 },
  { name: 'Wed', visits: 15 },
  { name: 'Thu', visits: 22 },
  { name: 'Fri', visits: 28 },
  { name: 'Sat', visits: 18 },
  { name: 'Sun', visits: 10 },
];

interface DashboardProps {
  onNavigate: (view: string) => void;
  user?: UserProfile;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-[#2c2c2e]/90 backdrop-blur-md p-3 rounded-xl shadow-xl border border-slate-100 dark:border-black/50 text-xs">
        <p className="font-semibold text-slate-500 mb-1">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">
          {payload[0].value} <span className="text-xs font-normal text-slate-500">{payload[0].dataKey === 'rate' ? '%' : 'visits'}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const DashboardView: React.FC<DashboardProps> = ({ onNavigate, user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ancEarlyRate, setAncEarlyRate] = useState<number | null>(null);
  const [followup24hRate, setFollowup24hRate] = useState<number | null>(null);
  const [engagementRate, setEngagementRate] = useState<number | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      const [taskData, patients] = await Promise.all([
        backend.clinic.getTasks(),
        backend.patients.getAll(),
      ]);
      setTasks(taskData);

      if (patients.length) {
        const early = patients.filter((p: Patient) => p.gestationalWeeks <= 16);
        const ancRate = Math.round((early.length / patients.length) * 100);
        setAncEarlyRate(ancRate);

        const allMeds = patients.flatMap((p) => p.medications || []);
        if (allMeds.length) {
          const avgAdherence =
            allMeds.reduce((sum, m) => sum + (m.adherenceRate || 0), 0) /
            allMeds.length;
          setEngagementRate(Math.round(avgAdherence));
        } else {
          setEngagementRate(null);
        }
      } else {
        setAncEarlyRate(null);
        setEngagementRate(null);
      }

      const missed = taskData.filter((t) => t.type === 'Missed Visit');
      if (missed.length) {
        const within24 = missed.filter(
          (t) => t.resolved && t.resolvedAt && t.resolvedAt - t.timestamp <= 24 * 60 * 60 * 1000
        );
        const rate = Math.round((within24.length / missed.length) * 100);
        setFollowup24hRate(rate);
      } else {
        setFollowup24hRate(null);
      }

      await backend.reminders.generateDailyReminders();
      const pending = await backend.reminders.getPending();
      setReminders(pending.slice(0, 5));
    };
    loadData();
  }, []);

  const resolveTask = async (id: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, resolved: true } : t));
    await backend.clinic.resolveTask(id);
  };

  const activeTasks = tasks.filter(t => !t.resolved);

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-5">
           <div className="hidden md:flex h-16 w-16 bg-white dark:bg-[#2c2c2e] rounded-2xl items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative">
             {user?.avatar ? (
                <img src={user.avatar} alt="Clinic Logo" className="w-full h-full object-cover" />
             ) : (
                <Building2 size={32} className="text-brand-600 dark:text-brand-500" />
             )}
           </div>
           <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.name || 'MamaSafe Clinic'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-lg">
                Clinic Manager: {user?.facilityData?.managerName || 'Admin'}
              </p>
           </div>
        </div>
        <div className="text-sm font-semibold text-slate-500 bg-white/50 dark:bg-[#1c1c1e] px-4 py-2 rounded-full backdrop-blur-md border border-slate-100 dark:border-slate-800">
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
        </div>
      </div>

      {/* KPI Cards - Aligned with Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <ActionCard 
          title="Tasks Due" 
          value={activeTasks.length}
          subtitle="Critical follow-ups"
          icon={AlertTriangle} 
          variant={activeTasks.length > 0 ? "alert" : "default"}
        />
        <ActionCard 
          title="24h Follow-up" 
          value={followup24hRate !== null ? `${followup24hRate}%` : '—'} 
          subtitle="Response within 24h"
          icon={Clock} 
          variant="brand"
        />
         <ActionCard 
          title="ANC < 16 Wks" 
          value={ancEarlyRate !== null ? `${ancEarlyRate}%` : '—'} 
          subtitle="Early Enrollment Rate"
          icon={Calendar} 
          variant="default"
        />
         <ActionCard 
          title="Engagement" 
          value={engagementRate !== null ? `${engagementRate}%` : '—'} 
          subtitle="Patient response rate"
          icon={Activity} 
          variant="default"
          onClick={() => onNavigate('patients')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1c1c1e] p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex justify-between items-center mb-8">
             <div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Clinic Analytics</h3>
               <p className="text-sm text-slate-500 font-medium">Weekly ANC Visits Trend</p>
             </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitData}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 12}} dy={10} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="visits" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Tracker / Priority Queue */}
        <div className="bg-white dark:bg-[#1c1c1e] p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col border border-slate-100 dark:border-slate-800/50 max-h-[520px]">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Action Items</h3>
             <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-md">{activeTasks.length} PENDING</span>
           </div>
           
           <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
             {activeTasks.length > 0 ? activeTasks.map((task) => (
               <div 
                  key={task.id} 
                  className="group relative p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e] hover:shadow-md transition-all"
               >
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${task.type === 'High Risk' ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`} />
                       <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{task.type}</span>
                    </div>
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                       <Clock size={12} /> {task.deadline}
                    </span>
                 </div>
                 
                 <h4 className="font-bold text-slate-900 dark:text-white">{task.patientName}</h4>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{task.notes}</p>
                 
                 <button 
                   onClick={() => resolveTask(task.id)}
                   className="w-full py-2 bg-white dark:bg-black border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 transition-all flex items-center justify-center gap-2"
                 >
                   <CheckCircle size={14} /> Mark Resolved
                 </button>
               </div>
             )) : (
               <div className="text-center py-10 opacity-50">
                 <CheckCircle size={48} className="mx-auto mb-2 text-green-500" />
                 <p className="text-sm font-bold">All caught up!</p>
               </div>
             )}
           </div>
           
           <button onClick={() => onNavigate('patients')} className="w-full mt-6 py-3.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-[#2c2c2e] rounded-xl hover:bg-slate-200 transition-colors">
             View All Patients
           </button>

           {/* Reminders Preview */}
           <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
             <div className="flex items-center justify-between mb-2">
               <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                 <MessageCircle size={12} /> Pending Reminders
               </h4>
               <span className="text-[10px] font-semibold text-slate-400">
                 {reminders.length} queued
               </span>
             </div>
             {reminders.length === 0 ? (
               <p className="text-[11px] text-slate-400">
                 No reminders queued. Patients are up to date.
               </p>
             ) : (
               <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
                 {reminders.map(r => (
                   <div key={r.id} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                     <span className="w-1.5 h-1.5 rounded-full mt-1.5 bg-emerald-500" />
                     <div>
                       <p className="font-semibold">
                         {r.patientName} • {r.type === 'appointment' ? 'Appointment' : 'Medication'}
                       </p>
                       <p className="text-slate-400">
                         {new Date(r.scheduledFor).toLocaleTimeString('en-KE', {
                           hour: '2-digit',
                           minute: '2-digit',
                         })}{' '}
                         • {r.channel.toUpperCase()}
                       </p>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

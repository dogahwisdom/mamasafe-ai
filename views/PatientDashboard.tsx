
import React from 'react';
import { UserProfile, RiskLevel } from '../types';
import { ActionCard } from '../components/ActionCard';
import { Calendar, Pill, Activity, AlertTriangle, Phone, FileText, CheckCircle, Settings, LogOut } from 'lucide-react';
import { backend } from '../services/backend';

interface PatientDashboardProps {
  user: UserProfile;
  onNavigate: (view: string) => void;
  onLogout?: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ user, onNavigate, onLogout }) => {
  const patient = user.patientData;
  if (!patient) return null;

  // Derive daily schedule from dynamic medications
  const todayMeds = patient.medications || [];

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await backend.auth.logout();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       
       {/* Hero Card */}
       <div className="bg-gradient-to-br from-brand-500 to-teal-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h1 className="text-3xl font-bold mb-1">Hello, {user.name.split(' ')[0]}</h1>
                   <p className="text-brand-100 font-medium">Week {patient.gestationWeeks} of pregnancy</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full font-bold text-sm border border-white/10">
                      {patient.riskStatus} Risk
                   </div>
                   <button
                      onClick={handleLogout}
                      className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full border border-white/10 transition-all active:scale-95"
                      title="Log Out"
                   >
                      <LogOut size={18} />
                   </button>
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-black/20 backdrop-blur-sm p-4 rounded-2xl">
                   <p className="text-xs font-bold uppercase tracking-wider text-brand-200 mb-1">Next Visit</p>
                   <p className="text-xl font-bold">{new Date(patient.nextAppointment).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="bg-black/20 backdrop-blur-sm p-4 rounded-2xl">
                   <p className="text-xs font-bold uppercase tracking-wider text-brand-200 mb-1">Baby Size</p>
                   <p className="text-xl font-bold">Papaya</p>
                </div>
             </div>
          </div>
          
          {/* Decorative Circles */}
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20px] left-[20px] w-32 h-32 bg-teal-300/20 rounded-full blur-2xl" />
       </div>

       {/* Actions Grid */}
       <h2 className="text-xl font-bold text-slate-900 dark:text-white px-2">Quick Actions</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <ActionCard 
             title="Report Symptoms" 
             value="Triage" 
             subtitle="Check how you feel"
             icon={Activity} 
             variant="brand"
             onClick={() => onNavigate('triage')}
          />
          <ActionCard 
             title="My Medications" 
             value={`${todayMeds.filter(m => !m.taken).length} Remaining`} 
             subtitle={todayMeds.length > 0 ? "Track your doses" : "No active prescriptions"}
             icon={Pill} 
             variant="default"
             onClick={() => onNavigate('medications')}
          />
          <ActionCard 
             title="Education" 
             value="Library" 
             subtitle="Weekly baby updates"
             icon={FileText} 
             variant="default"
             onClick={() => onNavigate('education')}
          />
          <ActionCard 
             title="Settings" 
             value="Account" 
             subtitle="Profile & preferences"
             icon={Settings} 
             variant="default"
             onClick={() => onNavigate('settings')}
          />
       </div>

       {/* Medication Schedule */}
       <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Daily Schedule</h3>
             <span className="text-sm font-bold text-brand-600">Today</span>
          </div>
          
          <div className="space-y-4">
             {todayMeds.length > 0 ? (
                todayMeds.sort((a,b) => a.type === 'morning' ? -1 : 1).map((med, i) => (
                    <div key={med.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-black/40 rounded-2xl">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${med.taken ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                            {med.taken ? <CheckCircle size={20} /> : <div className="w-3 h-3 bg-current rounded-full" />}
                        </div>
                        <div className="flex-1">
                            <p className={`font-bold ${med.taken ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{med.name}</p>
                            <p className="text-xs text-slate-500">{med.time} • {med.instructions}</p>
                        </div>
                    </div>
                ))
             ) : (
                <div className="p-8 text-center text-slate-400">
                    <Pill size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No medications scheduled for today.</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

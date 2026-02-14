
import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, Clock, Pill, Calendar, AlertCircle } from 'lucide-react';
import { UserProfile, Medication } from '../types';
import { backend } from '../services/backend';

interface MedicationsViewProps {
  onBack: () => void;
  user: UserProfile | null;
  onUpdateUser: (user: UserProfile) => Promise<void>;
}

const TIME_SLOTS: Medication['type'][] = ['morning', 'afternoon', 'evening'];

export const MedicationsView: React.FC<MedicationsViewProps> = ({ onBack, user, onUpdateUser }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Use data from user profile, fallback to empty array
  const medications = user?.patientData?.medications || [];

  const toggleTaken = async (id: string, currentStatus: boolean) => {
    if (!user) return;
    setLoadingId(id);
    try {
        const updatedUser = await backend.patients.updateMedicationStatus(user.id, id, !currentStatus);
        if (updatedUser) {
            await onUpdateUser(updatedUser);
        }
    } catch (e) {
        console.error("Failed to update medication", e);
    } finally {
        setLoadingId(null);
    }
  };

  const calculateAdherence = () => {
    if (medications.length === 0) return 100;
    const taken = medications.filter(m => m.taken).length;
    return Math.round((taken / medications.length) * 100);
  };

  const adherence = calculateAdherence();

  const getDaySection = (type: string) => {
     switch(type) {
        case 'morning': return { label: 'Morning', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/10' };
        case 'afternoon': return { label: 'Afternoon', color: 'text-brand-500 bg-brand-50 dark:bg-brand-900/10' };
        case 'evening': return { label: 'Evening', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' };
        default: return { label: 'Other', color: 'text-slate-500' };
     }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-3 rounded-full bg-white dark:bg-[#1c1c1e] text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-sm border border-slate-100 dark:border-slate-800 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
           <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Medications</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Track your daily prescriptions</p>
        </div>
        <div className="bg-white dark:bg-[#1c1c1e] px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-2">
           <Calendar size={18} className="text-brand-600" />
           <span className="font-bold text-slate-900 dark:text-white text-sm">Today</span>
        </div>
      </div>

      {medications.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1c1c1e] rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
             <div className="w-20 h-20 bg-slate-100 dark:bg-[#2c2c2e] rounded-full flex items-center justify-center mx-auto mb-6">
                <Pill size={32} className="text-slate-400" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Medications</h3>
             <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                You don't have any active prescriptions assigned to your profile yet.
             </p>
          </div>
      ) : (
          <>
            {/* Progress Card */}
            <div className="bg-slate-900 dark:bg-white text-white dark:text-black p-8 rounded-[2.5rem] shadow-xl mb-10 flex items-center justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-4xl font-bold mb-1">{adherence}%</h2>
                    <p className="text-slate-400 dark:text-slate-500 font-medium">Daily Adherence</p>
                    <div className="mt-4 flex items-center gap-2 text-sm bg-white/10 dark:bg-black/5 w-fit px-3 py-1.5 rounded-lg backdrop-blur-md">
                    <AlertCircle size={16} className={adherence < 100 ? 'text-amber-400 dark:text-amber-600' : 'text-green-400 dark:text-green-600'} />
                    <span>{adherence === 100 ? 'All caught up!' : `${medications.filter(m => !m.taken).length} doses remaining`}</span>
                    </div>
                </div>
                
                <div className="w-24 h-24 rounded-full relative flex items-center justify-center bg-slate-800 dark:bg-slate-200">
                    <div 
                    className="absolute inset-0 rounded-full transition-all duration-1000"
                    style={{ 
                        background: `conic-gradient(var(--brand-500, #14b8a6) ${adherence}%, transparent ${adherence}% 100%)` 
                    }} 
                    />
                    <div className="absolute inset-2 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center">
                        <Pill size={32} className="text-slate-500" />
                    </div>
                </div>
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 dark:bg-black/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            </div>

            {/* Medication List */}
            <div className="space-y-8">
                {TIME_SLOTS.map(timeSlot => {
                    const meds = medications.filter(m => m.type === timeSlot);
                    if (meds.length === 0) return null;
                    
                    const sectionStyle = getDaySection(timeSlot);

                    return (
                    <div key={timeSlot} className="animate-slide-up">
                        <h3 className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-4 ${sectionStyle.color}`}>
                            <Clock size={14} />
                            {sectionStyle.label}
                        </h3>
                        
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            {meds.map((med, index) => (
                                <div 
                                key={med.id} 
                                onClick={() => loadingId !== med.id && toggleTaken(med.id, med.taken)}
                                className={`
                                    p-5 flex items-center gap-5 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-[#2c2c2e]
                                    ${index !== meds.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}
                                `}
                                >
                                <div className={`
                                    w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0
                                    ${med.taken 
                                        ? 'bg-brand-500 border-brand-500 scale-110' 
                                        : 'border-slate-300 dark:border-slate-600 bg-transparent hover:border-brand-400'}
                                    ${loadingId === med.id ? 'opacity-50' : ''}
                                `}>
                                    {med.taken && <CheckCircle size={18} className="text-white" strokeWidth={3} />}
                                </div>
                                
                                <div className={`flex-1 transition-opacity duration-300 ${med.taken ? 'opacity-50' : 'opacity-100'}`}>
                                    <h4 className={`text-lg font-bold text-slate-900 dark:text-white ${med.taken ? 'line-through decoration-slate-400' : ''}`}>{med.name}</h4>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        <span className="font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{med.dosage}</span>
                                        <span>•</span>
                                        <span>{med.instructions}</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-sm font-bold text-slate-400">{med.time}</span>
                                </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    );
                })}
            </div>
          </>
      )}
    </div>
  );
};

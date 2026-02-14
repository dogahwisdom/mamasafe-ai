import React, { useState } from 'react';
import { Search, Phone, Filter, ChevronRight, User, X, Calendar, MapPin, Activity, Clock } from 'lucide-react';
import { Patient, RiskLevel } from '../types';

interface PatientsViewProps {
  onNavigate: (view: string) => void;
  patients: Patient[];
}

export const PatientsView: React.FC<PatientsViewProps> = ({ onNavigate, patients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'high_risk'>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'high_risk' && (p.riskStatus === RiskLevel.HIGH || p.riskStatus === RiskLevel.CRITICAL));
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Patients</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{filteredPatients.length} mothers enrolled</p>
        </div>
        <button 
          onClick={() => onNavigate('enrollment')}
          className="bg-slate-900 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-full text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>+</span> Add New Patient
        </button>
      </div>

      {/* Search & Filter Bar - iOS Style */}
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or location" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-200/60 dark:bg-[#1c1c1e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500/50 transition-all"
          />
        </div>
        <button 
          onClick={() => setFilter(filter === 'all' ? 'high_risk' : 'all')}
          className={`
            px-4 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all
            ${filter === 'high_risk' 
              ? 'bg-red-500 text-white shadow-red-500/30 shadow-lg' 
              : 'bg-slate-200/60 dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-[#2c2c2e]'}
          `}
        >
          <Filter size={18} />
          <span className="hidden md:inline">{filter === 'high_risk' ? 'High Risk' : 'Filter'}</span>
        </button>
      </div>

      {/* Patient List */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/50 overflow-hidden min-h-[300px]">
        {filteredPatients.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPatients.map((patient) => (
              <div 
                key={patient.id} 
                onClick={() => setSelectedPatient(patient)}
                className="group flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm shrink-0
                    ${patient.riskStatus === RiskLevel.HIGH ? 'bg-red-500' : 
                      patient.riskStatus === RiskLevel.MEDIUM ? 'bg-orange-400' : 'bg-brand-500'}
                  `}>
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{patient.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       <span>{patient.gestationalWeeks} Weeks</span>
                       <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                       <span>{patient.location}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right mr-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Next Visit</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                      {new Date(patient.nextAppointment).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}
                    </p>
                  </div>
                  
                  {/* Call Button - Direct Action */}
                  <a 
                    href={`tel:${patient.phone.replace(/\s+/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/10 hover:bg-brand-100 dark:hover:bg-brand-900/30 rounded-full transition-colors flex items-center justify-center"
                    title={`Call ${patient.name}`}
                  >
                    <Phone size={18} />
                  </a>

                  {/* Details Button - Explicit Action (though row click works too) */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedPatient(patient); }}
                    className="p-2 text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                     <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <User size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No patients found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div 
            className="bg-white dark:bg-[#1c1c1e] w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPatient(null)} 
              className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-8">
               <div className={`
                  w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl mb-4
                  ${selectedPatient.riskStatus === RiskLevel.HIGH ? 'bg-red-500 shadow-red-500/30' : 
                    selectedPatient.riskStatus === RiskLevel.MEDIUM ? 'bg-orange-400 shadow-orange-400/30' : 'bg-brand-500 shadow-brand-500/30'}
               `}>
                  {selectedPatient.name.charAt(0)}
               </div>
               <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedPatient.name}</h2>
               <div className="flex items-center gap-2 mt-2 text-slate-500 dark:text-slate-400 font-medium">
                  <MapPin size={16} />
                  {selectedPatient.location}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pregnancy</p>
                  <div className="flex items-center gap-2">
                     <Activity size={18} className="text-brand-500" />
                     <span className="font-bold text-slate-900 dark:text-white">{selectedPatient.gestationalWeeks} Weeks</span>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Age</p>
                  <div className="flex items-center gap-2">
                     <User size={18} className="text-blue-500" />
                     <span className="font-bold text-slate-900 dark:text-white">{selectedPatient.age} Yrs</span>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Next Visit</p>
                  <div className="flex items-center gap-2">
                     <Calendar size={18} className="text-purple-500" />
                     <span className="font-bold text-slate-900 dark:text-white">
                        {new Date(selectedPatient.nextAppointment).toLocaleDateString(undefined, {day: 'numeric', month: 'short'})}
                     </span>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                     selectedPatient.riskStatus === RiskLevel.HIGH ? 'bg-red-100 text-red-600' : 
                     selectedPatient.riskStatus === RiskLevel.MEDIUM ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                  }`}>
                     {selectedPatient.riskStatus}
                  </div>
               </div>
            </div>

            <div className="space-y-3">
               <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                        <Phone size={20} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedPatient.phone}</p>
                     </div>
                  </div>
                  <a 
                     href={`tel:${selectedPatient.phone.replace(/\s+/g, '')}`}
                     className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                     Call
                  </a>
               </div>

               <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                        <Clock size={20} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Check-in</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedPatient.lastCheckIn}</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
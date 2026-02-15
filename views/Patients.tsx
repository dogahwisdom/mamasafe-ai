import React, { useState, useEffect } from 'react';
import { Search, Phone, Filter, ChevronRight, User, X, Calendar, MapPin, Activity, Clock, Pill, History, ArrowRightLeft, CheckCircle, MessageSquare, AlertTriangle, FileText } from 'lucide-react';
import { Patient, RiskLevel, Referral, Task, Reminder } from '../types';
import { MedicationPrescription } from '../components/MedicationPrescription';
import { backend } from '../services/backend';

interface PatientsViewProps {
  onNavigate: (view: string) => void;
  patients: Patient[];
}

export const PatientsView: React.FC<PatientsViewProps> = ({ onNavigate, patients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'high_risk'>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'medications' | 'history' | 'referrals' | 'tasks' | 'reminders'>('details');
  const [refreshing, setRefreshing] = useState(false);
  const [patientReferrals, setPatientReferrals] = useState<Referral[]>([]);
  const [patientTasks, setPatientTasks] = useState<Task[]>([]);
  const [patientReminders, setPatientReminders] = useState<Reminder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'high_risk' && (p.riskStatus === RiskLevel.HIGH || p.riskStatus === RiskLevel.CRITICAL));
    return matchesSearch && matchesFilter;
  });

  // Load patient history when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      loadPatientHistory();
    }
  }, [selectedPatient]);

  const loadPatientHistory = async () => {
    if (!selectedPatient) return;
    
    setLoadingHistory(true);
    try {
      const [referrals, tasks, reminders] = await Promise.all([
        backend.referrals.getAll(),
        backend.clinic.getTasks(),
        backend.reminders.getAll(),
      ]);

      // Filter by patient ID
      setPatientReferrals(referrals.filter(r => r.patientId === selectedPatient.id));
      setPatientTasks(tasks.filter(t => t.patientId === selectedPatient.id));
      setPatientReminders(reminders.filter(r => r.patientId === selectedPatient.id));
    } catch (error) {
      console.error('Error loading patient history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div 
            className="bg-white dark:bg-[#1c1c1e] w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800 my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                setSelectedPatient(null);
                setActiveTab('details');
              }} 
              className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
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

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-[#2c2c2e] p-1 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeTab === 'details'
                    ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('medications')}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'medications'
                    ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Pill size={16} />
                Medications
                {selectedPatient.medications && selectedPatient.medications.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-brand-500 text-white text-xs rounded-full font-bold">
                    {selectedPatient.medications.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <History size={16} />
                History
              </button>
              <button
                onClick={() => setActiveTab('referrals')}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'referrals'
                    ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <ArrowRightLeft size={16} />
                Referrals
                {patientReferrals.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-brand-500 text-white text-xs rounded-full font-bold">
                    {patientReferrals.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'tasks'
                    ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <CheckCircle size={16} />
                Tasks
                {patientTasks.filter(t => !t.resolved).length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                    {patientTasks.filter(t => !t.resolved).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('reminders')}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'reminders'
                    ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <MessageSquare size={16} />
                Reminders
                {patientReminders.filter(r => !r.sent).length > 0 && (
                  <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                    {patientReminders.filter(r => !r.sent).length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
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
                        {selectedPatient.nextAppointment ? new Date(selectedPatient.nextAppointment).toLocaleDateString(undefined, {day: 'numeric', month: 'short'}) : 'Not scheduled'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      selectedPatient.riskStatus === RiskLevel.HIGH || selectedPatient.riskStatus === RiskLevel.CRITICAL ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 
                      selectedPatient.riskStatus === RiskLevel.MEDIUM ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
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
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {selectedPatient.lastCheckIn || 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedPatient.alerts && selectedPatient.alerts.length > 0 && (
                    <div className="p-4 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Alerts</p>
                      </div>
                      <div className="space-y-1">
                        {selectedPatient.alerts.map((alert: any, idx: number) => (
                          <p key={idx} className="text-sm text-red-700 dark:text-red-300">
                            • {typeof alert === 'string' ? alert : alert.message || JSON.stringify(alert)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'medications' && (
              <div className="min-h-[400px]">
                <MedicationPrescription
                  patient={selectedPatient}
                  onUpdate={async () => {
                    setRefreshing(true);
                    try {
                      const updatedPatients = await backend.patients.getAll();
                      const updated = updatedPatients.find(p => p.id === selectedPatient.id);
                      if (updated) {
                        setSelectedPatient(updated);
                      }
                    } catch (error) {
                      console.error('Error refreshing patient:', error);
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
                  </div>
                ) : (
                  <>
                    {/* Enrollment Date */}
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e]">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText size={18} className="text-brand-500" />
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Enrollment Information</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Patient enrolled in the system
                      </p>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e] text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{patientReferrals.length}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Referrals</p>
                      </div>
                      <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e] text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{patientTasks.length}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Tasks</p>
                      </div>
                      <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e] text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{patientReminders.length}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Reminders</p>
                      </div>
                    </div>

                    {/* Recent Activity Timeline */}
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-900 dark:text-white mb-4">Recent Activity</p>
                      <div className="space-y-3">
                        {patientReminders.slice(0, 5).map((reminder) => (
                          <div key={reminder.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl">
                            <MessageSquare size={16} className="text-brand-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {reminder.type === 'appointment' ? 'Appointment Reminder' : 
                                 reminder.type === 'medication' ? 'Medication Reminder' : 'Symptom Check-in'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {new Date(reminder.scheduledFor).toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                {reminder.message}
                              </p>
                            </div>
                            {reminder.sent && (
                              <CheckCircle size={16} className="text-green-500" />
                            )}
                          </div>
                        ))}
                        {patientReminders.length === 0 && (
                          <p className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                            No activity history yet
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'referrals' && (
              <div className="space-y-3">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
                  </div>
                ) : patientReferrals.length > 0 ? (
                  patientReferrals.map((referral) => (
                    <div key={referral.id} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowRightLeft size={18} className="text-brand-500" />
                            <h3 className="font-bold text-slate-900 dark:text-white">
                              {referral.fromFacility} → {referral.toFacility}
                            </h3>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{referral.reason}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          referral.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          referral.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          referral.status === 'cancelled' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {referral.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          <span>Created {new Date(referral.createdAt).toLocaleDateString()}</span>
                        </div>
                        {referral.updatedAt !== referral.createdAt && (
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} />
                            <span>Updated {new Date(referral.updatedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <ArrowRightLeft className="mx-auto mb-4 text-slate-400" size={48} />
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">No referrals</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                      This patient has no referral history
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-3">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
                  </div>
                ) : patientTasks.length > 0 ? (
                  <>
                    {patientTasks.filter(t => !t.resolved).length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">Active Tasks</p>
                        <div className="space-y-2">
                          {patientTasks.filter(t => !t.resolved).map((task) => (
                            <div key={task.id} className="p-4 rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                                    <span className="font-bold text-slate-900 dark:text-white">{task.type}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{task.deadline}</p>
                                  {task.notes && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{task.notes}</p>
                                  )}
                                </div>
                                <button
                                  onClick={async () => {
                                    try {
                                      await backend.clinic.resolveTask(task.id);
                                      await loadPatientHistory();
                                    } catch (error) {
                                      console.error('Error resolving task:', error);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors"
                                >
                                  Resolve
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {patientTasks.filter(t => t.resolved).length > 0 && (
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">Completed Tasks</p>
                        <div className="space-y-2">
                          {patientTasks.filter(t => t.resolved).map((task) => (
                            <div key={task.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e]">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span className="font-bold text-slate-900 dark:text-white">{task.type}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{task.deadline}</p>
                                  {task.notes && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{task.notes}</p>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {task.resolvedAt ? new Date(task.resolvedAt).toLocaleDateString() : 'Resolved'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto mb-4 text-slate-400" size={48} />
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">No tasks</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                      This patient has no task history
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reminders' && (
              <div className="space-y-3">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
                  </div>
                ) : patientReminders.length > 0 ? (
                  <>
                    {patientReminders.filter(r => !r.sent).length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">Pending Reminders</p>
                        <div className="space-y-2">
                          {patientReminders.filter(r => !r.sent).map((reminder) => (
                            <div key={reminder.id} className="p-4 rounded-2xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare size={16} className="text-orange-600 dark:text-orange-400" />
                                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                                      {reminder.type.replace('_', ' ')}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                      reminder.channel === 'whatsapp' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                      {reminder.channel.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                                    {reminder.message}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Scheduled: {new Date(reminder.scheduledFor).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {patientReminders.filter(r => r.sent).length > 0 && (
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">Sent Reminders</p>
                        <div className="space-y-2">
                          {patientReminders.filter(r => r.sent).map((reminder) => (
                            <div key={reminder.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e]">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                                      {reminder.type.replace('_', ' ')}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                      reminder.channel === 'whatsapp' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                      {reminder.channel.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                                    {reminder.message}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                    <span>Scheduled: {new Date(reminder.scheduledFor).toLocaleString()}</span>
                                    {reminder.sentAt && (
                                      <>
                                        <span>•</span>
                                        <span>Sent: {new Date(reminder.sentAt).toLocaleString()}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="mx-auto mb-4 text-slate-400" size={48} />
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">No reminders</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                      This patient has no reminder history
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
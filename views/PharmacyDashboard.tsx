import React, { useState, useEffect } from 'react';
import { UserProfile, Patient, DispensingRecord } from '../types';
import { backend } from '../services/backend';
import { ActionCard } from '../components/ActionCard';
import { Pill, Users, Calendar, CheckSquare, Search, CheckCircle, Clock, UserPlus, X, Loader2, FileText, AlertCircle } from 'lucide-react';

interface PharmacyDashboardProps {
  user: UserProfile;
  onNavigate: (view: string) => void;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user, onNavigate }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dispensingRecords, setDispensingRecords] = useState<DispensingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDispensingModal, setShowDispensingModal] = useState(false);
  const [dispensingForm, setDispensingForm] = useState({
    medicationName: '',
    dosage: '',
    quantity: 1,
    unit: 'tablets',
    nextFollowUpDate: '',
    notes: '',
  });
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'dispensed' | 'followups'>('queue');

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientData, dispensingData] = await Promise.all([
          backend.patients.getAll(),
          backend.dispensing.getDispensingRecords(),
        ]);
        setPatients(patientData);
        setDispensingRecords(dispensingData);
      } catch (e) {
        console.error("Failed to load pharmacy data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate metrics
  const today = new Date().toISOString().split('T')[0];
  const dispensedToday = dispensingRecords.filter(r => 
    r.dispensedAt.startsWith(today)
  ).length;

  const upcomingFollowUps = patients.filter(p => {
    if (!p.nextFollowUpDate) return false;
    const followUpDate = new Date(p.nextFollowUpDate);
    const todayDate = new Date(today);
    const daysDiff = Math.ceil((followUpDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff <= 7; // Next 7 days
  }).length;

  // Get patients with pending medications (from refill requests or medications table)
  const pendingPatients = patients.filter(p => {
    // Check if patient has medications that need dispensing
    return p.medications && p.medications.length > 0;
  });

  const handleDispense = async (patient: Patient) => {
    if (!patient.medications || patient.medications.length === 0) {
      alert('No medications to dispense for this patient');
      return;
    }

    setSelectedPatient(patient);
    // Pre-fill form with first medication
    const firstMed = patient.medications[0];
    setDispensingForm({
      medicationName: firstMed.name,
      dosage: firstMed.dosage,
      quantity: 1,
      unit: 'tablets',
      nextFollowUpDate: patient.nextFollowUpDate || '',
      notes: '',
    });
    setShowDispensingModal(true);
  };

  const handleSubmitDispensing = async () => {
    if (!selectedPatient || !dispensingForm.medicationName || !dispensingForm.dosage) {
      alert('Please fill in medication name and dosage');
      return;
    }

    setDispensingId(selectedPatient.id);
    try {
      await backend.dispensing.createDispensingRecord(
        selectedPatient.id,
        selectedPatient.name,
        dispensingForm.medicationName,
        dispensingForm.dosage,
        dispensingForm.quantity,
        dispensingForm.unit,
        dispensingForm.nextFollowUpDate || undefined,
        dispensingForm.notes || undefined
      );

      // Refresh data
      const [patientData, dispensingData] = await Promise.all([
        backend.patients.getAll(),
        backend.dispensing.getDispensingRecords(),
      ]);
      setPatients(patientData);
      setDispensingRecords(dispensingData);

      setShowSuccess(`Dispensed ${dispensingForm.medicationName} (${dispensingForm.dosage}) for ${selectedPatient.name}`);
      setTimeout(() => setShowSuccess(null), 3000);

      // Close modal and reset
      setShowDispensingModal(false);
      setSelectedPatient(null);
      setDispensingForm({
        medicationName: '',
        dosage: '',
        quantity: 1,
        unit: 'tablets',
        nextFollowUpDate: '',
        notes: '',
      });
    } catch (e) {
      console.error('Error dispensing:', e);
      alert("Failed to record dispensing");
    } finally {
      setDispensingId(null);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

  const dispensedTodayRecords = dispensingRecords.filter(r => 
    r.dispensedAt.startsWith(today)
  );

  const upcomingFollowUpPatients = patients
    .filter(p => {
      if (!p.nextFollowUpDate) return false;
      const followUpDate = new Date(p.nextFollowUpDate);
      const todayDate = new Date(today);
      const daysDiff = Math.ceil((followUpDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= 30; // Next 30 days
    })
    .sort((a, b) => {
      if (!a.nextFollowUpDate || !b.nextFollowUpDate) return 0;
      return new Date(a.nextFollowUpDate).getTime() - new Date(b.nextFollowUpDate).getTime();
    });

  return (
    <div className="space-y-8 animate-fade-in-up relative">
      {/* Toast Notification */}
      {showSuccess && (
        <div className="fixed top-24 right-6 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] flex items-center gap-3 z-50 animate-slide-in-right border border-green-500 backdrop-blur-md bg-opacity-90">
          <div className="bg-white/20 p-1.5 rounded-full">
            <CheckCircle size={20} className="text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="font-bold text-sm">Success</p>
            <p className="text-xs text-green-100">{showSuccess}</p>
          </div>
        </div>
      )}

      {/* Dispensing Modal */}
      {showDispensingModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Record Dispensing</h2>
              <button 
                onClick={() => {
                  setShowDispensingModal(false);
                  setSelectedPatient(null);
                }}
                className="p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patient</label>
                <div className="p-3 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl text-slate-900 dark:text-white font-semibold">
                  {selectedPatient.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medication Name *</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 text-slate-900 dark:text-white outline-none"
                  value={dispensingForm.medicationName}
                  onChange={e => setDispensingForm({...dispensingForm, medicationName: e.target.value})}
                  placeholder="e.g. Paracetamol"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dosage *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 text-slate-900 dark:text-white outline-none"
                    value={dispensingForm.dosage}
                    onChange={e => setDispensingForm({...dispensingForm, dosage: e.target.value})}
                    placeholder="e.g. 500mg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 text-slate-900 dark:text-white outline-none"
                      value={dispensingForm.quantity}
                      onChange={e => setDispensingForm({...dispensingForm, quantity: parseInt(e.target.value) || 1})}
                    />
                    <select
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 text-slate-900 dark:text-white outline-none"
                      value={dispensingForm.unit}
                      onChange={e => setDispensingForm({...dispensingForm, unit: e.target.value})}
                    >
                      <option value="tablets">tablets</option>
                      <option value="capsules">capsules</option>
                      <option value="ml">ml</option>
                      <option value="mg">mg</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Next Follow-up Date</label>
                <input
                  type="date"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 text-slate-900 dark:text-white outline-none"
                  value={dispensingForm.nextFollowUpDate}
                  onChange={e => setDispensingForm({...dispensingForm, nextFollowUpDate: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes (Optional)</label>
                <textarea
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 text-slate-900 dark:text-white outline-none resize-none h-24"
                  value={dispensingForm.notes}
                  onChange={e => setDispensingForm({...dispensingForm, notes: e.target.value})}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDispensingModal(false);
                    setSelectedPatient(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDispensing}
                  disabled={dispensingId !== null || !dispensingForm.medicationName || !dispensingForm.dosage}
                  className="flex-1 px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {dispensingId !== null ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Record Dispensing
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{user.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Pharmacy Dashboard</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('enrollment')}
            className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <UserPlus size={18} />
            <span className="hidden md:inline">Register Patient</span>
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-white dark:bg-[#1c1c1e] px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            <Clock size={16} />
            <span>
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-600" size={32} />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ActionCard 
              title="Dispensed Today" 
              value={dispensedToday} 
              icon={CheckSquare} 
              variant="default"
              subtitle="Medications dispensed"
            />
            <ActionCard 
              title="Assigned Patients" 
              value={patients.length} 
              icon={Users} 
              variant="default"
              subtitle={patients.length > 0 ? "Active patients" : "No patients enrolled"}
              onClick={() => onNavigate('patients')}
            />
            <ActionCard 
              title="Upcoming Follow-ups" 
              value={upcomingFollowUps} 
              icon={Calendar} 
              variant={upcomingFollowUps > 0 ? "brand" : "default"}
              subtitle="Next 7 days"
            />
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                  activeTab === 'queue'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3a3a3c]'
                }`}
              >
                Dispensing Queue
              </button>
              <button
                onClick={() => setActiveTab('dispensed')}
                className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                  activeTab === 'dispensed'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3a3a3c]'
                }`}
              >
                Dispensed Today ({dispensedToday})
              </button>
              <button
                onClick={() => setActiveTab('followups')}
                className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                  activeTab === 'followups'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3a3a3c]'
                }`}
              >
                Follow-up Dates ({upcomingFollowUpPatients.length})
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search patients..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/50 dark:text-white transition-all placeholder-slate-500"
              />
            </div>

            {/* Tab Content */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                {pendingPatients.length > 0 ? (
                  pendingPatients
                    .filter(p => filteredPatients.includes(p))
                    .map((patient) => (
                      <div key={patient.id} className="p-5 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{patient.name}</h4>
                            {patient.medications && patient.medications.length > 0 && (
                              <div className="space-y-2">
                                {patient.medications.map((med, idx) => (
                                  <div key={idx} className="flex items-center gap-3 text-sm">
                                    <Pill size={16} className="text-brand-500" />
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{med.name}</span>
                                    <span className="text-slate-500 dark:text-slate-400">•</span>
                                    <span className="text-slate-600 dark:text-slate-400">{med.dosage}</span>
                                    {med.frequency && (
                                      <>
                                        <span className="text-slate-500 dark:text-slate-400">•</span>
                                        <span className="text-slate-600 dark:text-slate-400">{med.frequency}</span>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDispense(patient)}
                            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                          >
                            <CheckCircle size={18} />
                            Dispense
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="py-20 text-center text-slate-400">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200 dark:border-slate-700">
                      <CheckCircle size={32} className="opacity-20" />
                    </div>
                    <p className="font-bold text-lg text-slate-500 dark:text-slate-400">No Pending Dispensing</p>
                    <p className="text-sm mt-1">All patients are up to date.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dispensed' && (
              <div className="space-y-4">
                {dispensedTodayRecords.length > 0 ? (
                  dispensedTodayRecords.map((record) => (
                    <div key={record.id} className="p-5 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{record.patientName}</h4>
                          <div className="flex items-center gap-3 text-sm">
                            <Pill size={16} className="text-green-500" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{record.medicationName}</span>
                            <span className="text-slate-500 dark:text-slate-400">•</span>
                            <span className="text-slate-600 dark:text-slate-400">{record.dosage}</span>
                            <span className="text-slate-500 dark:text-slate-400">•</span>
                            <span className="text-slate-600 dark:text-slate-400">{record.quantity} {record.unit}</span>
                          </div>
                          {record.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{record.notes}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(record.dispensedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-400">
                    <FileText size={48} className="opacity-20 mx-auto mb-4" />
                    <p className="font-bold text-lg text-slate-500 dark:text-slate-400">No Dispensing Today</p>
                    <p className="text-sm mt-1">No medications have been dispensed today.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'followups' && (
              <div className="space-y-4">
                {upcomingFollowUpPatients.length > 0 ? (
                  upcomingFollowUpPatients
                    .filter(p => filteredPatients.includes(p))
                    .map((patient) => {
                      const daysUntil = patient.nextFollowUpDate 
                        ? Math.ceil((new Date(patient.nextFollowUpDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      
                      return (
                        <div key={patient.id} className="p-5 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{patient.name}</h4>
                              <div className="flex items-center gap-3 text-sm">
                                <Calendar size={16} className="text-brand-500" />
                                <span className="text-slate-600 dark:text-slate-400">
                                  {patient.nextFollowUpDate 
                                    ? new Date(patient.nextFollowUpDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : 'No follow-up scheduled'}
                                </span>
                                {daysUntil !== null && (
                                  <>
                                    <span className="text-slate-500 dark:text-slate-400">•</span>
                                    <span className={`font-semibold ${daysUntil <= 3 ? 'text-red-500' : daysUntil <= 7 ? 'text-orange-500' : 'text-green-500'}`}>
                                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDispense(patient)}
                              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-colors"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-20 text-center text-slate-400">
                    <Calendar size={48} className="opacity-20 mx-auto mb-4" />
                    <p className="font-bold text-lg text-slate-500 dark:text-slate-400">No Upcoming Follow-ups</p>
                    <p className="text-sm mt-1">No patients have follow-up dates scheduled.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

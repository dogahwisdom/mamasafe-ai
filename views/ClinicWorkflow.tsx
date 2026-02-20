import React, { useState, useEffect } from 'react';
import { UserProfile, Patient, ClinicVisit, ClinicalHistory, LabRequest, Diagnosis, Payment } from '../types';
import { backend } from '../services/backend';
import { 
  UserPlus, Calendar, FileText, FlaskConical, Stethoscope, Pill, CreditCard, 
  CheckCircle, Clock, AlertCircle, Loader2, X, ChevronRight, Plus, Save
} from 'lucide-react';

interface ClinicWorkflowProps {
  user: UserProfile;
  onNavigate: (view: string) => void;
}

export const ClinicWorkflow: React.FC<ClinicWorkflowProps> = ({ user, onNavigate }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentVisit, setCurrentVisit] = useState<ClinicVisit | null>(null);
  const [activeStage, setActiveStage] = useState<'registration' | 'history' | 'lab' | 'diagnosis' | 'pharmacy' | 'payment'>('registration');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [visitForm, setVisitForm] = useState({
    visitType: 'outpatient' as 'outpatient' | 'inpatient' | 'emergency' | 'followup',
    receptionNotes: '',
  });

  const [historyForm, setHistoryForm] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    familyHistory: '',
    socialHistory: '',
    allergies: '',
    currentMedications: '',
    temperature: '',
    bp: '',
    pulse: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    physicalExamination: '',
  });

  const [labForm, setLabForm] = useState({
    testName: '',
    testType: 'blood' as 'blood' | 'urine' | 'stool' | 'imaging' | 'other',
    priority: 'routine' as 'routine' | 'urgent' | 'stat',
    clinicalIndication: '',
  });

  const [diagnosisForm, setDiagnosisForm] = useState({
    diagnosisName: '',
    diagnosisCode: '',
    diagnosisType: 'primary' as 'primary' | 'secondary' | 'differential' | 'provisional',
    description: '',
    severity: 'mild' as 'mild' | 'moderate' | 'severe' | 'critical',
  });

  // Next appointment is a clinician decision; captured here in the diagnosis/plan stage
  const [nextAppointmentDate, setNextAppointmentDate] = useState<string>('');
  const [nextAppointmentSuggestion, setNextAppointmentSuggestion] = useState<{
    date: string;
    rationale: string;
  } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'consultation' as 'consultation' | 'lab' | 'pharmacy' | 'procedure' | 'other',
    amount: '',
    paymentMethod: 'cash' as 'cash' | 'mpesa' | 'card' | 'insurance' | 'nhif' | 'waiver',
    transactionReference: '',
    insuranceProvider: '',
    insuranceNumber: '',
    nhifNumber: '',
    notes: '',
  });

  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistory | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (currentVisit) {
      loadVisitData();
    }
  }, [currentVisit]);

  const loadPatients = async () => {
    try {
      const data = await backend.patients.getAll();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadVisitData = async () => {
    if (!currentVisit) return;
    
    try {
      const visitData = await backend.workflow.getVisitById(currentVisit.id);
      setClinicalHistory(visitData.clinicalHistory || null);
      setLabRequests(visitData.labRequests);
      setDiagnoses(visitData.diagnoses);
      setPayments(visitData.payments);
    } catch (error) {
      console.error('Error loading visit data:', error);
    }
  };

  const handleStartVisit = async () => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    setLoading(true);
    try {
      const visit = await backend.workflow.createVisit(
        selectedPatient.id,
        selectedPatient.name,
        visitForm.visitType,
        visitForm.receptionNotes
      );
      setCurrentVisit(visit);
      setActiveStage('history');

      // Initialise next appointment control from existing patient value if present
      if (selectedPatient.nextAppointment) {
        try {
          const existing = new Date(selectedPatient.nextAppointment);
          if (!isNaN(existing.getTime())) {
            setNextAppointmentDate(existing.toISOString().split('T')[0]);
          }
        } catch {
          setNextAppointmentDate('');
        }
      } else {
        setNextAppointmentDate('');
      }
      setNextAppointmentSuggestion(null);
    } catch (error) {
      console.error('Error creating visit:', error);
      alert('Failed to start visit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHistory = async () => {
    if (!currentVisit || !historyForm.chiefComplaint.trim()) {
      alert('Please fill in at least the chief complaint');
      return;
    }

    setSaving(true);
    try {
      const vitalSigns: any = {};
      if (historyForm.temperature) vitalSigns.temperature = parseFloat(historyForm.temperature);
      if (historyForm.bp) vitalSigns.bp = historyForm.bp;
      if (historyForm.pulse) vitalSigns.pulse = parseInt(historyForm.pulse);
      if (historyForm.respiratoryRate) vitalSigns.respiratoryRate = parseInt(historyForm.respiratoryRate);
      if (historyForm.oxygenSaturation) vitalSigns.oxygenSaturation = parseFloat(historyForm.oxygenSaturation);
      if (historyForm.weight) vitalSigns.weight = parseFloat(historyForm.weight);
      if (historyForm.height) vitalSigns.height = parseFloat(historyForm.height);
      if (vitalSigns.weight && vitalSigns.height) {
        const heightInMeters = vitalSigns.height / 100;
        vitalSigns.bmi = parseFloat((vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(2));
      }

      const history = await backend.workflow.saveClinicalHistory(
        currentVisit.id,
        currentVisit.patientId,
        historyForm.chiefComplaint,
        {
          historyOfPresentIllness: historyForm.historyOfPresentIllness || undefined,
          pastMedicalHistory: historyForm.pastMedicalHistory || undefined,
          familyHistory: historyForm.familyHistory || undefined,
          socialHistory: historyForm.socialHistory || undefined,
          allergies: historyForm.allergies || undefined,
          currentMedications: historyForm.currentMedications || undefined,
          vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
          physicalExamination: historyForm.physicalExamination || undefined,
        }
      );
      setClinicalHistory(history);
      alert('Clinical history saved successfully');
    } catch (error) {
      console.error('Error saving history:', error);
      alert('Failed to save clinical history');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLabRequest = async () => {
    if (!currentVisit || !labForm.testName.trim()) {
      alert('Please enter a test name');
      return;
    }

    setSaving(true);
    try {
      const labRequest = await backend.workflow.createLabRequest(
        currentVisit.id,
        currentVisit.patientId,
        labForm.testName,
        labForm.testType,
        labForm.priority,
        labForm.clinicalIndication || undefined
      );
      setLabRequests([...labRequests, labRequest]);
      setLabForm({ testName: '', testType: 'blood', priority: 'routine', clinicalIndication: '' });
      alert('Lab request added successfully');
    } catch (error) {
      console.error('Error creating lab request:', error);
      alert('Failed to add lab request');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDiagnosis = async () => {
    if (!currentVisit || !diagnosisForm.diagnosisName.trim()) {
      alert('Please enter a diagnosis name');
      return;
    }

    setSaving(true);
    try {
      const diagnosis = await backend.workflow.createDiagnosis(
        currentVisit.id,
        currentVisit.patientId,
        diagnosisForm.diagnosisName,
        diagnosisForm.diagnosisType,
        {
          diagnosisCode: diagnosisForm.diagnosisCode || undefined,
          description: diagnosisForm.description || undefined,
          severity: diagnosisForm.severity,
        }
      );
      setDiagnoses([...diagnoses, diagnosis]);
      setDiagnosisForm({ 
        diagnosisName: '', 
        diagnosisCode: '', 
        diagnosisType: 'primary', 
        description: '', 
        severity: 'mild' 
      });

      // If clinician set a next appointment date, persist it on the patient record
      if (nextAppointmentDate) {
        try {
          await backend.workflow.updateNextAppointment(
            currentVisit.patientId,
            nextAppointmentDate
          );

          // Keep local patient state in sync so UI updates immediately
          setSelectedPatient(prev =>
            prev ? { ...prev, nextAppointment: nextAppointmentDate } : prev
          );
        } catch (error) {
          console.error('Error updating next appointment:', error);
          alert('Diagnosis saved, but failed to update next appointment.');
        }
      }

      alert('Diagnosis added successfully');
  const handleGetAppointmentSuggestion = () => {
    if (!selectedPatient || !currentVisit) {
      alert('Select a patient and start a visit first.');
      return;
    }

    setLoadingSuggestion(true);
    try {
      const suggestion = backend.appointmentPlanning.suggestNextAppointment(
        selectedPatient,
        {
          diagnosisName: diagnosisForm.diagnosisName || (diagnoses[0]?.diagnosisName || 'condition'),
          severity: diagnosisForm.severity,
          diagnosisType: diagnosisForm.diagnosisType,
        },
        {
          visitType: currentVisit.visitType,
        } as any
      );

      setNextAppointmentDate(suggestion.suggestedDate);
      setNextAppointmentSuggestion({
        date: suggestion.suggestedDate,
        rationale: suggestion.rationale,
      });
    } finally {
      setLoadingSuggestion(false);
    }
  };
    } catch (error) {
      console.error('Error creating diagnosis:', error);
      alert('Failed to add diagnosis');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!currentVisit || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const payment = await backend.workflow.createPayment(
        currentVisit.id,
        currentVisit.patientId,
        paymentForm.paymentType,
        parseFloat(paymentForm.amount),
        paymentForm.paymentMethod,
        {
          transactionReference: paymentForm.transactionReference || undefined,
          insuranceProvider: paymentForm.insuranceProvider || undefined,
          insuranceNumber: paymentForm.insuranceNumber || undefined,
          nhifNumber: paymentForm.nhifNumber || undefined,
          notes: paymentForm.notes || undefined,
          paymentStatus: 'paid',
        }
      );
      setPayments([...payments, payment]);
      setPaymentForm({
        paymentType: 'consultation',
        amount: '',
        paymentMethod: 'cash',
        transactionReference: '',
        insuranceProvider: '',
        insuranceNumber: '',
        nhifNumber: '',
        notes: '',
      });
      alert('Payment recorded successfully');
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteVisit = async () => {
    if (!currentVisit) return;
    
    if (!confirm('Complete this visit? This will mark it as finished.')) {
      return;
    }

    try {
      await backend.workflow.updateVisitStatus(currentVisit.id, 'completed');
      setCurrentVisit({ ...currentVisit, status: 'completed' });
      alert('Visit completed successfully');
      // Reset for new visit
      setCurrentVisit(null);
      setSelectedPatient(null);
      setActiveStage('registration');
      setLabRequests([]);
      setDiagnoses([]);
      setPayments([]);
      setClinicalHistory(null);
    } catch (error) {
      console.error('Error completing visit:', error);
      alert('Failed to complete visit');
    }
  };

  const stages = [
    { id: 'registration', label: 'Registration', icon: UserPlus, completed: !!currentVisit },
    { id: 'history', label: 'Clinical History', icon: FileText, completed: !!clinicalHistory },
    { id: 'lab', label: 'Lab', icon: FlaskConical, completed: labRequests.length > 0 },
    { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope, completed: diagnoses.length > 0 },
    { id: 'pharmacy', label: 'Pharmacy', icon: Pill, completed: false },
    { id: 'payment', label: 'Payment', icon: CreditCard, completed: payments.length > 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Clinic Workflow</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Complete patient visit workflow</p>
        </div>
        {currentVisit && (
          <button
            onClick={handleCompleteVisit}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} />
            Complete Visit
          </button>
        )}
      </div>

      {/* Patient Selection */}
      {!currentVisit && (
        <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Select Patient</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPatient?.id === patient.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-brand-300'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white">{patient.name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{patient.phone}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {patient.conditionType || 'No condition'} • {patient.patientType || 'outpatient'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Stages */}
      {selectedPatient && (
        <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
          {/* Stage Progress */}
          <div className="flex items-center justify-between mb-6 overflow-x-auto pb-4">
            {stages.map((stage, index) => {
              const StageIcon = stage.icon;
              const isActive = activeStage === stage.id;
              const isCompleted = stage.completed;
              const isAccessible = currentVisit || stage.id === 'registration';

              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => isAccessible && setActiveStage(stage.id as any)}
                    disabled={!isAccessible}
                    className={`flex flex-col items-center gap-2 px-4 py-2 rounded-xl transition-all min-w-[120px] ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : isCompleted
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : isAccessible
                        ? 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <StageIcon size={20} />
                    <span className="text-xs font-semibold">{stage.label}</span>
                    {isCompleted && <CheckCircle size={16} className="mt-1" />}
                  </button>
                  {index < stages.length - 1 && (
                    <ChevronRight className="text-slate-400 mx-2" size={20} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Current Patient Info */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{selectedPatient.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedPatient.phone} • Age: {selectedPatient.age} • {selectedPatient.location}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Next clinic appointment:{' '}
                {selectedPatient.nextAppointment
                  ? new Date(selectedPatient.nextAppointment).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Not scheduled'}
              </p>
            </div>
            {currentVisit && (
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Visit ID</div>
                  <div className="text-sm font-mono text-slate-700 dark:text-slate-300">
                    {currentVisit.id.substring(0, 8)}...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stage Content */}
          <div className="mt-6">
            {/* Registration Stage */}
            {activeStage === 'registration' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Registration / Reception</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Visit Type *
                    </label>
                    <select
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      value={visitForm.visitType}
                      onChange={e => setVisitForm({...visitForm, visitType: e.target.value as any})}
                    >
                      <option value="outpatient">Outpatient</option>
                      <option value="inpatient">Inpatient</option>
                      <option value="emergency">Emergency</option>
                      <option value="followup">Follow-up</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Reception Notes
                  </label>
                  <textarea
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none h-24"
                    placeholder="Any notes from reception..."
                    value={visitForm.receptionNotes}
                    onChange={e => setVisitForm({...visitForm, receptionNotes: e.target.value})}
                  />
                </div>
                <button
                  onClick={handleStartVisit}
                  disabled={loading}
                  className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                  Start Visit
                </button>
              </div>
            )}

            {/* Clinical History Stage */}
            {activeStage === 'history' && currentVisit && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Clinical History</h3>
                {clinicalHistory && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-900/30 mb-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle size={18} />
                      <span className="font-semibold">Clinical history saved</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Chief Complaint *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="e.g., Headache for 3 days"
                      value={historyForm.chiefComplaint}
                      onChange={e => setHistoryForm({...historyForm, chiefComplaint: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      History of Present Illness
                    </label>
                    <textarea
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none h-24"
                      placeholder="Detailed history..."
                      value={historyForm.historyOfPresentIllness}
                      onChange={e => setHistoryForm({...historyForm, historyOfPresentIllness: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Past Medical History
                    </label>
                    <textarea
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none h-20"
                      value={historyForm.pastMedicalHistory}
                      onChange={e => setHistoryForm({...historyForm, pastMedicalHistory: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Allergies
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="e.g., Penicillin, Latex"
                      value={historyForm.allergies}
                      onChange={e => setHistoryForm({...historyForm, allergies: e.target.value})}
                    />
                  </div>
                </div>

                {/* Vital Signs */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Vital Signs</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Temperature (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full p-2 rounded-lg bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={historyForm.temperature}
                        onChange={e => setHistoryForm({...historyForm, temperature: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">BP (mmHg)</label>
                      <input
                        type="text"
                        className="w-full p-2 rounded-lg bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="120/80"
                        value={historyForm.bp}
                        onChange={e => setHistoryForm({...historyForm, bp: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Pulse (bpm)</label>
                      <input
                        type="number"
                        className="w-full p-2 rounded-lg bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={historyForm.pulse}
                        onChange={e => setHistoryForm({...historyForm, pulse: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        className="w-full p-2 rounded-lg bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={historyForm.oxygenSaturation}
                        onChange={e => setHistoryForm({...historyForm, oxygenSaturation: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full p-2 rounded-lg bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={historyForm.weight}
                        onChange={e => setHistoryForm({...historyForm, weight: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Height (cm)</label>
                      <input
                        type="number"
                        className="w-full p-2 rounded-lg bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={historyForm.height}
                        onChange={e => setHistoryForm({...historyForm, height: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Physical Examination
                  </label>
                  <textarea
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none h-24"
                    value={historyForm.physicalExamination}
                    onChange={e => setHistoryForm({...historyForm, physicalExamination: e.target.value})}
                  />
                </div>

                <button
                  onClick={handleSaveHistory}
                  disabled={saving || !historyForm.chiefComplaint.trim()}
                  className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Clinical History
                </button>
              </div>
            )}

            {/* Lab Stage */}
            {activeStage === 'lab' && currentVisit && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Lab Requests</h3>
                
                {/* Add Lab Request Form */}
                <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Add Lab Request</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Test Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="e.g., Complete Blood Count"
                        value={labForm.testName}
                        onChange={e => setLabForm({...labForm, testName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Test Type *
                      </label>
                      <select
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={labForm.testType}
                        onChange={e => setLabForm({...labForm, testType: e.target.value as any})}
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
                        Priority *
                      </label>
                      <select
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={labForm.priority}
                        onChange={e => setLabForm({...labForm, priority: e.target.value as any})}
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Clinical Indication
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={labForm.clinicalIndication}
                        onChange={e => setLabForm({...labForm, clinicalIndication: e.target.value})}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddLabRequest}
                    disabled={saving || !labForm.testName.trim()}
                    className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Add Lab Request
                  </button>
                </div>

                {/* Lab Requests List */}
                {labRequests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">Requested Tests</h4>
                    {labRequests.map((lab) => (
                      <div key={lab.id} className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{lab.testName}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {lab.testType} • {lab.priority}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            lab.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                            lab.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                            {lab.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Diagnosis & Plan Stage */}
            {activeStage === 'diagnosis' && currentVisit && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Diagnosis & Follow-up Plan</h3>
                
                {/* Add Diagnosis Form */}
                <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Add Diagnosis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Diagnosis Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="e.g., Hypertension"
                        value={diagnosisForm.diagnosisName}
                        onChange={e => setDiagnosisForm({...diagnosisForm, diagnosisName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        ICD-10 Code
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="e.g., I10"
                        value={diagnosisForm.diagnosisCode}
                        onChange={e => setDiagnosisForm({...diagnosisForm, diagnosisCode: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Type *
                      </label>
                      <select
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={diagnosisForm.diagnosisType}
                        onChange={e => setDiagnosisForm({...diagnosisForm, diagnosisType: e.target.value as any})}
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="differential">Differential</option>
                        <option value="provisional">Provisional</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Severity
                      </label>
                      <select
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={diagnosisForm.severity}
                        onChange={e => setDiagnosisForm({...diagnosisForm, severity: e.target.value as any})}
                      >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Description
                      </label>
                      <textarea
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none h-20"
                        value={diagnosisForm.description}
                        onChange={e => setDiagnosisForm({...diagnosisForm, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={handleAddDiagnosis}
                      disabled={saving || !diagnosisForm.diagnosisName.trim()}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Plus size={16} />
                      Add Diagnosis & Save Plan
                    </button>
                    {/* Next Appointment Planning */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Next Clinic Appointment
                      </label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <input
                          type="date"
                          className="px-3 py-2 rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                          value={nextAppointmentDate}
                          onChange={e => setNextAppointmentDate(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 7);
                              setNextAppointmentDate(d.toISOString().split('T')[0]);
                            }}
                            className="px-2 py-1 text-[11px] rounded-full bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                          >
                            +1 week
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 14);
                              setNextAppointmentDate(d.toISOString().split('T')[0]);
                            }}
                            className="px-2 py-1 text-[11px] rounded-full bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                          >
                            +2 weeks
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setMonth(d.getMonth() + 1);
                              setNextAppointmentDate(d.toISOString().split('T')[0]);
                            }}
                            className="px-2 py-1 text-[11px] rounded-full bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                          >
                            +1 month
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleGetAppointmentSuggestion}
                        disabled={loadingSuggestion}
                        className="mt-2 sm:mt-0 px-3 py-1.5 text-[11px] rounded-full bg-brand-600 hover:bg-brand-700 text-white font-semibold disabled:opacity-60"
                      >
                        {loadingSuggestion ? 'Getting suggestion…' : 'AI Suggest'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Appointment reminders will be generated automatically based on this date.
                  </p>
                  {nextAppointmentSuggestion && (
                    <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                      <p className="text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold">
                        Suggested: {new Date(nextAppointmentSuggestion.date).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="mt-1 text-[11px] text-emerald-900/80 dark:text-emerald-200/80">
                        {nextAppointmentSuggestion.rationale}
                      </p>
                    </div>
                  )}
                </div>

                {/* Diagnoses List */}
                {diagnoses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">Diagnoses</h4>
                    {diagnoses.map((diagnosis) => (
                      <div key={diagnosis.id} className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{diagnosis.diagnosisName}</div>
                            {diagnosis.diagnosisCode && (
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                ICD-10: {diagnosis.diagnosisCode}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {diagnosis.diagnosisType} • {diagnosis.severity}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            diagnosis.status === 'active' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                            diagnosis.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {diagnosis.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pharmacy Stage */}
            {activeStage === 'pharmacy' && currentVisit && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Pharmacy</h3>
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-900/30 text-center">
                  <Pill size={48} className="mx-auto mb-4 text-blue-500" />
                  <p className="text-slate-700 dark:text-slate-300">
                    Pharmacy dispensing is handled through the Pharmacy Dashboard.
                  </p>
                  <button
                    onClick={() => onNavigate('pharmacy_inventory')}
                    className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                  >
                    Go to Pharmacy Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Payment Stage */}
            {activeStage === 'payment' && currentVisit && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Payment</h3>
                
                {/* Add Payment Form */}
                <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Record Payment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Payment Type *
                      </label>
                      <select
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={paymentForm.paymentType}
                        onChange={e => setPaymentForm({...paymentForm, paymentType: e.target.value as any})}
                      >
                        <option value="consultation">Consultation</option>
                        <option value="lab">Lab</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="procedure">Procedure</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Amount (KES) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Payment Method *
                      </label>
                      <select
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={paymentForm.paymentMethod}
                        onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value as any})}
                      >
                        <option value="cash">Cash</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="card">Card</option>
                        <option value="insurance">Insurance</option>
                        <option value="nhif">NHIF</option>
                        <option value="waiver">Waiver</option>
                      </select>
                    </div>
                    {paymentForm.paymentMethod === 'mpesa' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Transaction Reference
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          value={paymentForm.transactionReference}
                          onChange={e => setPaymentForm({...paymentForm, transactionReference: e.target.value})}
                        />
                      </div>
                    )}
                    {paymentForm.paymentMethod === 'insurance' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Insurance Provider
                          </label>
                          <input
                            type="text"
                            className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={paymentForm.insuranceProvider}
                            onChange={e => setPaymentForm({...paymentForm, insuranceProvider: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Insurance Number
                          </label>
                          <input
                            type="text"
                            className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={paymentForm.insuranceNumber}
                            onChange={e => setPaymentForm({...paymentForm, insuranceNumber: e.target.value})}
                          />
                        </div>
                      </>
                    )}
                    {paymentForm.paymentMethod === 'nhif' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          NHIF Number
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          value={paymentForm.nhifNumber}
                          onChange={e => setPaymentForm({...paymentForm, nhifNumber: e.target.value})}
                        />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Notes
                      </label>
                      <textarea
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none h-20"
                        value={paymentForm.notes}
                        onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddPayment}
                    disabled={saving || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                    className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Record Payment
                  </button>
                </div>

                {/* Payments List */}
                {payments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">Payment History</h4>
                    {payments.map((payment) => (
                      <div key={payment.id} className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {payment.paymentType} • KES {payment.amount.toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {payment.paymentMethod}
                              {payment.transactionReference && ` • Ref: ${payment.transactionReference}`}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            payment.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                            payment.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {payment.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-900/30">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">Total Paid:</span>
                        <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                          KES {payments.reduce((sum, p) => sum + (p.paymentStatus === 'paid' ? p.amount : 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
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

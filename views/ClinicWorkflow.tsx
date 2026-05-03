import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Patient, ClinicVisit, ClinicalHistory, LabRequest, Diagnosis, Payment } from '../types';
import { backend } from '../services/backend';
import { 
  UserPlus, Calendar, FileText, FlaskConical, Stethoscope, Pill, CreditCard, 
  CheckCircle, Clock, AlertCircle, Loader2, X, ChevronRight, Plus, Save, Download
} from 'lucide-react';
import { downloadPatientDiagnosisPdf, downloadVisitPaymentSummaryPdf } from '../services/pdfReports';
import { formatPaymentMethodLabel } from '../services/paymentMethodLabels';
import { DepartmentalServicesCatalog } from '../services/departmentalServicesCatalog';
import { LabRequestsPanel, type LabRequestDraft } from '../components/workflow/LabRequestsPanel';

interface ClinicWorkflowProps {
  user: UserProfile;
  onNavigate: (view: string) => void;
}

type HistoryFormState = {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  familyHistory: string;
  socialHistory: string;
  allergies: string;
  currentMedications: string;
  temperature: string;
  bp: string;
  pulse: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
  physicalExamination: string;
};

const EMPTY_HISTORY_FORM: HistoryFormState = {
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
};

/** Map saved clinical history into controlled form fields (JSONB vitals may use camelCase or snake_case). */
function clinicalHistoryToHistoryForm(history: ClinicalHistory): HistoryFormState {
  const v = history.vitalSigns as Record<string, unknown> | undefined;
  const numStr = (n: unknown) => (n != null && n !== '' && Number.isFinite(Number(n)) ? String(n) : '');
  const rr = v?.respiratoryRate ?? v?.respiratory_rate;
  const o2 = v?.oxygenSaturation ?? v?.oxygen_saturation;
  return {
    chiefComplaint: history.chiefComplaint ?? '',
    historyOfPresentIllness: history.historyOfPresentIllness ?? '',
    pastMedicalHistory: history.pastMedicalHistory ?? '',
    familyHistory: history.familyHistory ?? '',
    socialHistory: history.socialHistory ?? '',
    allergies: history.allergies ?? '',
    currentMedications: history.currentMedications ?? '',
    temperature: numStr(v?.temperature),
    bp: String(v?.bp ?? ''),
    pulse: numStr(v?.pulse),
    respiratoryRate: rr != null && rr !== '' ? String(rr) : '',
    oxygenSaturation: o2 != null && o2 !== '' ? String(o2) : '',
    weight: numStr(v?.weight),
    height: numStr(v?.height),
    physicalExamination: history.physicalExamination ?? '',
  };
}

export const ClinicWorkflow: React.FC<ClinicWorkflowProps> = ({ user, onNavigate }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentVisits, setRecentVisits] = useState<ClinicVisit[]>([]);
  const [loadingRecentVisits, setLoadingRecentVisits] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentVisit, setCurrentVisit] = useState<ClinicVisit | null>(null);
  const [activeStage, setActiveStage] = useState<'registration' | 'history' | 'lab' | 'diagnosis' | 'pharmacy' | 'payment'>('registration');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [visitRecordSearch, setVisitRecordSearch] = useState('');
  const [visitStatusFilter, setVisitStatusFilter] = useState<'all' | 'registered' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [visitStartDate, setVisitStartDate] = useState('');
  const [visitEndDate, setVisitEndDate] = useState('');

  // Form states
  const [visitForm, setVisitForm] = useState({
    visitType: 'outpatient' as 'outpatient' | 'inpatient' | 'emergency' | 'followup',
    receptionNotes: '',
  });

  const [historyForm, setHistoryForm] = useState<HistoryFormState>(EMPTY_HISTORY_FORM);

  const [labForm, setLabForm] = useState<LabRequestDraft>({
    search: '',
    selectedIds: [],
    testName: '',
    testType: 'blood',
    priority: 'routine',
    clinicalIndication: '',
    doctorNotes: '',
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
    paymentMethod: 'cash' as 'cash' | 'mpesa' | 'card' | 'insurance' | 'shif' | 'waiver',
    transactionReference: '',
    insuranceProvider: '',
    insuranceNumber: '',
    shifNumber: '',
    notes: '',
  });

  const [paymentPlanDraft, setPaymentPlanDraft] = useState({
    daily: '',
    monthly: '',
    annual: '',
  });

  /** Full bill for treatment; instalments recorded as separate payment lines. */
  const [totalTreatmentInput, setTotalTreatmentInput] = useState('');

  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistory | null>(null);

  /** Registration controls must reflect the loaded visit row (opening a record showed blank despite saved data). */
  useEffect(() => {
    if (!currentVisit) {
      setVisitForm({ visitType: 'outpatient', receptionNotes: '' });
      return;
    }
    setVisitForm({
      visitType: currentVisit.visitType,
      receptionNotes: currentVisit.receptionNotes ?? '',
    });
  }, [currentVisit?.id, currentVisit?.visitType, currentVisit?.receptionNotes]);

  /** History inputs bind to `historyForm` but persistence loads into `clinicalHistory` only — keep them aligned. */
  useEffect(() => {
    const vid = currentVisit?.id;
    if (!vid) {
      setHistoryForm({ ...EMPTY_HISTORY_FORM });
      return;
    }
    if (!clinicalHistory || clinicalHistory.visitId !== vid) {
      setHistoryForm({ ...EMPTY_HISTORY_FORM });
      return;
    }
    setHistoryForm(clinicalHistoryToHistoryForm(clinicalHistory));
  }, [currentVisit?.id, clinicalHistory]);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatient) {
      setPaymentPlanDraft({ daily: '', monthly: '', annual: '' });
      return;
    }
    setPaymentPlanDraft({
      daily:
        selectedPatient.paymentPlanDailyKes != null
          ? String(selectedPatient.paymentPlanDailyKes)
          : '',
      monthly:
        selectedPatient.paymentPlanMonthlyKes != null
          ? String(selectedPatient.paymentPlanMonthlyKes)
          : '',
      annual:
        selectedPatient.paymentPlanAnnualKes != null
          ? String(selectedPatient.paymentPlanAnnualKes)
          : '',
    });
  }, [selectedPatient?.id]);

  useEffect(() => {
    const visitId = currentVisit?.id;
    if (!visitId) return;
    loadVisitData(visitId);
    // Only reload when the active visit id changes - not when setCurrentVisit replaces the
    // same visit with a new object reference (that was resetting "Total treatment" while typing).
  }, [currentVisit?.id]);

  const loadPatients = async () => {
    try {
      const data = await backend.patients.getAll();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadRecentVisits = async () => {
    setLoadingRecentVisits(true);
    try {
      const visits = await backend.workflow.getVisits();
      setRecentVisits(visits);
    } catch (error) {
      console.error('Error loading recent visits:', error);
      setRecentVisits([]);
    } finally {
      setLoadingRecentVisits(false);
    }
  };

  const handleOpenVisitRecord = async (visit: ClinicVisit) => {
    setLoading(true);
    try {
      const visitData = await backend.workflow.getVisitById(visit.id);
      const patient = patients.find((p) => p.id === visit.patientId) || null;
      setSelectedPatient(patient);
      setCurrentVisit(visitData.visit);
      setClinicalHistory(visitData.clinicalHistory || null);
      setLabRequests(visitData.labRequests);
      setDiagnoses(visitData.diagnoses);
      setPayments(visitData.payments);
      setActiveStage('history');
      if (visitData.visit.totalTreatmentAmount != null && visitData.visit.totalTreatmentAmount > 0) {
        setTotalTreatmentInput(String(visitData.visit.totalTreatmentAmount));
      } else {
        setTotalTreatmentInput('');
      }
    } catch (error) {
      console.error('Error opening visit record:', error);
      alert('Could not open this visit record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecentVisits();
  }, []);

  const filteredRecentVisits = useMemo(() => {
    const q = visitRecordSearch.trim().toLowerCase();
    return recentVisits
      .filter((visit) => {
        if (visitStatusFilter !== 'all' && visit.status !== visitStatusFilter) return false;
        if (visitStartDate && visit.visitDate < `${visitStartDate}T00:00:00`) return false;
        if (visitEndDate && visit.visitDate > `${visitEndDate}T23:59:59`) return false;
        if (!q) return true;
        return (
          visit.patientName.toLowerCase().includes(q) ||
          visit.id.toLowerCase().includes(q) ||
          visit.visitType.toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [recentVisits, visitRecordSearch, visitStatusFilter, visitStartDate, visitEndDate]);

  const hasActiveVisitFilters =
    visitRecordSearch.trim().length > 0 ||
    visitStatusFilter !== 'all' ||
    visitStartDate.length > 0 ||
    visitEndDate.length > 0;

  const loadVisitData = async (visitId: string) => {
    try {
      const visitData = await backend.workflow.getVisitById(visitId);
      setCurrentVisit(visitData.visit);
      setClinicalHistory(visitData.clinicalHistory || null);
      setLabRequests(visitData.labRequests);
      setDiagnoses(visitData.diagnoses);
      setPayments(visitData.payments);
      if (visitData.visit.totalTreatmentAmount != null && visitData.visit.totalTreatmentAmount > 0) {
        setTotalTreatmentInput(String(visitData.visit.totalTreatmentAmount));
      } else {
        setTotalTreatmentInput('');
      }
    } catch (error) {
      console.error('Error loading visit data:', error);
    }
  };

  const handleSavePaymentPlans = async () => {
    if (!selectedPatient) return;
    const parseOrNull = (s: string): number | null => {
      const t = s.trim();
      if (!t) return null;
      const n = parseFloat(t);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error('Payment plan values must be valid numbers (KES).');
      }
      return n;
    };

    setSaving(true);
    try {
      const updated: Patient = {
        ...selectedPatient,
        paymentPlanDailyKes: parseOrNull(paymentPlanDraft.daily),
        paymentPlanMonthlyKes: parseOrNull(paymentPlanDraft.monthly),
        paymentPlanAnnualKes: parseOrNull(paymentPlanDraft.annual),
      };
      await backend.patients.add(updated);
      setSelectedPatient(updated);
      alert('Payment plans saved.');
    } catch (e: any) {
      console.error('Error saving payment plans:', e);
      alert(e?.message || 'Failed to save payment plans.');
    } finally {
      setSaving(false);
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
    const missingVitals: string[] = [];
    if (!historyForm.temperature.trim()) missingVitals.push('Temperature (°C)');
    if (!historyForm.bp.trim()) missingVitals.push('Blood pressure (mmHg)');
    if (!historyForm.pulse.trim()) missingVitals.push('Pulse (bpm)');
    if (!historyForm.weight.trim()) missingVitals.push('Weight (kg)');
    if (!historyForm.height.trim()) missingVitals.push('Height (cm)');

    if (!currentVisit || !historyForm.chiefComplaint.trim()) {
      alert('Please fill in at least the chief complaint');
      return;
    }
    if (missingVitals.length > 0) {
      alert(`Vitals are required for every patient: ${missingVitals.join(', ')}.`);
      return;
    }

    setSaving(true);
    try {
      const vitalSigns: any = {};
      const temp = parseFloat(historyForm.temperature);
      const pulse = parseInt(historyForm.pulse, 10);
      const weight = parseFloat(historyForm.weight);
      const height = parseFloat(historyForm.height);
      if (Number.isNaN(temp)) throw new Error('Temperature must be a valid number.');
      if (Number.isNaN(pulse)) throw new Error('Pulse must be a valid number.');
      if (Number.isNaN(weight)) throw new Error('Weight must be a valid number.');
      if (Number.isNaN(height)) throw new Error('Height must be a valid number.');

      vitalSigns.temperature = temp;
      vitalSigns.bp = historyForm.bp.trim();
      vitalSigns.pulse = pulse;
      if (historyForm.respiratoryRate) vitalSigns.respiratoryRate = parseInt(historyForm.respiratoryRate);
      if (historyForm.oxygenSaturation) vitalSigns.oxygenSaturation = parseFloat(historyForm.oxygenSaturation);
      vitalSigns.weight = weight;
      vitalSigns.height = height;
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
      const msg = error instanceof Error ? error.message : 'Failed to save clinical history';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLabRequests = async (
    items: Array<{ name: string; type: 'blood' | 'urine' | 'stool' | 'imaging' | 'other'; category?: string; indication?: string }>,
    priority: 'routine' | 'urgent' | 'stat'
  ) => {
    if (!currentVisit || items.length === 0) return;
    setSaving(true);
    try {
      const created = [];
      for (const it of items) {
        const lr = await backend.workflow.createLabRequest(
          currentVisit.id,
          currentVisit.patientId,
          it.name,
          it.type,
          priority,
          it.indication,
          it.category
        );
        created.push(lr);
      }
      setLabRequests([...labRequests, ...created]);
      alert(created.length > 1 ? 'Lab requests added successfully' : 'Lab request added successfully');
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
    } catch (error) {
      console.error('Error creating diagnosis:', error);
      alert('Failed to add diagnosis');
    } finally {
      setSaving(false);
    }
  };

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
          shifNumber: paymentForm.shifNumber || undefined,
          notes: paymentForm.notes || undefined,
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
        shifNumber: '',
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
      setTotalTreatmentInput('');
    } catch (error) {
      console.error('Error completing visit:', error);
      alert('Failed to complete visit');
    }
  };

  const handleSaveTreatmentTotal = async () => {
    if (!currentVisit) return;
    const raw = totalTreatmentInput.trim();
    const num = raw === '' ? null : parseFloat(raw);
    if (raw !== '' && (Number.isNaN(num!) || num! < 0)) {
      alert('Enter a valid total treatment amount (KES), or leave blank.');
      return;
    }
    setSaving(true);
    try {
      await backend.workflow.updateVisitTreatmentTotal(currentVisit.id, num);
      setCurrentVisit({
        ...currentVisit,
        totalTreatmentAmount: num ?? null,
      });
      alert('Treatment total saved. Record payments as instalments; balance updates automatically.');
    } catch (error) {
      console.error('Error saving treatment total:', error);
      alert('Could not save total. If this persists, apply the Supabase migration for total_treatment_amount on clinic_visits.');
    } finally {
      setSaving(false);
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
          <div className="mb-4">
            <input
              type="text"
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              placeholder="Find returning patient by name or phone…"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Returning patients do not need re-registration. Search here, select a patient, then start the visit.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients
              .filter((p) => {
                const q = patientSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  p.name.toLowerCase().includes(q) ||
                  (p.phone || '').toLowerCase().includes(q)
                );
              })
              .map((patient) => (
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
                  {DepartmentalServicesCatalog.formatIntakeLine(
                    patient.departmentServiceId,
                    patient.departmentSubcategoryId
                  ) ||
                    patient.conditionType ||
                    'No intake'}{' '}
                  • {patient.patientType || 'outpatient'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!currentVisit && (
        <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent visit records</h2>
            <button
              type="button"
              onClick={() => void loadRecentVisits()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Refresh records
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              value={visitRecordSearch}
              onChange={(e) => setVisitRecordSearch(e.target.value)}
              placeholder="Search patient, visit ID, or visit type"
              className="md:col-span-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#2c2c2e] text-sm text-slate-900 dark:text-white"
            />
            <select
              value={visitStatusFilter}
              onChange={(e) => setVisitStatusFilter(e.target.value as any)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#2c2c2e] text-sm text-slate-900 dark:text-white"
            >
              <option value="all">All statuses</option>
              <option value="registered">Registered</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-600 dark:text-slate-300">
                Start date
                <input
                  type="date"
                  value={visitStartDate}
                  onChange={(e) => setVisitStartDate(e.target.value)}
                  className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#2c2c2e] text-xs text-slate-900 dark:text-white"
                />
              </label>
              <label className="text-xs text-slate-600 dark:text-slate-300">
                End date
                <input
                  type="date"
                  value={visitEndDate}
                  onChange={(e) => setVisitEndDate(e.target.value)}
                  className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#2c2c2e] text-xs text-slate-900 dark:text-white"
                />
              </label>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredRecentVisits.length} record{filteredRecentVisits.length === 1 ? '' : 's'}
            </p>
            <button
              type="button"
              disabled={!hasActiveVisitFilters}
              onClick={() => {
                setVisitRecordSearch('');
                setVisitStatusFilter('all');
                setVisitStartDate('');
                setVisitEndDate('');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                hasActiveVisitFilters
                  ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]'
                  : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              Clear filters
            </button>
          </div>
          {loadingRecentVisits ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
              <Loader2 className="animate-spin" size={16} />
              Loading recent records...
            </div>
          ) : filteredRecentVisits.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No visit records found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Visit type</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecentVisits.map((visit) => (
                    <tr key={visit.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3 text-slate-900 dark:text-white">{visit.patientName}</td>
                      <td className="py-2 pr-3 capitalize">{visit.visitType.replace('_', ' ')}</td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                        {new Date(visit.visitDate).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 capitalize text-slate-600 dark:text-slate-300">
                        {visit.status.replace('_', ' ')}
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          onClick={() => void handleOpenVisitRecord(visit)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-black"
                        >
                          Open record
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Workflow Stages */}
      {selectedPatient && (
        <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
          {/* Stage Progress — each card is a navigation control, not just a status bar */}
          <div className="mb-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tap a step to open it. Earlier steps stay available to review what was saved (e.g.
              Registration, Clinical History).
            </p>
          </div>
          <div className="flex items-center justify-between mb-6 overflow-x-auto pb-4">
            {stages.map((stage, index) => {
              const StageIcon = stage.icon;
              const isActive = activeStage === stage.id;
              const isCompleted = stage.completed;
              const isAccessible = currentVisit || stage.id === 'registration';

              return (
                <React.Fragment key={stage.id}>
                  <button
                    type="button"
                    title={
                      !isAccessible
                        ? `${stage.label} (start a visit first)`
                        : isActive
                          ? `${stage.label} (current)`
                          : `${stage.label} — open`
                    }
                    onClick={() => isAccessible && setActiveStage(stage.id as any)}
                    disabled={!isAccessible}
                    className={`flex flex-col items-center gap-2 px-4 py-2 rounded-xl transition-all min-w-[120px] ${
                      !isAccessible
                        ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        : isActive
                        ? 'bg-brand-600 text-white ring-2 ring-brand-400/40 ring-offset-2 ring-offset-white dark:ring-offset-[#1c1c1e]'
                        : isCompleted
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200/90 dark:hover:bg-green-900/35 cursor-pointer'
                        : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'
                    }`}
                  >
                    <StageIcon size={20} />
                    <span className="text-xs font-semibold">{stage.label}</span>
                    {isCompleted && <CheckCircle size={16} className="mt-1" />}
                  </button>
                  {index < stages.length - 1 && (
                    <ChevronRight className="text-slate-400 mx-2 shrink-0 hidden sm:block" size={20} />
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
                  disabled={
                    saving ||
                    !historyForm.chiefComplaint.trim() ||
                    !historyForm.temperature.trim() ||
                    !historyForm.bp.trim() ||
                    !historyForm.pulse.trim() ||
                    !historyForm.weight.trim() ||
                    !historyForm.height.trim()
                  }
                  className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Clinical History
                </button>
              </div>
            )}

            {/* Lab Stage */}
            {activeStage === 'lab' && currentVisit && (
              <LabRequestsPanel
                saving={saving}
                draft={labForm}
                setDraft={setLabForm}
                requested={labRequests}
                facility={user}
                patient={selectedPatient ?? undefined}
                onAddRequests={handleAddLabRequests}
              />
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
                    {selectedPatient && (
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            downloadPatientDiagnosisPdf(user, selectedPatient, diagnoses, {
                              visitDate: currentVisit?.visitDate?.slice(0, 10),
                            })
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold"
                        >
                          <Download size={16} />
                          Download diagnosis PDF
                        </button>
                      </div>
                    )}
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
                    type="button"
                    onClick={() => onNavigate('pharmacy_inventory')}
                    className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                  >
                    Open stock & inventory
                  </button>
                </div>
              </div>
            )}

            {/* Payment Stage */}
            {activeStage === 'payment' && currentVisit && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Payment</h3>

                <div className="p-4 bg-amber-50/80 dark:bg-amber-900/15 rounded-xl border border-amber-200 dark:border-amber-900/40 mb-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Total treatment (optional)</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Set the full bill for this visit, then record each instalment (half, less, or later payments). Balance due is calculated automatically.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Total treatment price (KES)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        name="totalTreatmentKes"
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white relative z-10"
                        placeholder="e.g. 5000"
                        value={totalTreatmentInput}
                        onChange={(e) => setTotalTreatmentInput(e.target.value.replace(/[^\d.]/g, ''))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveTreatmentTotal}
                      disabled={saving}
                      className="px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm disabled:opacity-50"
                    >
                      Save total
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-white dark:bg-[#1c1c1e] rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Patient payment plans</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Optional: set expected daily/monthly/annual plans for this patient (KES).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Daily (KES)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="e.g. 200"
                        value={paymentPlanDraft.daily}
                        onChange={(e) => setPaymentPlanDraft((p) => ({ ...p, daily: e.target.value.replace(/[^\d.]/g, '') }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Monthly (KES)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="e.g. 5000"
                        value={paymentPlanDraft.monthly}
                        onChange={(e) => setPaymentPlanDraft((p) => ({ ...p, monthly: e.target.value.replace(/[^\d.]/g, '') }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Annual (KES)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="e.g. 60000"
                        value={paymentPlanDraft.annual}
                        onChange={(e) => setPaymentPlanDraft((p) => ({ ...p, annual: e.target.value.replace(/[^\d.]/g, '') }))}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleSavePaymentPlans}
                      disabled={saving || !selectedPatient}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-sm disabled:opacity-50"
                    >
                      Save plans
                    </button>
                  </div>
                </div>

                {/* Add Payment Form */}
                <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Record payment instalment</h4>
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
                        <option value="shif">SHIF (Social Health Insurance Fund)</option>
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
                    {paymentForm.paymentMethod === 'shif' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          SHIF number
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          value={paymentForm.shifNumber}
                          onChange={e => setPaymentForm({...paymentForm, shifNumber: e.target.value})}
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
                              {formatPaymentMethodLabel(payment.paymentMethod)}
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
                    <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-900/30 space-y-2">
                      {(() => {
                        const sumPaid = payments.reduce((sum, p) => sum + p.amount, 0);
                        const totalDue =
                          currentVisit.totalTreatmentAmount != null &&
                          currentVisit.totalTreatmentAmount > 0
                            ? currentVisit.totalTreatmentAmount
                            : null;
                        const balance =
                          totalDue != null ? Math.max(0, totalDue - sumPaid) : null;
                        return (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span className="font-bold text-slate-900 dark:text-white">Total treatment</span>
                              <span className="font-mono">
                                {totalDue != null ? `KES ${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '- (set above)'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span className="font-bold text-slate-900 dark:text-white">Amount paid (sum)</span>
                              <span className="font-mono text-brand-600 dark:text-brand-400">
                                KES {sumPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-brand-200 dark:border-brand-800 pt-2">
                              <span className="font-bold text-slate-900 dark:text-white">Balance due</span>
                              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                {balance != null
                                  ? `KES ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '-'}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    {selectedPatient && payments.length > 0 && (
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            downloadVisitPaymentSummaryPdf(
                              user,
                              selectedPatient,
                              payments,
                              currentVisit.totalTreatmentAmount
                            )
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold"
                        >
                          <Download size={16} />
                          Download payment PDF
                        </button>
                      </div>
                    )}
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

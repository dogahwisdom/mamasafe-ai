
import React, { useState, useEffect } from 'react';
import { UserPlus, Calendar, MapPin, CheckCircle, ChevronRight, ChevronLeft, Phone, User, FileText, Lock, Loader2, MessageSquare, AlertCircle, ArrowRight, ShieldAlert, X } from 'lucide-react';
import { Patient, RiskLevel, ConditionType, UserProfile } from '../types';
import { backend } from '../services/backend';
import { DepartmentalServicesCatalog } from '../services/departmentalServicesCatalog';
import { EnrollmentDepartmentPanels } from '../components/enrollment/EnrollmentDepartmentPanels';
import type { EnrollmentFormData } from '../components/enrollment/enrollmentFormTypes';

interface InputGroupProps {
  label: string;
  icon: any;
  children?: React.ReactNode;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, icon: Icon, children }) => (
  <div className="group">
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
    <div className="relative">
      <Icon className="absolute left-4 top-4 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none" size={20} />
      {children}
    </div>
  </div>
);

interface EnrollmentViewProps {
  onAddPatient?: (patient: Patient) => Promise<void>;
  currentFacility?: UserProfile | null;
}

export const EnrollmentView: React.FC<EnrollmentViewProps> = ({
  onAddPatient,
  currentFacility,
}) => {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [checkingPatient, setCheckingPatient] = useState(false);
  const [existingPatient, setExistingPatient] = useState<{
    exists: boolean;
    patientId?: string;
    patientName?: string;
    facilityId?: string;
    facilityName?: string;
    location?: string | null;
  } | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [requestingTransfer, setRequestingTransfer] = useState(false);
  const [primaryFacilityChoice, setPrimaryFacilityChoice] = useState<'current' | 'existing'>('current');
  
  const [formData, setFormData] = useState<EnrollmentFormData>({
    firstName: '',
    lastName: '',
    dob: '',
    nationalId: '',
    phone: '',
    patientType: 'outpatient',
    nokName: '',
    nokPhone: '',
    county: '',
    subCounty: '',
    ward: '',
    departmentServiceId: '',
    departmentSubcategoryId: '',
    gravida: '',
    parity: '',
    lmp: '',
    edd: '',
    gestationalWeeks: '',
    ancProfile: 'Not Started',
    referralHospital: '',
    diagnosisDate: '',
  });

  // Auto-calculate EDD and gestational weeks when LMP changes (ANC path)
  useEffect(() => {
    const anc = DepartmentalServicesCatalog.requiresPregnancyDetails(
      formData.departmentServiceId,
      formData.departmentSubcategoryId
    );
    if (formData.lmp && anc) {
      const lmpDate = new Date(formData.lmp);
      if (!isNaN(lmpDate.getTime())) {
        const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diffTime = now.getTime() - lmpDate.getTime();
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

        setFormData((prev) => ({
          ...prev,
          edd: eddDate.toISOString().split('T')[0],
          gestationalWeeks:
            diffWeeks > 0 && diffWeeks < 45 ? diffWeeks.toString() : prev.gestationalWeeks,
        }));
      }
    }
  }, [formData.lmp, formData.departmentServiceId, formData.departmentSubcategoryId]);

  // Check for existing patient when phone number is entered
  useEffect(() => {
    const checkExistingPatient = async () => {
      if (formData.phone && formData.phone.length >= 10) {
        setCheckingPatient(true);
        try {
          const result = await backend.transfers.findPatientByPhone(formData.phone);
          setExistingPatient(result);
        } catch (error) {
          console.error('Error checking existing patient:', error);
          setExistingPatient({ exists: false });
        } finally {
          setCheckingPatient(false);
        }
      } else {
        setExistingPatient(null);
      }
    };

    const timeoutId = setTimeout(checkExistingPatient, 1000); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.phone]);

  useEffect(() => {
    if (existingPatient?.exists && existingPatient.facilityId) {
      setPrimaryFacilityChoice('current');
      return;
    }
    setPrimaryFacilityChoice('current');
  }, [existingPatient?.exists, existingPatient?.facilityId]);

  /** When an existing record is found, pre-fill county / sub-county from stored location (if fields still empty). */
  useEffect(() => {
    const loc = existingPatient?.location?.trim();
    if (!existingPatient?.exists || !loc) return;

    setFormData((prev) => {
      if (prev.county.trim() && prev.subCounty.trim()) return prev;
      const commaIdx = loc.indexOf(',');
      if (commaIdx === -1) {
        return {
          ...prev,
          county: prev.county.trim() || loc,
          subCounty: prev.subCounty.trim() || loc,
        };
      }
      const countyPart = loc.slice(0, commaIdx).trim();
      const subPart = loc.slice(commaIdx + 1).trim();
      return {
        ...prev,
        county: prev.county.trim() || countyPart,
        subCounty: prev.subCounty.trim() || subPart,
      };
    });
  }, [existingPatient?.exists, existingPatient?.location]);

  const getStepValidationError = (forStep: number): string | null => {
    switch (forStep) {
      case 1:
        if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.dob) {
          return 'Please enter first name, last name, and date of birth.';
        }
        return null;
      case 2: {
        const missing: string[] = [];
        if (!formData.phone?.trim()) missing.push('Patient WhatsApp number');
        if (!formData.county?.trim()) missing.push('County');
        if (!formData.subCounty?.trim()) missing.push('Sub-County / Estate');
        if (formData.patientType === 'inpatient') {
          if (!formData.nokName?.trim()) missing.push('Next of kin name');
          if (!formData.nokPhone?.trim()) missing.push('Next of kin phone');
        }
        if (missing.length > 0) {
          return `Complete the following to continue: ${missing.join(', ')}.`;
        }
        return null;
      }
      case 3:
        if (!formData.departmentServiceId || !formData.departmentSubcategoryId) {
          return 'Please select a department and sub-category.';
        }
        if (
          DepartmentalServicesCatalog.requiresPregnancyDetails(
            formData.departmentServiceId,
            formData.departmentSubcategoryId
          ) &&
          (!formData.gravida || !formData.parity)
        ) {
          return 'Please enter gravida and parity for ANC.';
        }
        return null;
      case 4:
        if (
          DepartmentalServicesCatalog.requiresPregnancyDetails(
            formData.departmentServiceId,
            formData.departmentSubcategoryId
          )
        ) {
          if (!formData.lmp || !formData.gestationalWeeks) {
            return 'Please enter last menstrual period and gestational age.';
          }
        } else if (formData.departmentServiceId) {
          if (!formData.diagnosisDate) {
            return 'Please enter the visit or diagnosis date.';
          }
        } else {
          return 'Please complete intake details.';
        }
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const err = getStepValidationError(step);
    if (err) {
      alert(err);
      return;
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleRequestTransfer = async () => {
    if (!existingPatient?.patientId || !existingPatient.facilityId || !transferReason.trim()) {
      alert('Please provide a reason for the transfer request.');
      return;
    }

    setRequestingTransfer(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('mamasafe_current_user') || '{}');
      
      await backend.transfers.requestTransfer(
        existingPatient.patientId,
        existingPatient.patientName || `${formData.firstName} ${formData.lastName}`,
        formData.phone,
        existingPatient.facilityId,
        existingPatient.facilityName || 'Unknown Facility',
        currentUser.id,
        currentUser.name || 'Current Facility',
        transferReason
      );

      alert('Transfer request sent successfully. The original facility will be notified.');
      setShowTransferModal(false);
      setExistingPatient(null);
      // Continue with enrollment (patient will be transferred once approved)
      setStep(3);
    } catch (error) {
      console.error('Error requesting transfer:', error);
      alert('Failed to send transfer request. Please try again.');
    } finally {
      setRequestingTransfer(false);
    }
  };

  const handlePrev = () => setStep(s => Math.max(s - 1, 1));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consent) {
        alert("Patient consent is required to proceed.");
        return;
    }

    if (onAddPatient) {
        setLoading(true);
        const age = formData.dob 
            ? new Date().getFullYear() - new Date(formData.dob).getFullYear() 
            : 0;

        const anc = DepartmentalServicesCatalog.requiresPregnancyDetails(
          formData.departmentServiceId,
          formData.departmentSubcategoryId
        );
        const mcType: ConditionType = anc ? 'pregnancy' : 'other';

        const newPatient: Patient = {
            id: Date.now().toString(),
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            age: age,
            gestationalWeeks: anc ? (parseInt(formData.gestationalWeeks) || undefined) : undefined,
            location: `${formData.county}${formData.subCounty ? ', ' + formData.subCounty : ''}`,
            phone: formData.phone,
            lastCheckIn: new Date().toISOString().split('T')[0],
            riskStatus: RiskLevel.LOW, // Default low risk until triage
            nextAppointment: '',
            conditionType: mcType,
            departmentServiceId: formData.departmentServiceId || undefined,
            departmentSubcategoryId: formData.departmentSubcategoryId || undefined,
            patientType: formData.patientType,
            medicalConditions: formData.departmentServiceId
              ? [
                  {
                    type: mcType,
                    diagnosisDate: formData.diagnosisDate || undefined,
                  },
                ]
              : undefined,
            alerts: [],
            primaryFacilityId:
              primaryFacilityChoice === 'existing'
                ? existingPatient?.facilityId
                : currentFacility?.id,
            primaryFacilityName:
              primaryFacilityChoice === 'existing'
                ? existingPatient?.facilityName
                : currentFacility?.name,
        };
        
        try {
          await onAddPatient(newPatient);
          setSubmitted(true);
        } catch (error) {
          alert('Failed to enroll patient. Please try again.');
        } finally {
          setLoading(false);
        }
    }
  };

  const inputClasses = "w-full pl-12 p-4 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:bg-white dark:focus:bg-black focus:ring-4 focus:ring-brand-500/10 text-slate-900 dark:text-white font-medium transition-all placeholder-slate-400 outline-none";

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 animate-fade-in">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20 animate-bounce-short">
          <CheckCircle className="w-12 h-12 text-white" strokeWidth={3} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Registration Complete</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md mb-6">
          <span className="font-semibold text-slate-900 dark:text-white">{formData.firstName} {formData.lastName}</span> has been successfully enrolled.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900 mb-8 max-w-md w-full animate-fade-in" style={{ animationDelay: '0.3s' }}>
           <div className="flex items-start gap-3">
              <MessageSquare className="text-blue-500 mt-1" size={20} />
              <div className="text-left">
                 <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Credentials Sent</h4>
                 <p className="text-sm text-blue-700 dark:text-blue-400 leading-snug">
                    An SMS and WhatsApp message has been sent to <strong>{formData.phone}</strong> with their login PIN and app link. They can log in immediately.
                 </p>
              </div>
           </div>
        </div>

        <button 
          onClick={() => { 
            setSubmitted(false); 
            setStep(1); 
            setConsent(false);
            setWhatsappOptIn(false);
            setFormData({
              firstName: '', lastName: '', dob: '', nationalId: '',
              phone: '', patientType: 'outpatient', nokName: '', nokPhone: '', county: '', subCounty: '', ward: '',
              departmentServiceId: '', departmentSubcategoryId: '',
              gravida: '', parity: '',
              lmp: '', edd: '', gestationalWeeks: '', ancProfile: 'Not Started', referralHospital: '',
              diagnosisDate: ''
            });
          }}
          className="px-8 py-3 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-full font-semibold transition-all shadow-lg shadow-brand-500/20"
        >
          Enroll Next Mother
        </button>
      </div>
    );
  }

  // Progress segments
  const steps = [
    { num: 1, label: 'Identity' },
    { num: 2, label: 'Contact' },
    { num: 3, label: 'Condition' },
    { num: 4, label: 'Details' },
    { num: 5, label: 'Consent' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      
      {/* Header & Progress */}
      <div className="mb-6 md:mb-8 text-center">
         <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl md:rounded-full mb-6 md:mb-8">
           {steps.map((s) => (
             <button 
                key={s.num} 
                onClick={() => {
                  if (s.num < step) {
                    setStep(s.num);
                  } else if (s.num === step + 1) {
                    handleNext();
                  }
                }}
                className={`
                  px-3 md:px-6 py-2 rounded-xl md:rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all duration-300 flex-1 md:flex-none
                  ${step === s.num 
                    ? 'bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white shadow-sm scale-105' 
                    : step > s.num
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}
                `}
             >
               {step > s.num ? <span className="flex items-center justify-center gap-1">✓ <span className="hidden md:inline">{s.label}</span></span> : s.label}
             </button>
           ))}
         </div>
         <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Patient Intake</h1>
         <p className="text-slate-500 dark:text-slate-400 mt-2 text-base md:text-lg">Gather clinical & demographic details.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1c1c1e] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/40 relative overflow-hidden border border-slate-100 dark:border-slate-800/50 min-h-[550px]">
        
        {/* Step 1: Personal Identity */}
        <div className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${step === 1 ? 'translate-x-0 opacity-100 z-10' : '-translate-x-full opacity-0 z-0 pointer-events-none'}`}>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><User className="text-brand-500" /> Identity Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label="First Name" icon={User}>
              <input type="text" required className={inputClasses} placeholder="e.g. Amani" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </InputGroup>
            <InputGroup label="Last Name" icon={User}>
              <input type="text" required className={inputClasses} placeholder="e.g. Kamau" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </InputGroup>
            <InputGroup label="National ID / Passport" icon={FileText}>
              <input type="text" className={inputClasses} placeholder="ID Number (Optional)" value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} />
            </InputGroup>
            <InputGroup label="Date of Birth" icon={Calendar}>
              <input type="date" required className={inputClasses} value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </InputGroup>
          </div>
        </div>

        {/* Step 2: Contact & Location */}
        <div className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${step === 2 ? 'translate-x-0 opacity-100 z-10' : step < 2 ? 'translate-x-full opacity-0 pointer-events-none' : '-translate-x-full opacity-0 pointer-events-none'}`}>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><MapPin className="text-brand-500" /> Contact & Location</h3>
          <div className="space-y-6">
             <InputGroup label="Patient WhatsApp Number" icon={Phone}>
                <div className="relative">
                  <input 
                    type="tel" 
                    required 
                    className={inputClasses} 
                    placeholder="+254 7..." 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                  />
                  {checkingPatient && (
                    <div className="absolute right-4 top-4">
                      <Loader2 className="animate-spin text-brand-500" size={18} />
                    </div>
                  )}
                </div>
                {existingPatient?.exists && existingPatient.facilityId && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-900/30 flex items-start gap-3">
                    <AlertCircle className="text-blue-500 mt-0.5" size={18} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                        Existing record found at {existingPatient.facilityName}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        Enrollment is still allowed here. If needed, you can optionally request a transfer to keep care records aligned.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTransferModal(true)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Request transfer (optional)
                        <ArrowRight size={14} />
                      </button>
                      <div className="mt-3">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
                          Primary facility for care coordination
                        </label>
                        <select
                          className="w-full p-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#2c2c2e] text-sm text-slate-900 dark:text-white"
                          value={primaryFacilityChoice}
                          onChange={(e) =>
                            setPrimaryFacilityChoice(e.target.value as 'current' | 'existing')
                          }
                        >
                          <option value="current">
                            {currentFacility?.name || 'Current facility'} (recommended for this intake)
                          </option>
                          <option value="existing">
                            {existingPatient.facilityName || 'Existing facility'} (continuity owner)
                          </option>
                        </select>
                        <p className="text-[11px] text-blue-700/90 dark:text-blue-300/90 mt-1">
                          This setting is for coordination only and does not restrict where the patient can receive care.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
             </InputGroup>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup label="County" icon={MapPin}>
                   <input type="text" required className={inputClasses} placeholder="e.g. Nairobi" value={formData.county} onChange={e => setFormData({...formData, county: e.target.value})} />
                </InputGroup>
                <InputGroup label="Sub-County / Estate" icon={MapPin}>
                   <input type="text" required className={inputClasses} placeholder="e.g. Westlands" value={formData.subCounty} onChange={e => setFormData({...formData, subCounty: e.target.value})} />
                </InputGroup>
             </div>
             {existingPatient?.exists && existingPatient.location && (
               <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                 Location pre-filled from the existing patient record when available — you can edit if needed.
               </p>
             )}

             <div>
               <InputGroup label="Patient Type" icon={User}>
                  <select 
                    required 
                    className={inputClasses} 
                    value={formData.patientType} 
                    onChange={e => setFormData({...formData, patientType: e.target.value as 'outpatient' | 'inpatient'})}
                  >
                    <option value="outpatient">Outpatient</option>
                    <option value="inpatient">Inpatient</option>
                  </select>
               </InputGroup>
               <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-1">
                 Outpatient and inpatient both require county and sub-county above. Inpatient also requires next of kin below.
               </p>
             </div>

             {formData.patientType === 'inpatient' && (
               <div className="p-5 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                 <h4 className="text-orange-800 dark:text-orange-400 font-bold text-sm mb-4 flex items-center gap-2">
                   <ShieldAlert size={16} /> Emergency Contact (Next of Kin) - Required for Inpatient
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" required className="w-full p-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-orange-200 dark:border-orange-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="NOK Name" value={formData.nokName} onChange={e => setFormData({...formData, nokName: e.target.value})} />
                    <input type="tel" required className="w-full p-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-orange-200 dark:border-orange-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="NOK Phone" value={formData.nokPhone} onChange={e => setFormData({...formData, nokPhone: e.target.value})} />
                 </div>
               </div>
             )}
          </div>
        </div>

        <EnrollmentDepartmentPanels
          step={step}
          formData={formData}
          setFormData={setFormData}
          inputClasses={inputClasses}
        />

        {/* Step 5: Consent & Compliance */}
        <div className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${step === 5 ? 'translate-x-0 opacity-100 z-10' : 'translate-x-full opacity-0 pointer-events-none'}`}>
           <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Lock className="text-brand-500" /> Data Consent</h3>
           
           <div className="space-y-6">
              <div className="p-6 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                     In compliance with the <strong>Kenya Data Protection Act</strong>, we require explicit consent to process the patient's personal health information. This data will be used solely for care coordination and emergency response.
                  </p>
                  
                  <label className="flex items-start gap-4 p-4 bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-brand-500 transition-colors">
                     <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${consent ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'}`}>
                        {consent && <CheckCircle className="text-white" size={16} strokeWidth={3} />}
                     </div>
                     <input type="checkbox" className="hidden" checked={consent} onChange={e => setConsent(e.target.checked)} />
                     <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        I confirm that the patient has provided informed consent for MamaSafe AI to process their medical data.
                     </span>
                  </label>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                     The platform uses WhatsApp to send automated appointment reminders and health tips.
                  </p>
                  
                  <label className="flex items-start gap-4 p-4 bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-brand-500 transition-colors">
                     <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${whatsappOptIn ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-600'}`}>
                        {whatsappOptIn && <CheckCircle className="text-white" size={16} strokeWidth={3} />}
                     </div>
                     <input type="checkbox" className="hidden" checked={whatsappOptIn} onChange={e => setWhatsappOptIn(e.target.checked)} />
                     <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Patient opts-in to receive health alerts via WhatsApp.
                     </span>
                  </label>
              </div>
           </div>
        </div>

        {/* Navigation Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-white via-white to-transparent dark:from-[#1c1c1e] dark:via-[#1c1c1e] pt-12 flex justify-between items-center z-20">
          <button 
             type="button" 
             onClick={handlePrev} 
             disabled={step === 1 || loading}
             className={`p-4 rounded-full transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2c2c2e] hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
             <ChevronLeft size={24} />
          </button>
          
          {step < 5 ? (
             <button type="button" onClick={handleNext} className="group flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-xl text-sm md:text-base">
               Next Step <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
             </button>
          ) : (
             <button 
               type="submit" 
               disabled={!consent || loading}
               className={`group flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 rounded-full font-bold transition-all shadow-lg text-sm md:text-base ${consent ? 'bg-brand-600 text-white hover:bg-brand-500 active:scale-95 shadow-brand-500/30' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             >
               {loading ? <Loader2 className="animate-spin" /> : 'Complete Enrollment'}
             </button>
          )}
        </div>

      </form>

      {/* Transfer Request Modal */}
      {showTransferModal && existingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Patient Transfer Request</h2>
              <button 
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferReason('');
                }}
                className="p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-900/30">
                <p className="text-sm text-orange-800 dark:text-orange-300 mb-2">
                  <strong>{existingPatient.patientName}</strong> is already enrolled at <strong>{existingPatient.facilityName}</strong>.
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  This transfer is optional and is used to align records between facilities. You can continue enrollment without requesting it.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Reason for Transfer *
                </label>
                <textarea
                  required
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 text-slate-900 dark:text-white outline-none resize-none h-32"
                  placeholder="e.g. Patient moved to this area and prefers to continue care at this facility..."
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferReason('');
                  }}
                  className="flex-1 px-6 py-3 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestTransfer}
                  disabled={requestingTransfer || !transferReason.trim()}
                  className="flex-1 px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {requestingTransfer ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={18} />
                      Request Transfer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

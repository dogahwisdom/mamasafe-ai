
import React, { useState, useEffect } from 'react';
import { UserPlus, Calendar, MapPin, CheckCircle, ChevronRight, ChevronLeft, Phone, User, Activity, Heart, FileText, Baby, Droplet, ShieldAlert, Lock, CheckSquare, Loader2, MessageSquare } from 'lucide-react';
import { Patient, RiskLevel } from '../types';

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
}

export const EnrollmentView: React.FC<EnrollmentViewProps> = ({ onAddPatient }) => {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  
  // Comprehensive State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    firstName: '',
    lastName: '',
    dob: '',
    nationalId: '',
    
    // Step 2: Contact & Location
    phone: '',
    nokName: '',
    nokPhone: '',
    county: '',
    subCounty: '',
    ward: '',
    
    // Step 3: Medical History
    gravida: '', // Total pregnancies including current
    parity: '',  // Previous viable births
    bloodGroup: '',
    rhesus: '',
    previousComplications: '',
    
    // Step 4: Current Pregnancy
    lmp: '',
    edd: '', // Estimated Date of Delivery
    gestationalWeeks: '',
    ancProfile: 'Not Started', // Started, Not Started
    referralHospital: ''
  });

  // Auto-calculate EDD and Gestational Weeks when LMP changes
  useEffect(() => {
    if (formData.lmp) {
      const lmpDate = new Date(formData.lmp);
      if (!isNaN(lmpDate.getTime())) {
        // EDD = LMP + 280 days (40 weeks)
        const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
        
        // Weeks = (Now - LMP) / 7 days
        const now = new Date();
        const diffTime = now.getTime() - lmpDate.getTime();
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

        setFormData(prev => ({
          ...prev,
          edd: eddDate.toISOString().split('T')[0],
          gestationalWeeks: diffWeeks > 0 && diffWeeks < 45 ? diffWeeks.toString() : prev.gestationalWeeks
        }));
      }
    }
  }, [formData.lmp]);

  const validateCurrentStep = () => {
    switch (step) {
      case 1: // Identity
        return formData.firstName && formData.lastName && formData.dob;
      case 2: // Contact
        return formData.phone && formData.county && formData.subCounty && formData.nokName && formData.nokPhone;
      case 3: // History
        return formData.gravida && formData.parity && formData.bloodGroup && formData.rhesus;
      case 4: // Pregnancy
        return formData.lmp && formData.gestationalWeeks;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep(s => Math.min(s + 1, 5));
    } else {
      alert("Please fill in all required fields to proceed.");
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
            
        const nextAppt = new Date();
        nextAppt.setDate(nextAppt.getDate() + 30); // Default to 1 month from now

        const newPatient: Patient = {
            id: Date.now().toString(),
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            age: age,
            gestationalWeeks: parseInt(formData.gestationalWeeks) || 0,
            location: `${formData.county}${formData.subCounty ? ', ' + formData.subCounty : ''}`,
            phone: formData.phone,
            lastCheckIn: new Date().toISOString().split('T')[0],
            riskStatus: RiskLevel.LOW, // Default low risk until triage
            nextAppointment: nextAppt.toISOString().split('T')[0],
            alerts: []
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
              phone: '', nokName: '', nokPhone: '', county: '', subCounty: '', ward: '',
              gravida: '', parity: '', bloodGroup: '', rhesus: '', previousComplications: '',
              lmp: '', edd: '', gestationalWeeks: '', ancProfile: 'Not Started', referralHospital: ''
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
    { num: 3, label: 'History' },
    { num: 4, label: 'Pregnancy' },
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
                <input type="tel" required className={inputClasses} placeholder="+254 7..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
             </InputGroup>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup label="County" icon={MapPin}>
                   <input type="text" required className={inputClasses} placeholder="e.g. Nairobi" value={formData.county} onChange={e => setFormData({...formData, county: e.target.value})} />
                </InputGroup>
                <InputGroup label="Sub-County / Estate" icon={MapPin}>
                   <input type="text" required className={inputClasses} placeholder="e.g. Westlands" value={formData.subCounty} onChange={e => setFormData({...formData, subCounty: e.target.value})} />
                </InputGroup>
             </div>

             <div className="p-5 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
               <h4 className="text-orange-800 dark:text-orange-400 font-bold text-sm mb-4 flex items-center gap-2">
                 <ShieldAlert size={16} /> Emergency Contact (Next of Kin)
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" required className="w-full p-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-orange-200 dark:border-orange-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="NOK Name" value={formData.nokName} onChange={e => setFormData({...formData, nokName: e.target.value})} />
                  <input type="tel" required className="w-full p-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-orange-200 dark:border-orange-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="NOK Phone" value={formData.nokPhone} onChange={e => setFormData({...formData, nokPhone: e.target.value})} />
               </div>
             </div>
          </div>
        </div>

        {/* Step 3: Obstetric History */}
        <div className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${step === 3 ? 'translate-x-0 opacity-100 z-10' : step < 3 ? 'translate-x-full opacity-0 pointer-events-none' : '-translate-x-full opacity-0 pointer-events-none'}`}>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><FileText className="text-brand-500" /> Obstetric History</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
               <InputGroup label="Gravida (Total Pregnancies)" icon={Activity}>
                  <input type="number" min="1" required className={inputClasses} placeholder="e.g. 2" value={formData.gravida} onChange={e => setFormData({...formData, gravida: e.target.value})} />
               </InputGroup>
               <InputGroup label="Parity (Viable Births)" icon={Baby}>
                  <input type="number" min="0" required className={inputClasses} placeholder="e.g. 1" value={formData.parity} onChange={e => setFormData({...formData, parity: e.target.value})} />
               </InputGroup>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
               <InputGroup label="Blood Group" icon={Droplet}>
                  <select required className={inputClasses} value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}>
                     <option value="">Select...</option>
                     <option value="A">A</option>
                     <option value="B">B</option>
                     <option value="AB">AB</option>
                     <option value="O">O</option>
                  </select>
               </InputGroup>
               <InputGroup label="Rhesus Factor" icon={Activity}>
                  <select required className={inputClasses} value={formData.rhesus} onChange={e => setFormData({...formData, rhesus: e.target.value})}>
                     <option value="">Select...</option>
                     <option value="Positive">Positive (+)</option>
                     <option value="Negative">Negative (-)</option>
                  </select>
               </InputGroup>
            </div>

            <InputGroup label="Previous Complications" icon={ShieldAlert}>
               <textarea 
                  className="w-full pl-12 p-4 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] border-transparent focus:border-brand-500/50 focus:bg-white dark:focus:bg-black focus:ring-4 focus:ring-brand-500/10 text-slate-900 dark:text-white font-medium transition-all placeholder-slate-400 outline-none resize-none h-24" 
                  placeholder="e.g. C-Section, PPH, Pre-eclampsia (Optional)"
                  value={formData.previousComplications}
                  onChange={e => setFormData({...formData, previousComplications: e.target.value})}
               />
            </InputGroup>
          </div>
        </div>

        {/* Step 4: Current Pregnancy */}
        <div className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${step === 4 ? 'translate-x-0 opacity-100 z-10' : step < 4 ? 'translate-x-full opacity-0 pointer-events-none' : '-translate-x-full opacity-0 pointer-events-none'}`}>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Heart className="text-brand-500" /> Current Pregnancy</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="Last Menstrual Period (LMP)" icon={Calendar}>
                <input type="date" required className={inputClasses} value={formData.lmp} onChange={e => setFormData({...formData, lmp: e.target.value})} />
              </InputGroup>
              <InputGroup label="Expected Delivery (EDD)" icon={Calendar}>
                <input type="date" readOnly className={`${inputClasses} bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-500`} value={formData.edd} />
              </InputGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <InputGroup label="Gestational Age (Weeks)" icon={Activity}>
                  <input 
                     type="number" 
                     min="0" 
                     max="45" 
                     required
                     className={inputClasses} 
                     placeholder="Auto-calculated from LMP"
                     value={formData.gestationalWeeks} 
                     onChange={e => setFormData({...formData, gestationalWeeks: e.target.value})}
                  />
               </InputGroup>
               <InputGroup label="ANC Profile Status" icon={FileText}>
                  <select className={inputClasses} value={formData.ancProfile} onChange={e => setFormData({...formData, ancProfile: e.target.value})}>
                     <option value="Not Started">Not Started</option>
                     <option value="Started">Started</option>
                     <option value="Defaulted">Defaulted</option>
                  </select>
               </InputGroup>
            </div>
          </div>
        </div>

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
    </div>
  );
};

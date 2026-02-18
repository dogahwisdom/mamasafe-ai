
import React, { useState, useEffect } from 'react';
import { analyzeSymptoms } from '../services/triageAnalysisService';
import { TriageResult, RiskLevel, UserProfile } from '../types';
import { backend } from '../services/backend';
import { Stethoscope, Send, Activity, MessageCircle, HeartPulse, ShieldCheck, Thermometer, Phone, Copy, Check } from 'lucide-react';

interface TriageViewProps {
  user?: UserProfile | null;
}

export const TriageView: React.FC<TriageViewProps> = ({ user }) => {
  const [symptoms, setSymptoms] = useState('');
  const [gestationalAge, setGestationalAge] = useState(24);
  const [patientPhone, setPatientPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  
  // New state for editing the AI response
  const [editableDraft, setEditableDraft] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-fill for logged-in patients
  useEffect(() => {
    if (user?.role === 'patient' && user.patientData) {
        setGestationalAge(user.patientData.gestationWeeks);
        setPatientPhone(user.phone);
    }
  }, [user]);

  const handleAnalyze = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    setResult(null); // Clear previous result to show loading state correctly if re-analyzing
    try {
      const analysis = await analyzeSymptoms(symptoms, gestationalAge);
      setResult(analysis);
      setEditableDraft(analysis.draftResponse);

      // Log AI conversation for billing
      try {
        const patientId = user?.role === 'patient' ? user.id : undefined;
        await backend.aiUsage.logConversation(
          'triage',
          'web',
          symptoms,
          analysis.draftResponse,
          0, // tokens - would be calculated from actual AI response
          0, // cost - would be calculated based on tokens
          patientId,
          {
            riskLevel: analysis.riskLevel,
            gestationalAge,
            reasoning: analysis.reasoning,
          }
        );
      } catch (error) {
        console.warn('Error logging AI conversation:', error);
        // Don't block the UI if logging fails
      }

      // AUTOMATION: If Risk is High/Critical, notify clinic immediately
      if (user && (analysis.riskLevel === RiskLevel.HIGH || analysis.riskLevel === RiskLevel.CRITICAL)) {
         const patientId = user.id;
         const patientName = user.name;
         
         // Create task for clinic
         await backend.clinic.addTask({
             id: Date.now().toString(),
             patientId,
             patientName,
             type: 'Triage Alert',
             deadline: 'Immediate',
             resolved: false,
             notes: `Risk Assessment: ${analysis.riskLevel}. Symptoms: ${symptoms.substring(0, 50)}...`,
             timestamp: Date.now()
         });

         // Create referral if high-risk
         const toFacility = analysis.riskLevel === RiskLevel.CRITICAL 
           ? 'Level 4/5 Hospital - Immediate Referral'
           : 'Level 3 Hospital - Urgent Assessment';
         
         try {
           await backend.referrals.createFromTriage(
             patientId,
             analysis.reasoning,
             toFacility
           );
         } catch (error) {
           console.error('Failed to create referral:', error);
           // Don't block the UI if referral creation fails
         }
      }

    } catch (error) {
      alert("Failed to analyze symptoms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getWhatsappLink = () => {
    if (!editableDraft) return '#';
    const text = encodeURIComponent(editableDraft);
    const phone = patientPhone.replace(/\D/g, '');
    return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  const copyToClipboard = () => {
    if (!editableDraft) return;
    navigator.clipboard.writeText(editableDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:h-[calc(100vh-160px)]">
      
      {/* Input Section - Styled like Apple Notes/Messages */}
      <div className="flex flex-col h-full min-h-[500px]">
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-black/20 flex flex-col h-full border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3.5 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600 dark:text-brand-400">
              <Stethoscope size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Triage</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">AI Symptom Checker</p>
            </div>
          </div>

          <div className="space-y-6 flex-1 flex flex-col">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Gestational Age Slider */}
               <div className="bg-slate-50 dark:bg-[#2c2c2e] p-5 rounded-2xl">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Gestational Age</label>
                    <span className="text-brand-600 dark:text-brand-400 font-bold bg-white dark:bg-black px-3 py-1 rounded-full text-xs shadow-sm border border-slate-100 dark:border-slate-800">
                      {gestationalAge} Wks
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" max="42" 
                    value={gestationalAge} 
                    onChange={e => setGestationalAge(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                  />
               </div>

               {/* Phone Input */}
               <div className="bg-slate-50 dark:bg-[#2c2c2e] p-5 rounded-2xl">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Patient Phone</label>
                  <div className="flex items-center gap-2">
                     <Phone size={16} className="text-slate-400" />
                     <input 
                        type="tel" 
                        placeholder="Optional" 
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        readOnly={user?.role === 'patient'}
                        className={`bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white font-bold w-full p-0 text-sm placeholder-slate-400 ${user?.role === 'patient' ? 'cursor-default' : ''}`}
                     />
                  </div>
               </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[150px]">
               <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">Reported Symptoms</label>
               <textarea 
                  className="flex-1 w-full p-6 rounded-3xl bg-amber-50/50 dark:bg-[#2c2c2e] border-none focus:ring-0 resize-none transition-all text-lg leading-relaxed text-slate-800 dark:text-slate-200 placeholder-slate-400 font-medium"
                  placeholder="Describe symptoms here..."
                  style={{ fontFamily: 'ui-rounded, system-ui, sans-serif' }}
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
               />
            </div>
          </div>
          
          <button 
            onClick={handleAnalyze}
            disabled={loading || !symptoms}
            className={`
              mt-6 w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-lg
              ${loading || !symptoms 
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-[0.98] shadow-slate-900/20'}
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2"><Activity className="animate-spin" /> Analyzing...</span>
            ) : (
              <>Analyze Symptoms <Send size={20} className="ml-1" /></>
            )}
          </button>
        </div>
      </div>

      {/* Output Section - Apple Health Summary Card */}
      <div className="flex flex-col h-full min-h-[400px]">
        {result ? (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-8 shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-black/30 flex-1 overflow-y-auto animate-slide-up border border-slate-100 dark:border-slate-800/50 relative">
            
            {/* Header / Risk Level */}
            <div className="flex flex-col items-center mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
               <div className={`
                 w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-xl
                 ${result.riskLevel === RiskLevel.CRITICAL || result.riskLevel === RiskLevel.HIGH 
                   ? 'bg-red-500 shadow-red-500/30' 
                   : result.riskLevel === RiskLevel.MEDIUM 
                   ? 'bg-orange-500 shadow-orange-500/30'
                   : 'bg-green-500 shadow-green-500/30'
                 }
               `}>
                  {result.riskLevel === RiskLevel.LOW ? <ShieldCheck className="text-white w-10 h-10" /> : <HeartPulse className="text-white w-10 h-10 animate-pulse" />}
               </div>
               <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{result.riskLevel} Risk</h3>
               <p className="text-slate-500 font-medium mt-1">Assessment Complete</p>
               {(result.riskLevel === RiskLevel.HIGH || result.riskLevel === RiskLevel.CRITICAL) && (
                 <div className="mt-3 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs font-bold rounded-full animate-pulse">
                    Alert Sent to Clinic
                 </div>
               )}
            </div>

            <div className="space-y-6">
              {/* Reasoning */}
              <div className="bg-slate-50 dark:bg-[#2c2c2e] p-6 rounded-3xl">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Activity size={14} /> Clinical Reasoning
                </h4>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {result.reasoning}
                </p>
              </div>

              {/* Action */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Thermometer size={14} /> Recommended Action
                </h4>
                <p className="text-slate-900 dark:text-white text-lg font-bold">
                  {result.recommendedAction}
                </p>
              </div>

              {/* Draft Message (Editable Chatbot) */}
              <div>
                <div className="flex justify-between items-center mb-3 ml-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Draft WhatsApp Response</h4>
                    <button 
                        onClick={copyToClipboard} 
                        className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline"
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
                
                <div className="relative">
                    <textarea 
                        value={editableDraft}
                        onChange={(e) => setEditableDraft(e.target.value)}
                        className="w-full p-5 bg-[#DCF8C6] dark:bg-[#075E54] rounded-3xl rounded-tl-none shadow-sm text-slate-800 dark:text-white leading-relaxed text-sm min-h-[120px] focus:ring-2 focus:ring-green-500/50 outline-none resize-none font-medium"
                    />
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-8 h-8 bg-white dark:bg-[#1c1c1e] rounded-full flex items-center justify-center shadow-sm pointer-events-none">
                        <MessageCircle size={16} className="text-green-600 dark:text-green-400" />
                    </div>
                </div>
                
                <a 
                  href={getWhatsappLink()}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                >
                  <Send size={16} /> Open WhatsApp
                </a>
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full bg-slate-50/50 dark:bg-[#1c1c1e] rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-slate-100 dark:bg-[#2c2c2e] rounded-full flex items-center justify-center mb-6">
               <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500">Ready to Analyze</h3>
            <p className="max-w-xs mx-auto mt-2 text-sm text-slate-400 dark:text-slate-600">
              Input patient details on the left to generate an AI assessment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

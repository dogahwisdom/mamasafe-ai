
import React, { useState, useEffect } from 'react';
import { ActionCard } from '../components/ActionCard';
import { backend } from '../services/backend';
import { Users, AlertTriangle, Calendar, Activity, ChevronRight, Building2, TrendingUp, CheckCircle, Clock, Workflow, FlaskConical, CreditCard, Stethoscope, FileText, Bot, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Patient, UserProfile, Task, ClinicVisit } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { AgeGroupReport } from '../components/reports/AgeGroupReport';
import { FinancialReportsPanel } from '../components/reports/FinancialReportsPanel';
import { PermissionsManager } from '../components/admin/PermissionsManager';

// Mock Data for Analytics
const visitData = [
  { name: 'Mon', visits: 12 },
  { name: 'Tue', visits: 19 },
  { name: 'Wed', visits: 15 },
  { name: 'Thu', visits: 22 },
  { name: 'Fri', visits: 28 },
  { name: 'Sat', visits: 18 },
  { name: 'Sun', visits: 10 },
];

interface DashboardProps {
  onNavigate: (view: string) => void;
  user?: UserProfile;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-[#2c2c2e]/90 backdrop-blur-md p-3 rounded-xl shadow-xl border border-slate-100 dark:border-black/50 text-xs">
        <p className="font-semibold text-slate-500 mb-1">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">
          {payload[0].value} <span className="text-xs font-normal text-slate-500">{payload[0].dataKey === 'rate' ? '%' : 'visits'}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const DashboardView: React.FC<DashboardProps> = ({ onNavigate, user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [earlyEnrollmentRate, setEarlyEnrollmentRate] = useState<number | null>(null);
  const [followup24hRate, setFollowup24hRate] = useState<number | null>(null);
  const [engagementRate, setEngagementRate] = useState<number | null>(null);
  const [todayVisits, setTodayVisits] = useState<number>(0);
  const [pendingLabRequests, setPendingLabRequests] = useState<number>(0);
  const [completedLabTests, setCompletedLabTests] = useState<number>(0);
  const [totalLabTests, setTotalLabTests] = useState<number>(0);
  const [todayPayments, setTodayPayments] = useState<number>(0);
  const [activeVisits, setActiveVisits] = useState<ClinicVisit[]>([]);
  const [totalDiagnoses, setTotalDiagnoses] = useState<number>(0);
  const [completedVisits, setCompletedVisits] = useState<number>(0);
  const [aiConversationsToday, setAiConversationsToday] = useState<number>(0);
  const [resolvedTasksToday, setResolvedTasksToday] = useState<number>(0);
  const [totalAiCost, setTotalAiCost] = useState<number>(0);
  const [visitAgeCounts, setVisitAgeCounts] = useState({
    under5: 0,
    '5to18': 0,
    above18: 0,
    above35: 0,
  });
  const [financialReports, setFinancialReports] = useState({
    week: { totalKes: 0, byMethod: {} as Record<string, number> },
    month: { totalKes: 0, byMethod: {} as Record<string, number> },
    year: { totalKes: 0, byMethod: {} as Record<string, number> },
  });
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const [taskData, patients] = await Promise.all([
          backend.clinic.getTasks(),
          backend.patients.getAll(),
        ]);
        setTasks(taskData);

        // Load workflow data with error handling
        let visits: ClinicVisit[] = [];
        try {
          visits = await backend.workflow.getVisits();
        } catch (error) {
          console.warn('Could not load visits (workflow tables may not exist yet):', error);
          // Set defaults if workflow tables don't exist
          setTodayVisits(0);
          setActiveVisits([]);
          setPendingLabRequests(0);
          setCompletedLabTests(0);
          setTotalLabTests(0);
          setTodayPayments(0);
          setTotalDiagnoses(0);
          setCompletedVisits(0);
        }
        
        // Calculate workflow metrics
        const today = new Date().toISOString().split('T')[0];
        const todayVisitsCount = visits.filter(v => v.visitDate.startsWith(today)).length;
        setTodayVisits(todayVisitsCount);
        
        const inProgressVisits = visits.filter(v => v.status === 'in_progress' || v.status === 'registered');
        setActiveVisits(inProgressVisits);
        
        // Get lab requests and payments for today (more efficient query)
        const todayVisitIds = visits.filter(v => v.visitDate.startsWith(today)).map(v => v.id);
        const allVisitIds = visits.map(v => v.id);
        
        if (isSupabaseConfigured() && todayVisitIds.length > 0) {
          try {
            const { data: labRequestsData } = await supabase
              .from('lab_requests')
              .select('id, status')
              .in('visit_id', todayVisitIds);
            
            const pending = labRequestsData?.filter(lr => lr.status === 'requested').length || 0;
            const completed = labRequestsData?.filter(lr => lr.status === 'completed').length || 0;
            const total = labRequestsData?.length || 0;
            
            setPendingLabRequests(pending);
            setCompletedLabTests(completed);
            setTotalLabTests(total);
            
            const { data: paymentsData } = await supabase
              .from('payments')
              .select('amount, payment_status')
              .in('visit_id', todayVisitIds)
              .eq('payment_status', 'paid');
            
            const totalPayments = paymentsData?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
            setTodayPayments(totalPayments);
          } catch (error) {
            console.warn('Error loading lab/payment data:', error);
            setPendingLabRequests(0);
            setCompletedLabTests(0);
            setTotalLabTests(0);
            setTodayPayments(0);
          }
        } else {
          setPendingLabRequests(0);
          setCompletedLabTests(0);
          setTotalLabTests(0);
          setTodayPayments(0);
        }

        // Financial reports: weekly/monthly/annual by payment method.
        if (isSupabaseConfigured() && user?.id) {
          try {
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - 7);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYear = new Date(now.getFullYear(), 0, 1);

            const ranges = [
              { key: 'week' as const, from: startOfWeek },
              { key: 'month' as const, from: startOfMonth },
              { key: 'year' as const, from: startOfYear },
            ];

            const nextReports: any = { week: { totalKes: 0, byMethod: {} }, month: { totalKes: 0, byMethod: {} }, year: { totalKes: 0, byMethod: {} } };

            for (const r of ranges) {
              const { data: payRows, error: payErr } = await supabase
                .from('payments')
                .select('amount, payment_method, payment_status, payment_date, facility_id')
                .eq('facility_id', user.id)
                .eq('payment_status', 'paid')
                .gte('payment_date', r.from.toISOString());

              if (payErr) throw payErr;
              const by: Record<string, number> = {};
              let total = 0;
              for (const row of payRows || []) {
                const amt = parseFloat(String((row as any).amount));
                if (!Number.isFinite(amt)) continue;
                const method = String((row as any).payment_method || 'unknown');
                by[method] = (by[method] || 0) + amt;
                total += amt;
              }
              nextReports[r.key] = { totalKes: total, byMethod: by };
            }
            setFinancialReports(nextReports);
          } catch (e) {
            console.warn('Failed to load financial reports:', e);
            setFinancialReports({
              week: { totalKes: 0, byMethod: {} },
              month: { totalKes: 0, byMethod: {} },
              year: { totalKes: 0, byMethod: {} },
            });
          }
        }

        // Get total diagnoses and completed visits
        if (isSupabaseConfigured() && allVisitIds.length > 0) {
          try {
            const { data: diagnosesData } = await supabase
              .from('diagnoses')
              .select('id')
              .in('visit_id', allVisitIds);
            
            setTotalDiagnoses(diagnosesData?.length || 0);

            const completed = visits.filter(v => v.status === 'completed').length;
            setCompletedVisits(completed);
          } catch (error) {
            console.warn('Error loading diagnoses:', error);
            setTotalDiagnoses(0);
            setCompletedVisits(0);
          }
        } else {
          setTotalDiagnoses(0);
          setCompletedVisits(0);
        }

        if (patients.length) {
          // Calculate early enrollment rate based on condition type
          // For pregnancy: gestational weeks <= 16
          // For other conditions: enrolled within first month of diagnosis
          const now = new Date();
          const early = patients.filter((p: Patient) => {
            if (p.conditionType === 'pregnancy') {
              return p.gestationalWeeks && p.gestationalWeeks <= 16;
            } else if (p.medicalConditions && p.medicalConditions.length > 0) {
              const firstCondition = p.medicalConditions[0];
              if (firstCondition.diagnosisDate) {
                const diagnosisDate = new Date(firstCondition.diagnosisDate);
                const daysDiff = Math.floor((now.getTime() - diagnosisDate.getTime()) / (1000 * 60 * 60 * 24));
                return daysDiff <= 30; // Enrolled within 30 days of diagnosis
              }
            }
            return false;
          });
          const earlyRate = Math.round((early.length / patients.length) * 100);
          setEarlyEnrollmentRate(earlyRate);

          const allMeds = patients.flatMap((p) => p.medications || []);
          if (allMeds.length) {
            const avgAdherence =
              allMeds.reduce((sum, m) => sum + (m.adherenceRate || 0), 0) /
              allMeds.length;
            setEngagementRate(Math.round(avgAdherence));
          } else {
            setEngagementRate(null);
          }
        } else {
          setEarlyEnrollmentRate(null);
          setEngagementRate(null);
        }

        // Patient reports: age groups derived from workflow visits.
        try {
          const ageByPatientId = new Map<string, number>();
          for (const p of patients) {
            if (typeof p.age === 'number' && Number.isFinite(p.age)) {
              ageByPatientId.set(p.id, p.age);
            }
          }
          let under5 = 0;
          let fiveTo18 = 0;
          let above18 = 0;
          let above35 = 0;
          for (const v of visits) {
            const age = ageByPatientId.get(v.patientId);
            if (age == null) continue;
            if (age < 5) under5 += 1;
            if (age >= 5 && age <= 18) fiveTo18 += 1;
            if (age > 18) above18 += 1;
            if (age >= 35) above35 += 1;
          }
          setVisitAgeCounts({
            under5,
            '5to18': fiveTo18,
            above18,
            above35,
          });
        } catch (e) {
          console.warn('Failed to compute age-group report:', e);
          setVisitAgeCounts({ under5: 0, '5to18': 0, above18: 0, above35: 0 });
        }

        const missed = taskData.filter((t) => t.type === 'Missed Visit');
        if (missed.length) {
          const within24 = missed.filter(
            (t) => t.resolved && t.resolvedAt && t.resolvedAt - t.timestamp <= 24 * 60 * 60 * 1000
          );
          const rate = Math.round((within24.length / missed.length) * 100);
          setFollowup24hRate(rate);
        } else {
          setFollowup24hRate(null);
        }

        // Keep generating reminder rows for WhatsApp/SMS cron; dashboard does not list them (Option A).
        try {
          await backend.reminders.generateDailyReminders();
        } catch (e) {
          console.warn('generateDailyReminders failed (non-blocking):', e);
        }

        // Load AI usage and resolved tasks stats
        try {
          const today = new Date().toISOString().split('T')[0];
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];

          const [aiStats, resolvedStats] = await Promise.all([
            backend.aiUsage.getUsageStats(today, tomorrowStr),
            backend.aiUsage.getResolvedTasksStats(today, tomorrowStr),
          ]);

          setAiConversationsToday(aiStats.totalConversations);
          setTotalAiCost(aiStats.totalCostUsd);
          setResolvedTasksToday(resolvedStats.totalResolved);
        } catch (error) {
          console.warn('Error loading AI usage stats:', error);
          // Set defaults if AI tracking not available
          setAiConversationsToday(0);
          setTotalAiCost(0);
          setResolvedTasksToday(0);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    loadData();
  }, []);

  const resolveTask = async (id: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, resolved: true } : t));
    await backend.clinic.resolveTask(id);
  };

  const activeTasks = tasks.filter(t => !t.resolved);

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-5">
           <div className="hidden md:flex h-16 w-16 bg-white dark:bg-[#2c2c2e] rounded-2xl items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative">
             {user?.avatar ? (
                <img src={user.avatar} alt="Clinic Logo" className="w-full h-full object-cover" />
             ) : (
                <Building2 size={32} className="text-brand-600 dark:text-brand-500" />
             )}
           </div>
           <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.name || 'MamaSafe Clinic'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-lg">
                Clinic Manager: {user?.facilityData?.managerName || 'Admin'}
              </p>
           </div>
        </div>
        <div className="text-sm font-semibold text-slate-500 bg-white/50 dark:bg-[#1c1c1e] px-4 py-2 rounded-full backdrop-blur-md border border-slate-100 dark:border-slate-800">
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
        </div>
      </div>

      {/* KPI Cards - Aligned with Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <ActionCard 
          title="Tasks Due" 
          value={activeTasks.length}
          subtitle="Critical follow-ups"
          icon={AlertTriangle} 
          variant={activeTasks.length > 0 ? "alert" : "default"}
        />
        <ActionCard 
          title="24h Follow-up" 
          value={followup24hRate !== null ? `${followup24hRate}%` : '—'} 
          subtitle="Response within 24h"
          icon={Clock} 
          variant="brand"
        />
         <ActionCard 
          title="Early Enrollment" 
          value={earlyEnrollmentRate !== null ? `${earlyEnrollmentRate}%` : '—'} 
          subtitle="Timely registration rate"
          icon={Calendar} 
          variant="default"
        />
         <ActionCard 
          title="Engagement" 
          value={engagementRate !== null ? `${engagementRate}%` : '—'} 
          subtitle="Patient response rate"
          icon={Activity} 
          variant="default"
          onClick={() => onNavigate('patients')}
        />
      </div>

      {/* Workflow Overview */}
      <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Today's Workflow</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time clinic operations</p>
          </div>
          <button
            onClick={() => onNavigate('workflow')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <Workflow size={18} />
            Start Visit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{todayVisits}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Visits Today</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Workflow className="text-yellow-600 dark:text-yellow-400" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{activeVisits.length}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Active Visits</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FlaskConical className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalLabTests}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Lab Tests</div>
                {completedLabTests > 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {completedLabTests} completed
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CreditCard className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {todayPayments > 0 ? `KES ${(todayPayments / 1000).toFixed(0)}K` : 'KES 0'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Payments Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <FlaskConical className="text-orange-600 dark:text-orange-400" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{completedLabTests}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Tests Completed</div>
                {pendingLabRequests > 0 && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {pendingLabRequests} pending
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Stethoscope className="text-indigo-600 dark:text-indigo-400" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalDiagnoses}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Diagnoses</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <CheckCircle className="text-teal-600 dark:text-teal-400" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{completedVisits}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Completed Visits</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <FileText className="text-pink-600 dark:text-pink-400" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalLabTests > 0 ? Math.round((completedLabTests / totalLabTests) * 100) : 0}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Test Completion Rate</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <AgeGroupReport
            counts={visitAgeCounts}
            subtitle="Derived from workflow visits (counts by age at enrollment for patients visible to this facility)."
          />
        </div>

        <div className="mt-6">
          <FinancialReportsPanel data={financialReports} />
        </div>

        {user && <div className="mt-6"><PermissionsManager currentUser={user} /></div>}

        {/* AI Usage & Resolved Tasks Section */}
        <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI Usage & Task Resolution</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track AI conversations and resolved tasks for billing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Bot className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{aiConversationsToday}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">AI Conversations Today</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{resolvedTasksToday}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Tasks Resolved Today</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <DollarSign className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${totalAiCost.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">AI Cost Today</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {activeVisits.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Active Visits</h4>
            <div className="space-y-2">
              {activeVisits.slice(0, 3).map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => onNavigate('workflow')}
                  className="p-3 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#3a3a3c] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{visit.patientName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {visit.visitType} • {new Date(visit.registrationTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      visit.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {visit.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1c1c1e] p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex justify-between items-center mb-8">
             <div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Clinic Analytics</h3>
               <p className="text-sm text-slate-500 font-medium">Weekly Patient Visits Trend</p>
             </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitData}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 12}} dy={10} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="visits" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task tracker + patient entry (reminder queue hidden; generation still runs above) */}
        <div className="bg-white dark:bg-[#1c1c1e] p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col border border-slate-100 dark:border-slate-800/50 max-h-[520px]">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Action Items</h3>
             <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-md">{activeTasks.length} PENDING</span>
           </div>
           
           <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
             {activeTasks.length > 0 ? activeTasks.map((task) => (
               <div 
                  key={task.id} 
                  className="group relative p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#2c2c2e] hover:shadow-md transition-all"
               >
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${task.type === 'High Risk' ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`} />
                       <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{task.type}</span>
                    </div>
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                       <Clock size={12} /> {task.deadline}
                    </span>
                 </div>
                 
                 <h4 className="font-bold text-slate-900 dark:text-white">{task.patientName}</h4>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{task.notes}</p>
                 
                 <button 
                   onClick={() => resolveTask(task.id)}
                   className="w-full py-2 bg-white dark:bg-black border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 transition-all flex items-center justify-center gap-2"
                 >
                   <CheckCircle size={14} /> Mark Resolved
                 </button>
               </div>
             )) : (
               <div className="text-center py-10 opacity-50">
                 <CheckCircle size={48} className="mx-auto mb-2 text-green-500" />
                 <p className="text-sm font-bold">All caught up!</p>
               </div>
             )}
           </div>
           
           <button onClick={() => onNavigate('patients')} className="w-full mt-6 py-3.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-[#2c2c2e] rounded-xl hover:bg-slate-200 transition-colors">
             View All Patients
           </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Superadmin Service
 * 
 * Provides system-wide analytics, monitoring, and management capabilities
 * for the MamaSafe AI team.
 */

import { Patient, UserProfile, Task, Reminder, RefillRequest } from '../../types';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { storage, KEYS } from './shared';

export interface SystemMetrics {
  totalPatients: number;
  totalClinics: number;
  totalPharmacies: number;
  activeUsers: number;
  enrollmentsToday: number;
  enrollmentsThisWeek: number;
  enrollmentsThisMonth: number;
  highRiskPatients: number;
  pendingTasks: number;
  pendingRefills: number;
  pendingReminders: number;
  // Workflow metrics
  visitsToday: number;
  activeVisits: number;
  pendingLabRequests: number;
  totalPaymentsToday: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

export interface FacilityMetrics {
  id: string;
  name: string;
  type: 'clinic' | 'pharmacy';
  location: string;
  patientCount: number;
  activeTasks: number;
  lastActivity: string;
  status: 'active' | 'inactive';
}

export interface EnrollmentTrend {
  date: string;
  count: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface GeographicDistribution {
  location: string;
  patientCount: number;
  clinicCount: number;
  pharmacyCount: number;
}

export class SuperadminService {
  /**
   * Get comprehensive system metrics
   */
  public async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      if (isSupabaseConfigured()) {
        const [
          patients,
          clinics,
          pharmacies,
          tasks,
          refills,
          reminders,
        ] = await Promise.all([
          this.getAllPatients(),
          this.getAllClinics(),
          this.getAllPharmacies(),
          this.getAllTasks(),
          this.getAllRefills(),
          this.getAllReminders(),
        ]);


        // Calculate enrollments based on created_at
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get patients with created_at from database
        const { data: patientsWithDates } = await supabase
          .from('patients')
          .select('created_at')
          .order('created_at', { ascending: false });

        let enrollmentsToday = 0;
        let enrollmentsThisWeek = 0;
        let enrollmentsThisMonth = 0;

        if (patientsWithDates) {
          patientsWithDates.forEach((p: any) => {
            if (p.created_at) {
              const createdDate = new Date(p.created_at);
              if (createdDate >= todayStart) {
                enrollmentsToday++;
              }
              if (createdDate >= weekAgo) {
                enrollmentsThisWeek++;
              }
              if (createdDate >= monthAgo) {
                enrollmentsThisMonth++;
              }
            }
          });
        }

        const highRiskPatients = patients.filter(
          p => p.riskStatus === 'High' || p.riskStatus === 'Critical'
        ).length;

        const pendingTasks = tasks.filter(t => !t.resolved).length;
        const pendingRefills = refills.filter(r => r.status === 'pending').length;
        const pendingReminders = reminders.filter(r => !r.sent).length;

        // Get workflow metrics
        const today = new Date().toISOString().split('T')[0];
        const { data: visitsToday } = await supabase
          .from('clinic_visits')
          .select('id, status')
          .gte('visit_date', today);

        const { data: activeVisits } = await supabase
          .from('clinic_visits')
          .select('id')
          .in('status', ['registered', 'in_progress']);

        const { data: pendingLabs } = await supabase
          .from('lab_requests')
          .select('id')
          .eq('status', 'requested');

        const { data: paymentsToday } = await supabase
          .from('payments')
          .select('amount, payment_status')
          .gte('payment_date', today)
          .eq('payment_status', 'paid');

        const totalPaymentsToday = paymentsToday?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

        // Check system health
        let systemHealth: 'healthy' | 'degraded' | 'down' = 'healthy';
        try {
          const { error: healthCheck } = await supabase.from('users').select('id').limit(1);
          if (healthCheck) {
            systemHealth = 'degraded';
          }
        } catch {
          systemHealth = 'down';
        }

        return {
          totalPatients: patients.length,
          totalClinics: clinics.length,
          totalPharmacies: pharmacies.length,
          activeUsers: clinics.length + pharmacies.length + patients.length,
          enrollmentsToday,
          enrollmentsThisWeek,
          enrollmentsThisMonth,
          highRiskPatients,
          pendingTasks,
          pendingRefills,
          pendingReminders,
          visitsToday: visitsToday?.length || 0,
          activeVisits: activeVisits?.length || 0,
          pendingLabRequests: pendingLabs?.length || 0,
          totalPaymentsToday: totalPaymentsToday,
          systemHealth,
        };
      }

      // Fallback to localStorage
      const patients = storage.get<Patient[]>(KEYS.PATIENTS, []);
      return {
        totalPatients: patients.length,
        totalClinics: 0,
        totalPharmacies: 0,
        activeUsers: patients.length,
        enrollmentsToday: 0,
        enrollmentsThisWeek: 0,
        enrollmentsThisMonth: 0,
        highRiskPatients: patients.filter(
          p => p.riskStatus === 'High' || p.riskStatus === 'Critical'
        ).length,
        pendingTasks: 0,
        pendingRefills: 0,
        pendingReminders: 0,
        systemHealth: 'healthy',
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw error;
    }
  }

  /**
   * Get all facilities (clinics and pharmacies)
   */
  public async getFacilities(): Promise<FacilityMetrics[]> {
    try {
      if (isSupabaseConfigured()) {
        const clinics = await this.getAllClinics();
        const pharmacies = await this.getAllPharmacies();
        const patients = await this.getAllPatients();
        const tasks = await this.getAllTasks();

        const facilities: FacilityMetrics[] = [];

        // Process clinics
        for (const clinic of clinics) {
          // Get actual patient count for this clinic from database
          // Patients are linked to clinics via location matching (no direct clinic_id foreign key)
          // Using location-based matching to count patients for this clinic
          const { data: clinicPatientsData } = await supabase
            .from('patients')
            .select('id, created_at, updated_at, location')
            .ilike('location', `%${clinic.location || ''}%`);

          const clinicPatientCount = clinicPatientsData?.length || 0;

          // Get tasks for patients belonging to this clinic directly from database
          const clinicPatientIds = clinicPatientsData?.map((p: any) => p.id) || [];
          let clinicTaskCount = 0;
          
          if (clinicPatientIds.length > 0) {
            const { data: clinicTasksData } = await supabase
              .from('tasks')
              .select('id, updated_at, created_at')
              .in('patient_id', clinicPatientIds)
              .eq('resolved', false);
            
            clinicTaskCount = clinicTasksData?.length || 0;
          }

          // Get last activity from most recent patient update, task, or clinic update
          let lastActivity = clinic.updated_at || clinic.created_at || new Date().toISOString();
          
          if (clinicPatientsData && clinicPatientsData.length > 0) {
            const mostRecentPatient = clinicPatientsData
              .sort((a: any, b: any) => {
                const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
                const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
                return dateB - dateA;
              })[0];
            const patientLastActivity = mostRecentPatient.updated_at || mostRecentPatient.created_at;
            if (patientLastActivity && new Date(patientLastActivity) > new Date(lastActivity)) {
              lastActivity = patientLastActivity;
            }
          }

          // Also check tasks for more recent activity
          if (clinicPatientIds.length > 0) {
            const { data: recentTasks } = await supabase
              .from('tasks')
              .select('updated_at, created_at')
              .in('patient_id', clinicPatientIds)
              .order('updated_at', { ascending: false })
              .limit(1);
            
            if (recentTasks && recentTasks.length > 0) {
              const taskActivity = recentTasks[0].updated_at || recentTasks[0].created_at;
              if (taskActivity && new Date(taskActivity) > new Date(lastActivity)) {
                lastActivity = taskActivity;
              }
            }
          }

          facilities.push({
            id: clinic.id,
            name: clinic.name,
            type: 'clinic',
            location: clinic.location || 'Unknown',
            patientCount: clinicPatientCount,
            activeTasks: clinicTaskCount,
            lastActivity,
            status: 'active',
          });
        }

        // Process pharmacies
        for (const pharmacy of pharmacies) {
          // Get refill requests for this pharmacy (if we had pharmacy_id, for now use all pending refills)
          const { data: refillData } = await supabase
            .from('refill_requests')
            .select('created_at, updated_at')
            .eq('status', 'pending')
            .order('updated_at', { ascending: false })
            .limit(1);

          // Get last activity from pharmacy update or most recent refill request
          let lastActivity = pharmacy.updated_at || pharmacy.created_at || new Date().toISOString();
          
          if (refillData && refillData.length > 0) {
            const refillActivity = refillData[0].updated_at || refillData[0].created_at;
            if (refillActivity && new Date(refillActivity) > new Date(lastActivity)) {
              lastActivity = refillActivity;
            }
          }

          facilities.push({
            id: pharmacy.id,
            name: pharmacy.name,
            type: 'pharmacy',
            location: pharmacy.location || 'Unknown',
            patientCount: 0, // Pharmacies don't have direct patient relationships
            activeTasks: 0,
            lastActivity,
            status: 'active',
          });
        }

        return facilities;
      }

      return [];
    } catch (error) {
      console.error('Error getting facilities:', error);
      return [];
    }
  }

  /**
   * Get enrollment trends
   */
  public async getEnrollmentTrends(days: number = 30): Promise<EnrollmentTrend[]> {
    try {
      if (isSupabaseConfigured()) {
        const { data: patients } = await supabase
          .from('patients')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1000);

        if (!patients) return [];

        const trends: { [key: string]: number } = {};
        const now = new Date();

        for (let i = 0; i < days; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          trends[dateKey] = 0;
        }

        patients.forEach((p: any) => {
          if (p.created_at) {
            const dateKey = p.created_at.split('T')[0];
            if (trends[dateKey] !== undefined) {
              trends[dateKey]++;
            }
          }
        });

        return Object.entries(trends)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }

      return [];
    } catch (error) {
      console.error('Error getting enrollment trends:', error);
      return [];
    }
  }

  /**
   * Get risk distribution
   */
  public async getRiskDistribution(): Promise<RiskDistribution> {
    try {
      const patients = await this.getAllPatients();
      
      return {
        low: patients.filter(p => p.riskStatus === 'Low').length,
        medium: patients.filter(p => p.riskStatus === 'Medium').length,
        high: patients.filter(p => p.riskStatus === 'High').length,
        critical: patients.filter(p => p.riskStatus === 'Critical').length,
      };
    } catch (error) {
      console.error('Error getting risk distribution:', error);
      return { low: 0, medium: 0, high: 0, critical: 0 };
    }
  }

  /**
   * Get geographic distribution
   */
  public async getGeographicDistribution(): Promise<GeographicDistribution[]> {
    try {
      const patients = await this.getAllPatients();
      const clinics = await this.getAllClinics();
      const pharmacies = await this.getAllPharmacies();

      const distribution: { [key: string]: GeographicDistribution } = {};

      patients.forEach(p => {
        const location = p.location.split(',')[0].trim(); // Get county
        if (!distribution[location]) {
          distribution[location] = {
            location,
            patientCount: 0,
            clinicCount: 0,
            pharmacyCount: 0,
          };
        }
        distribution[location].patientCount++;
      });

      clinics.forEach(c => {
        const location = c.location?.split(',')[0].trim() || 'Unknown';
        if (!distribution[location]) {
          distribution[location] = {
            location,
            patientCount: 0,
            clinicCount: 0,
            pharmacyCount: 0,
          };
        }
        distribution[location].clinicCount++;
      });

      pharmacies.forEach(p => {
        const location = p.location?.split(',')[0].trim() || 'Unknown';
        if (!distribution[location]) {
          distribution[location] = {
            location,
            patientCount: 0,
            clinicCount: 0,
            pharmacyCount: 0,
          };
        }
        distribution[location].pharmacyCount++;
      });

      return Object.values(distribution).sort((a, b) => b.patientCount - a.patientCount);
    } catch (error) {
      console.error('Error getting geographic distribution:', error);
      return [];
    }
  }

  /**
   * Get all patients
   */
  public async getAllPatients(): Promise<Patient[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          medications (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patients:', error);
        return [];
      }

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        gestationalWeeks: p.gestational_weeks,
        location: p.location,
        phone: p.phone,
        lastCheckIn: p.last_check_in || '',
        riskStatus: p.risk_status,
        nextAppointment: p.next_appointment || '',
        alerts: (p.alerts as any) || [],
        medications: (p.medications || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          time: m.time,
          instructions: m.instructions || '',
          type: m.type,
          adherenceRate: m.adherence_rate,
          taken: m.taken,
        })),
      }));
    }

    return storage.get<Patient[]>(KEYS.PATIENTS, []);
  }

  /**
   * Get all clinics
   */
  private async getAllClinics(): Promise<UserProfile[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'clinic');

      if (error) {
        console.error('Error fetching clinics:', error);
        return [];
      }

      return (data || []).map((u: any) => ({
        id: u.id,
        role: 'clinic' as const,
        name: u.name,
        phone: u.phone,
        email: u.email,
        location: u.location,
        countryCode: u.country_code,
        facilityData: u.facility_data ? JSON.parse(JSON.stringify(u.facility_data)) : undefined,
      }));
    }

    const users = storage.get<UserProfile[]>(KEYS.USERS, []);
    return users.filter(u => u.role === 'clinic');
  }

  /**
   * Get all pharmacies
   */
  private async getAllPharmacies(): Promise<UserProfile[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'pharmacy');

      if (error) {
        console.error('Error fetching pharmacies:', error);
        return [];
      }

      return (data || []).map((u: any) => ({
        id: u.id,
        role: 'pharmacy' as const,
        name: u.name,
        phone: u.phone,
        email: u.email,
        location: u.location,
        countryCode: u.country_code,
        facilityData: u.facility_data ? JSON.parse(JSON.stringify(u.facility_data)) : undefined,
      }));
    }

    const users = storage.get<UserProfile[]>(KEYS.USERS, []);
    return users.filter(u => u.role === 'pharmacy');
  }

  /**
   * Get all tasks
   */
  public async getAllTasks(): Promise<Task[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        patientId: t.patient_id,
        patientName: t.patient_name,
        type: t.type as Task['type'],
        deadline: t.deadline,
        resolved: t.resolved,
        notes: t.notes,
        timestamp: t.timestamp,
        resolvedAt: t.resolved_at,
      }));
    }

    return storage.get<Task[]>(KEYS.CLINIC_TASKS, []);
  }

  /**
   * Get all refills
   */
  private async getAllRefills(): Promise<RefillRequest[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('refill_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching refills:', error);
        return [];
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        patientName: r.patient_name,
        initials: r.initials || r.patient_name.split(' ').map((n: string) => n[0]).join(''),
        medication: r.medication,
        dosage: r.dosage,
        duration: r.duration,
        status: r.status as 'pending' | 'dispensed',
        requestTime: r.request_time || r.created_at,
      }));
    }

    return storage.get<RefillRequest[]>(KEYS.REFILLS, []);
  }

  /**
   * Get all reminders
   */
  private async getAllReminders(): Promise<Reminder[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('scheduled_for', { ascending: false });

      if (error) {
        console.error('Error fetching reminders:', error);
        return [];
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        patientId: r.patient_id,
        patientName: r.patient_name,
        phone: r.phone,
        channel: r.channel as 'whatsapp' | 'sms',
        type: r.type as 'appointment' | 'medication' | 'symptom_checkin',
        message: r.message,
        scheduledFor: r.scheduled_for,
        sent: r.sent,
        sentAt: r.sent_at,
      }));
    }

    return storage.get<Reminder[]>(KEYS.REMINDERS, []);
  }

  /**
   * Search patients across all facilities
   */
  public async searchPatients(query: string): Promise<Patient[]> {
    const patients = await this.getAllPatients();
    const lowerQuery = query.toLowerCase();
    
    return patients.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.phone.includes(query) ||
      p.location.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get patient by ID (across all facilities)
   */
  public async getPatientById(patientId: string): Promise<Patient | null> {
    const patients = await this.getAllPatients();
    return patients.find(p => p.id === patientId) || null;
  }
}

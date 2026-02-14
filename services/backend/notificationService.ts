import { Alert, UserProfile, Patient, Task, RefillRequest, Reminder, RiskLevel } from '../../types';
import { backend } from '../backend';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

export class NotificationService {
  /**
   * Get notifications for a specific user based on their role
   */
  public async getNotifications(user: UserProfile): Promise<Alert[]> {
    const notifications: Alert[] = [];

    try {
      const authService = new AuthService();
      const patientService = new PatientService();
      const clinicService = new ClinicService();
      const pharmacyService = new PharmacyService();
      const reminderService = new ReminderService();

      if (user.role === 'patient') {
        notifications.push(...await this.getPatientNotifications(user, patientService));
      } else if (user.role === 'clinic') {
        notifications.push(...await this.getClinicNotifications(clinicService, patientService, reminderService));
      } else if (user.role === 'pharmacy') {
        notifications.push(...await this.getPharmacyNotifications(pharmacyService));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }

    // Sort by timestamp (newest first) and severity
    return notifications.sort((a, b) => {
      // Critical first, then warning, then info
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  /**
   * Get notifications for patient role
   */
  private async getPatientNotifications(user: UserProfile, patientService: PatientService): Promise<Alert[]> {
    const notifications: Alert[] = [];

    if (!user.patientData) return notifications;

    try {
      // Get patient record
      const patients = await patientService.getAll();
      const patient = patients.find(p => p.id === user.id);

      if (patient) {
        // Patient alerts from database
        if (patient.alerts && Array.isArray(patient.alerts)) {
          patient.alerts.forEach((alert: Alert) => {
            if (!alert.resolved) {
              notifications.push({
                ...alert,
                timestamp: alert.timestamp || new Date().toISOString(),
              });
            }
          });
        }

        // Upcoming appointment reminders
        if (patient.nextAppointment) {
          const appointmentDate = new Date(patient.nextAppointment);
          const now = new Date();
          const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (hoursUntil > 0 && hoursUntil <= 24) {
            const appointmentTime = appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            notifications.push({
              id: `appt_${patient.id}`,
              type: 'system',
              message: `Your next ANC visit is ${hoursUntil <= 1 ? 'in less than an hour' : `tomorrow at ${appointmentTime}`}.`,
              timestamp: new Date().toISOString(),
              severity: hoursUntil <= 1 ? 'warning' : 'info',
              resolved: false,
            });
          }
        }

        // Medication reminders
        if (patient.medications && patient.medications.length > 0) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();

          patient.medications.forEach((med) => {
            // Parse medication time (e.g., "08:00 AM")
            const timeMatch = med.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeMatch) {
              let medHour = parseInt(timeMatch[1]);
              const medMinute = parseInt(timeMatch[2]);
              const period = timeMatch[3].toUpperCase();

              if (period === 'PM' && medHour !== 12) medHour += 12;
              if (period === 'AM' && medHour === 12) medHour = 0;

              // Check if medication time is within the last 2 hours and not taken
              const medTime = new Date();
              medTime.setHours(medHour, medMinute, 0, 0);
              const hoursSince = (now.getTime() - medTime.getTime()) / (1000 * 60 * 60);

              if (!med.taken && hoursSince >= 0 && hoursSince <= 2) {
                notifications.push({
                  id: `med_${med.id}`,
                  type: 'medication',
                  message: `Time to take your ${med.name} (${med.dosage}).`,
                  timestamp: medTime.toISOString(),
                  severity: hoursSince > 1 ? 'warning' : 'info',
                  resolved: false,
                });
              }
            }
          });
        }

        // High risk status alert
        if (patient.riskStatus === RiskLevel.HIGH || patient.riskStatus === RiskLevel.CRITICAL) {
          notifications.push({
            id: `risk_${patient.id}`,
            type: 'symptom',
            message: `Your risk status is ${patient.riskStatus}. Please contact your healthcare provider.`,
            timestamp: new Date().toISOString(),
            severity: patient.riskStatus === RiskLevel.CRITICAL ? 'critical' : 'warning',
            resolved: false,
          });
        }
      }
    } catch (error) {
      console.error('Error getting patient notifications:', error);
    }

    return notifications;
  }

  /**
   * Get notifications for clinic role
   */
  private async getClinicNotifications(clinicService: ClinicService, patientService: PatientService, reminderService: ReminderService): Promise<Alert[]> {
    const notifications: Alert[] = [];

    try {
      // Get tasks
      const tasks = await clinicService.getTasks();
      const activeTasks = tasks.filter(t => !t.resolved);

      // High priority tasks
      const highRiskTasks = activeTasks.filter(t => t.type === 'High Risk' || t.type === 'Triage Alert');
      highRiskTasks.forEach((task) => {
        notifications.push({
          id: `task_${task.id}`,
          type: task.type === 'Triage Alert' ? 'symptom' : 'system',
          message: `${task.patientName}: ${task.type} - ${task.notes || 'Requires immediate attention'}`,
          timestamp: new Date(task.timestamp).toISOString(),
          severity: 'critical',
          resolved: false,
        });
      });

      // Missed visit tasks
      const missedVisits = activeTasks.filter(t => t.type === 'Missed Visit');
      missedVisits.forEach((task) => {
        notifications.push({
          id: `missed_${task.id}`,
          type: 'missed_appointment',
          message: `${task.patientName} missed their ANC visit.`,
          timestamp: new Date(task.timestamp).toISOString(),
          severity: 'warning',
          resolved: false,
        });
      });

      // Get patients with high risk status
      const patients = await patientService.getAll();
      const highRiskPatients = patients.filter(
        p => (p.riskStatus === RiskLevel.HIGH || p.riskStatus === RiskLevel.CRITICAL) && 
        !activeTasks.some(t => t.patientId === p.id && (t.type === 'High Risk' || t.type === 'Triage Alert'))
      );

      highRiskPatients.forEach((patient) => {
        notifications.push({
          id: `risk_patient_${patient.id}`,
          type: 'symptom',
          message: `${patient.name} has ${patient.riskStatus} risk status and needs attention.`,
          timestamp: new Date().toISOString(),
          severity: patient.riskStatus === RiskLevel.CRITICAL ? 'critical' : 'warning',
          resolved: false,
        });
      });

      // Pending reminders count
      const reminders = await reminderService.getPending();
      if (reminders.length > 0) {
        notifications.push({
          id: 'pending_reminders',
          type: 'system',
          message: `${reminders.length} reminder${reminders.length !== 1 ? 's' : ''} pending to be sent.`,
          timestamp: new Date().toISOString(),
          severity: reminders.length > 10 ? 'warning' : 'info',
          resolved: false,
        });
      }
    } catch (error) {
      console.error('Error getting clinic notifications:', error);
    }

    return notifications;
  }

  /**
   * Get notifications for pharmacy role
   */
  private async getPharmacyNotifications(pharmacyService: PharmacyService): Promise<Alert[]> {
    const notifications: Alert[] = [];

    try {
      // Get refill requests
      const refills = await pharmacyService.getRefills();
      const pendingRefills = refills.filter(r => r.status === 'pending');

      // New refill requests (within last hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      pendingRefills.forEach((refill) => {
        const requestTime = new Date(refill.requestTime).getTime();
        if (requestTime > oneHourAgo) {
          notifications.push({
            id: `refill_${refill.id}`,
            type: 'system',
            message: `New prescription request from ${refill.patientName}: ${refill.medication}`,
            timestamp: refill.requestTime,
            severity: 'info',
            resolved: false,
          });
        }
      });

      // Get inventory
      const inventory = await pharmacyService.getInventory();
      const lowStockItems = inventory.filter(item => item.stock <= item.minLevel);

      // Low stock alerts
      lowStockItems.forEach((item) => {
        notifications.push({
          id: `stock_${item.id}`,
          type: 'system',
          message: `Low stock alert: ${item.name} (${item.stock} ${item.unit} remaining).`,
          timestamp: new Date().toISOString(),
          severity: item.stock === 0 ? 'critical' : 'warning',
          resolved: false,
        });
      });

      // High pending refills count
      if (pendingRefills.length > 5) {
        notifications.push({
          id: 'high_pending_refills',
          type: 'system',
          message: `${pendingRefills.length} pending refill requests require attention.`,
          timestamp: new Date().toISOString(),
          severity: 'warning',
          resolved: false,
        });
      }
    } catch (error) {
      console.error('Error getting pharmacy notifications:', error);
    }

    return notifications;
  }

  /**
   * Mark notification as resolved
   */
  public async markAsResolved(notificationId: string, patientId?: string): Promise<void> {
    if (patientId && isSupabaseConfigured()) {
      try {
        // Get patient
        const { data: patient } = await supabase
          .from('patients')
          .select('alerts')
          .eq('id', patientId)
          .single();

        if (patient && patient.alerts) {
          const alerts = (patient.alerts as any[]) || [];
          const updatedAlerts = alerts.map((alert: Alert) =>
            alert.id === notificationId ? { ...alert, resolved: true } : alert
          );

          await supabase
            .from('patients')
            .update({ alerts: updatedAlerts })
            .eq('id', patientId);
        }
      } catch (error) {
        console.error('Error marking notification as resolved:', error);
      }
    }
  }

  /**
   * Mark all notifications as resolved
   */
  public async markAllAsResolved(user: UserProfile): Promise<void> {
    // For patient role, update alerts in database
    if (user.role === 'patient' && user.id) {
      try {
        if (isSupabaseConfigured()) {
          const { data: patient } = await supabase
            .from('patients')
            .select('alerts')
            .eq('id', user.id)
            .single();

          if (patient && patient.alerts) {
            const alerts = (patient.alerts as any[]) || [];
            const updatedAlerts = alerts.map((alert: Alert) => ({
              ...alert,
              resolved: true,
            }));

            await supabase
              .from('patients')
              .update({ alerts: updatedAlerts })
              .eq('id', user.id);
          }
        }
      } catch (error) {
        console.error('Error marking all notifications as resolved:', error);
      }
    }
    // For clinic/pharmacy, notifications are generated dynamically
    // They will disappear when the underlying issue is resolved
  }
}

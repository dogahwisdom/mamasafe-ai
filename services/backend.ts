import { AuthService } from "./backend/authService";
import { PatientService } from "./backend/patientService";
import { PharmacyService } from "./backend/pharmacyService";
import { ClinicService } from "./backend/clinicService";
import { ReminderService } from "./backend/reminderService";
import { ReferralService } from "./backend/referralService";
import { NotificationService } from "./backend/notificationService";
import { SuperadminService } from "./backend/superadminService";
import { SubscriptionService } from "./backend/subscriptionService";
import { SupportService } from "./backend/supportService";
import { SOPService } from "./backend/sopService";
import { TransferService } from "./backend/transferService";
import { DispensingService } from "./backend/dispensingService";
import { ClinicWorkflowService } from "./backend/clinicWorkflowService";
import { AIUsageService } from "./backend/aiUsageService";
import { AppointmentPlanningService } from "./backend/appointmentPlanningService";
import { PharmacyReportsService } from "./backend/pharmacyReportsService";
import { ExpenseService } from "./backend/expenseService";
import { FacilityStaffService } from "./backend/facilityStaffService";
import { OutreachMonitorService } from "./backend/outreachMonitorService";

class BackendFacade {
  public readonly auth: AuthService;
  public readonly patients: PatientService;
  public readonly pharmacy: PharmacyService;
  public readonly clinic: ClinicService;
  public readonly reminders: ReminderService;
  public readonly referrals: ReferralService;
  public readonly notifications: NotificationService;
  public readonly superadmin: SuperadminService;
  public readonly subscriptions: SubscriptionService;
  public readonly support: SupportService;
  public readonly sops: SOPService;
  public readonly transfers: TransferService;
  public readonly dispensing: DispensingService;
  public readonly workflow: ClinicWorkflowService;
  public readonly aiUsage: AIUsageService;
  public readonly appointmentPlanning: AppointmentPlanningService;
  public readonly pharmacyReports: PharmacyReportsService;
  public readonly expenses: ExpenseService;
  public readonly facilityStaff: FacilityStaffService;
  public readonly outreachMonitor: OutreachMonitorService;

  constructor() {
    this.auth = new AuthService();
    this.patients = new PatientService();
    this.pharmacy = new PharmacyService();
    this.clinic = new ClinicService();
    this.reminders = new ReminderService();
    this.referrals = new ReferralService();
    this.notifications = new NotificationService();
    this.superadmin = new SuperadminService();
    this.subscriptions = new SubscriptionService();
    this.support = new SupportService();
    this.sops = new SOPService();
    this.transfers = new TransferService();
    this.dispensing = new DispensingService();
    this.workflow = new ClinicWorkflowService();
    this.aiUsage = new AIUsageService();
    this.appointmentPlanning = new AppointmentPlanningService();
    this.pharmacyReports = new PharmacyReportsService();
    this.expenses = new ExpenseService();
    this.facilityStaff = new FacilityStaffService();
    this.outreachMonitor = new OutreachMonitorService();
  }
}

export const backend = new BackendFacade();


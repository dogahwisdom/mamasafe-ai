import { AuthService } from "./backend/authService";
import { PatientService } from "./backend/patientService";
import { PharmacyService } from "./backend/pharmacyService";
import { ClinicService } from "./backend/clinicService";
import { ReminderService } from "./backend/reminderService";
import { ReferralService } from "./backend/referralService";

class BackendFacade {
  public readonly auth: AuthService;
  public readonly patients: PatientService;
  public readonly pharmacy: PharmacyService;
  public readonly clinic: ClinicService;
  public readonly reminders: ReminderService;
  public readonly referrals: ReferralService;

  constructor() {
    this.auth = new AuthService();
    this.patients = new PatientService();
    this.pharmacy = new PharmacyService();
    this.clinic = new ClinicService();
    this.reminders = new ReminderService();
    this.referrals = new ReferralService();
    this.notifications = new NotificationService();
  }
}

export const backend = new BackendFacade();


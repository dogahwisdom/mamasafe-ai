import { DepartmentalServicesCatalog } from "../../services/departmentalServicesCatalog";
import type { EnrollmentFormData } from "./enrollmentFormTypes";

export class EnrollmentStepValidator {
  static getValidationError(
    formData: EnrollmentFormData,
    forStep: number
  ): string | null {
    switch (forStep) {
      case 1:
        if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.dob) {
          return "Please enter first name, last name, and date of birth.";
        }
        return null;
      case 2: {
        const missing: string[] = [];
        if (!formData.phone?.trim()) missing.push("Patient WhatsApp number");
        if (!formData.county?.trim()) missing.push("County");
        if (!formData.subCounty?.trim()) missing.push("Sub-County / Estate");
        if (formData.patientType === "inpatient") {
          if (!formData.nokName?.trim()) missing.push("Next of kin name");
          if (!formData.nokPhone?.trim()) missing.push("Next of kin phone");
        }
        if (missing.length > 0) {
          return `Complete the following to continue: ${missing.join(", ")}.`;
        }
        return null;
      }
      case 3:
        if (!formData.departmentServiceId || !formData.departmentSubcategoryId) {
          return "Please select a department and sub-category.";
        }
        if (
          DepartmentalServicesCatalog.requiresPregnancyDetails(
            formData.departmentServiceId,
            formData.departmentSubcategoryId
          ) &&
          (!formData.gravida || !formData.parity)
        ) {
          return "Please enter gravida and parity for ANC.";
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
            return "Please enter last menstrual period and gestational age.";
          }
        } else if (formData.departmentServiceId) {
          if (!formData.diagnosisDate) {
            return "Please enter the visit or diagnosis date.";
          }
        } else {
          return "Please complete intake details.";
        }
        return null;
      default:
        return null;
    }
  }
}

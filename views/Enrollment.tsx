import React, { useState, useEffect } from "react";
import { Patient, RiskLevel, ConditionType, UserProfile } from "../types";
import { backend } from "../services/backend";
import { DepartmentalServicesCatalog } from "../services/departmentalServicesCatalog";
import { EnrollmentDepartmentPanels } from "../components/enrollment/EnrollmentDepartmentPanels";
import {
  createEmptyEnrollmentForm,
  type EnrollmentFormData,
} from "../components/enrollment/enrollmentFormTypes";
import { EnrollmentStepValidator } from "../components/enrollment/EnrollmentStepValidator";
import { EnrollmentStepIdentity } from "../components/enrollment/EnrollmentStepIdentity";
import { EnrollmentStepContact } from "../components/enrollment/EnrollmentStepContact";
import { EnrollmentStepConsent } from "../components/enrollment/EnrollmentStepConsent";
import { EnrollmentTransferModal } from "../components/enrollment/EnrollmentTransferModal";
import { EnrollmentSuccessScreen } from "../components/enrollment/EnrollmentSuccessScreen";
import { EnrollmentProgressHeader } from "../components/enrollment/EnrollmentProgressHeader";
import { EnrollmentFormFooter } from "../components/enrollment/EnrollmentFormFooter";

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
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
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
  const [transferReason, setTransferReason] = useState("");
  const [requestingTransfer, setRequestingTransfer] = useState(false);
  const [primaryFacilityChoice, setPrimaryFacilityChoice] = useState<"current" | "existing">(
    "current"
  );

  const [formData, setFormData] = useState<EnrollmentFormData>(createEmptyEnrollmentForm);

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
          edd: eddDate.toISOString().split("T")[0],
          gestationalWeeks:
            diffWeeks > 0 && diffWeeks < 45 ? diffWeeks.toString() : prev.gestationalWeeks,
        }));
      }
    }
  }, [formData.lmp, formData.departmentServiceId, formData.departmentSubcategoryId]);

  useEffect(() => {
    const checkExistingPatient = async () => {
      if (formData.phone && formData.phone.length >= 10) {
        setCheckingPatient(true);
        try {
          const result = await backend.transfers.findPatientByPhone(formData.phone);
          setExistingPatient(result);
        } catch (error) {
          console.error("Error checking existing patient:", error);
          setExistingPatient({ exists: false });
        } finally {
          setCheckingPatient(false);
        }
      } else {
        setExistingPatient(null);
      }
    };

    const timeoutId = setTimeout(checkExistingPatient, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData.phone]);

  useEffect(() => {
    if (existingPatient?.exists && existingPatient.facilityId) {
      setPrimaryFacilityChoice("current");
      return;
    }
    setPrimaryFacilityChoice("current");
  }, [existingPatient?.exists, existingPatient?.facilityId]);

  useEffect(() => {
    const loc = existingPatient?.location?.trim();
    if (!existingPatient?.exists || !loc) return;

    setFormData((prev) => {
      if (prev.county.trim() && prev.subCounty.trim()) return prev;
      const commaIdx = loc.indexOf(",");
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

  const handleNext = () => {
    const err = EnrollmentStepValidator.getValidationError(formData, step);
    if (err) {
      alert(err);
      return;
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleRequestTransfer = async () => {
    if (!existingPatient?.patientId || !existingPatient.facilityId || !transferReason.trim()) {
      alert("Please provide a reason for the transfer request.");
      return;
    }

    setRequestingTransfer(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem("mamasafe_current_user") || "{}");

      await backend.transfers.requestTransfer(
        existingPatient.patientId,
        existingPatient.patientName || `${formData.firstName} ${formData.lastName}`,
        formData.phone,
        existingPatient.facilityId,
        existingPatient.facilityName || "Unknown Facility",
        currentUser.id,
        currentUser.name || "Current Facility",
        transferReason
      );

      alert("Transfer request sent successfully. The original facility will be notified.");
      setShowTransferModal(false);
      setExistingPatient(null);
      setStep(3);
    } catch (error) {
      console.error("Error requesting transfer:", error);
      alert("Failed to send transfer request. Please try again.");
    } finally {
      setRequestingTransfer(false);
    }
  };

  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

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
      const mcType: ConditionType = anc ? "pregnancy" : "other";

      const newPatient: Patient = {
        id: Date.now().toString(),
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        age: age,
        gestationalWeeks: anc ? parseInt(formData.gestationalWeeks) || undefined : undefined,
        location: `${formData.county}${formData.subCounty ? ", " + formData.subCounty : ""}`,
        phone: formData.phone,
        lastCheckIn: new Date().toISOString().split("T")[0],
        riskStatus: RiskLevel.LOW,
        nextAppointment: "",
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
        whatsappMessagingOptIn: whatsappOptIn,
        primaryFacilityId:
          primaryFacilityChoice === "existing"
            ? existingPatient?.facilityId
            : currentFacility?.id,
        primaryFacilityName:
          primaryFacilityChoice === "existing"
            ? existingPatient?.facilityName
            : currentFacility?.name,
      };

      try {
        await onAddPatient(newPatient);
        setSubmitted(true);
      } catch (error) {
        alert("Failed to enroll patient. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const inputClasses =
    "w-full pl-12 p-4 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:bg-white dark:focus:bg-black focus:ring-4 focus:ring-brand-500/10 text-slate-900 dark:text-white font-medium transition-all placeholder-slate-400 outline-none";

  const resetWizard = () => {
    setSubmitted(false);
    setStep(1);
    setConsent(false);
    setWhatsappOptIn(true);
    setFormData(createEmptyEnrollmentForm());
  };

  if (submitted) {
    return (
      <EnrollmentSuccessScreen
        firstName={formData.firstName}
        lastName={formData.lastName}
        phone={formData.phone}
        whatsappOptIn={whatsappOptIn}
        onEnrollAnother={resetWizard}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <EnrollmentProgressHeader
        step={step}
        onStepClick={setStep}
        onAdvance={handleNext}
      />

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#1c1c1e] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/40 relative overflow-hidden border border-slate-100 dark:border-slate-800/50 min-h-[550px]"
      >
        <EnrollmentStepIdentity
          step={step}
          formData={formData}
          setFormData={setFormData}
          inputClasses={inputClasses}
        />

        <EnrollmentStepContact
          step={step}
          formData={formData}
          setFormData={setFormData}
          inputClasses={inputClasses}
          checkingPatient={checkingPatient}
          existingPatient={existingPatient}
          currentFacility={currentFacility}
          primaryFacilityChoice={primaryFacilityChoice}
          setPrimaryFacilityChoice={setPrimaryFacilityChoice}
          onOpenTransferModal={() => setShowTransferModal(true)}
        />

        <EnrollmentDepartmentPanels
          step={step}
          formData={formData}
          setFormData={setFormData}
          inputClasses={inputClasses}
        />

        <EnrollmentStepConsent
          step={step}
          consent={consent}
          setConsent={setConsent}
          whatsappOptIn={whatsappOptIn}
          setWhatsappOptIn={setWhatsappOptIn}
        />

        <EnrollmentFormFooter
          step={step}
          loading={loading}
          consent={consent}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </form>

      <EnrollmentTransferModal
        open={showTransferModal}
        existingPatient={existingPatient}
        transferReason={transferReason}
        setTransferReason={setTransferReason}
        requestingTransfer={requestingTransfer}
        onClose={() => {
          setShowTransferModal(false);
          setTransferReason("");
        }}
        onSubmit={handleRequestTransfer}
      />
    </div>
  );
};

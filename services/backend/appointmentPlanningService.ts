import { Patient, Diagnosis, ClinicVisit } from "../../types";
import { storage, KEYS } from "./shared";

export interface AppointmentSuggestion {
  suggestedDate: string; // ISO date (YYYY-MM-DD)
  daysFromNow: number;
  rationale: string;
}

/**
 * AppointmentPlanningService
 *
 * Encapsulates the logic for suggesting a next clinic appointment date
 * based on diagnosis, severity, visit type and patient context.
 *
 * Design:
 * - Deterministic rules (no random “mock” dates).
 * - No direct DB writes: it only returns suggestions.
 * - Clinician always has final control.
 */
export class AppointmentPlanningService {
  public suggestNextAppointment(
    patient: Patient,
    diagnosis: Pick<Diagnosis, "diagnosisName" | "severity" | "diagnosisType">,
    visit: Pick<ClinicVisit, "visitType">,
    today: Date = new Date()
  ): AppointmentSuggestion {
    const base = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    const severity = diagnosis.severity || "mild";
    const condition = patient.conditionType || "other";
    const visitType = visit.visitType;

    const days = this.calculateOffsetDays(severity, condition, visitType);

    const suggested = new Date(base);
    suggested.setDate(suggested.getDate() + days);

    const rationale = this.buildRationale(
      severity,
      condition,
      visitType,
      diagnosis.diagnosisName,
      days
    );

    return {
      suggestedDate: suggested.toISOString().split("T")[0],
      daysFromNow: days,
      rationale,
    };
  }

  private calculateOffsetDays(
    severity: Diagnosis["severity"] | undefined,
    condition: Patient["conditionType"],
    visitType: ClinicVisit["visitType"]
  ): number {
    // Critical or emergency cases: very short interval
    if (severity === "critical" || visitType === "emergency") {
      return 1;
    }

    if (severity === "severe") {
      return 3;
    }

    // Pregnancy / ANC: closer follow-up in early high‑risk periods
    if (condition === "pregnancy") {
      if (severity === "moderate") {
        return 7; // 1 week
      }
      if (severity === "mild") {
        return 28; // 4 weeks – standard ANC interval early on
      }
      return 21;
    }

    // Chronic conditions – diabetes / hypertension
    if (condition === "diabetes" || condition === "hypertension") {
      if (severity === "moderate") {
        return 14; // 2 weeks
      }
      if (severity === "severe") {
        return 7;
      }
      // Mild and stable
      return 30;
    }

    // Tuberculosis typically has structured monthly follow‑up
    if (condition === "tuberculosis") {
      return 30;
    }

    // Default for "other" conditions
    switch (severity) {
      case "moderate":
        return 14;
      case "severe":
        return 7;
      default:
        return 30;
    }
  }

  private buildRationale(
    severity: Diagnosis["severity"] | undefined,
    condition: Patient["conditionType"],
    visitType: ClinicVisit["visitType"],
    diagnosisName: string,
    days: number
  ): string {
    const parts: string[] = [];

    parts.push(
      `Based on a ${severity || "mild"} ${diagnosisName || "condition"} during a ${visitType} visit.`
    );

    if (condition === "pregnancy") {
      parts.push(
        "Follow‑up interval aligned with ANC best practice for maternal risk level."
      );
    } else if (condition === "diabetes" || condition === "hypertension") {
      parts.push(
        "Interval reflects chronic care review frequency for blood pressure / glycaemic control."
      );
    } else if (condition === "tuberculosis") {
      parts.push("TB care typically uses monthly review milestones.");
    }

    if (days <= 3) {
      parts.push("Short interval recommended due to higher clinical risk.");
    } else if (days <= 14) {
      parts.push("Two‑week review suitable for monitoring response to treatment.");
    } else {
      parts.push("Longer interval appropriate for stable / lower‑risk cases.");
    }

    return parts.join(" ");
  }
}


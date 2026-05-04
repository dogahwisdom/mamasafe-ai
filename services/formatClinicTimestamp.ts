/**
 * Human-readable clinic timestamps for dashboards and task notes (replaces raw ISO in UI).
 */
export class ClinicTimestampFormatter {
  /** Medium date + short time in the user's locale (e.g. "29 Apr 2026, 18:35"). */
  static formatDateTime(iso: string | undefined | null): string {
    if (iso == null || String(iso).trim() === "") return "—";
    const s = String(iso).trim();
    if (s === "n/a" || s === "N/A") return "—";
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Replaces embedded ISO-8601 fragments in stored task copy (e.g. outreach follow-up notes).
   */
  static formatNotesWithEmbeddedIso(notes: string | undefined): string {
    if (!notes) return "";
    return notes.replace(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/g,
      (match) => ClinicTimestampFormatter.formatDateTime(match)
    );
  }
}

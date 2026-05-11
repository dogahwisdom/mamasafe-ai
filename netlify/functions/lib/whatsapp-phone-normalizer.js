/**
 * Normalizes WhatsApp sender IDs (Meta sends digits only, typically full country code).
 * Ensures lookups against patients + whatsapp_sessions stay consistent regardless of +/- or local formats in the DB.
 */
export class WhatsAppPhoneNormalizer {
  /**
   * @param {unknown} digitSource - WhatsApp Cloud API messages[].from
   */
  static canonicalFromMetaFrom(digitSource) {
    const d = String(digitSource ?? "").replace(/\D/g, "");
    if (!d || d.length < 8 || d.length > 15) return "";
    return `+${d}`;
  }

  /**
   * @param {unknown} phone - Stored or inbound phone string (+E.164, missing +, etc.)
   */
  static canonicalFromAny(phone) {
    const d = String(phone ?? "").replace(/\D/g, "");
    if (!d || d.length < 8 || d.length > 15) return "";
    return `+${d}`;
  }

  /** @param {string} canonicalPlus - e.g. +254712345678 */
  static variantsForQueries(canonicalPlus) {
    const canon = WhatsAppPhoneNormalizer.canonicalFromAny(canonicalPlus);
    if (!canon) return [];
    const d = canon.replace(/^\+/, "");
    const variants = new Set([canon, d]);

    const withLocalLeadingZero = (countryPrefix, expectedMinLen) => {
      if (!d.startsWith(countryPrefix) || d.length < expectedMinLen) return;
      const local = `0${d.slice(countryPrefix.length)}`;
      variants.add(local);
      variants.add(`+${local}`);
    };

    // Kenya (+254): common local recording as 07…
    withLocalLeadingZero("254", 12);
    // Ghana (+233)
    withLocalLeadingZero("233", 12);

    // Kenya: enrolment/UI sometimes persists "+2540712345678" (2540 + 7xxxxxxxx); Meta sends 254712345678.
    if (d.startsWith("2547") && d.length === 12 && /^7\d{8}$/.test(d.slice(3))) {
      const national = d.slice(3);
      variants.add(`+2540${national}`);
      variants.add(`2540${national}`);
    }

    return [...variants];
  }

  /** @param {unknown} metaFromDigits */
  static isLikelyWhatsAppCaller(metaFromDigits) {
    return WhatsAppPhoneNormalizer.canonicalFromMetaFrom(metaFromDigits) !== "";
  }
}

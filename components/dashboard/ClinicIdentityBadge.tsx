import React, { useState } from "react";

/** URLs bundled as "defaults" in older builds / seeds — show branded initials instead. */
function shouldIgnoreUploadedUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  return url.includes("images.unsplash.com");
}

function initialsFromFacilityName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "MS";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  if (parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
}

export interface ClinicIdentityBadgeProps {
  /** Facility or account display name (e.g. clinic name). */
  facilityName: string;
  /** Optional logo or photo from Settings; stock/demo URLs are ignored. */
  imageUrl?: string | null;
  /** Defaults to hide on small screens to match dashboard layout. */
  className?: string;
}

/**
 * Clinic header emblem: uploaded logo when set, otherwise consistent initials on a neutral brand surface.
 */
export const ClinicIdentityBadge: React.FC<ClinicIdentityBadgeProps> = ({
  facilityName,
  imageUrl,
  className = "",
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const tryShowImage =
    !shouldIgnoreUploadedUrl(imageUrl ?? undefined) && !imgFailed && Boolean(imageUrl?.trim());
  const initials = initialsFromFacilityName(facilityName);

  return (
    <div
      className={`hidden md:flex h-16 w-16 shrink-0 rounded-2xl items-center justify-center shadow-sm border overflow-hidden ${className} ${
        tryShowImage
          ? "bg-white dark:bg-[#2c2c2e] border-slate-100 dark:border-slate-800"
          : "bg-gradient-to-br from-brand-500/12 via-teal-500/10 to-slate-100/80 dark:from-brand-900/40 dark:via-teal-900/20 dark:to-[#2c2c2e] border-brand-200/40 dark:border-brand-800/30"
      }`}
      aria-hidden
    >
      {tryShowImage ? (
        <img
          src={imageUrl!}
          alt=""
          className="h-full w-full object-contain p-2.5"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="text-xl font-bold tracking-tight text-brand-700 dark:text-brand-200">
          {initials}
        </span>
      )}
    </div>
  );
};

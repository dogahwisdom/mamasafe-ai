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

export type ClinicIdentityBadgeSize = "dashboard" | "nav";

export interface ClinicIdentityBadgeProps {
  /** Facility or account display name (e.g. clinic name). */
  facilityName: string;
  /** Optional logo or photo from Settings; stock/demo URLs are ignored. */
  imageUrl?: string | null;
  className?: string;
  /** dashboard = large block on clinic home (hidden on tiny viewports); nav = compact top bar. */
  size?: ClinicIdentityBadgeSize;
}

/**
 * Facility / account emblem: uploaded logo when set, otherwise initials on a neutral brand surface.
 */
export const ClinicIdentityBadge: React.FC<ClinicIdentityBadgeProps> = ({
  facilityName,
  imageUrl,
  className = "",
  size = "dashboard",
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const tryShowImage =
    !shouldIgnoreUploadedUrl(imageUrl ?? undefined) && !imgFailed && Boolean(imageUrl?.trim());
  const initials = initialsFromFacilityName(facilityName);
  const isNav = size === "nav";

  const frame = isNav
    ? "flex h-9 w-9 rounded-xl ring-2 ring-white dark:ring-black shadow-md shadow-brand-500/15"
    : "hidden md:flex h-16 w-16 rounded-2xl shadow-sm";

  const textSize = isNav ? "text-[11px] font-bold tracking-tight" : "text-xl font-bold tracking-tight";
  const imgPad = isNav ? "p-1" : "p-2.5";

  return (
    <div
      className={`${frame} shrink-0 items-center justify-center border overflow-hidden ${className} ${
        tryShowImage
          ? "bg-white dark:bg-[#2c2c2e] border-slate-100 dark:border-slate-800"
          : "bg-gradient-to-br from-brand-500/14 via-teal-500/12 to-slate-100/90 dark:from-brand-900/45 dark:via-teal-900/25 dark:to-[#2c2c2e] border-brand-200/50 dark:border-brand-800/35"
      }`}
      aria-hidden
    >
      {tryShowImage ? (
        <img
          src={imageUrl!}
          alt=""
          className={`h-full w-full object-contain ${imgPad}`}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className={`${textSize} text-brand-800 dark:text-brand-100`}>{initials}</span>
      )}
    </div>
  );
};

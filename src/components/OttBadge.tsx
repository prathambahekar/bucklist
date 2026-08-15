import React from "react";

export interface OttBadgeProps {
  platform: string;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  variant?: "badge" | "pill" | "icon-only";
}

interface PlatformConfig {
  name: string;
  bg: string;
  border: string;
  text: string;
  iconBg?: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

// Brand SVG logos designed with pixel precision
export const OttLogos: Record<string, (props: { className?: string }) => React.ReactElement> = {
  netflix: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5.5 2h3.5l5.5 14V2h4v20h-3.5L9 8v14H5.5V2z"
        fill="#E50914"
      />
    </svg>
  ),

  prime: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 13.5c4.5 3 13.5 3 18 0-3 2.5-9 4-13 4-2.5 0-4-.5-5-4z"
        fill="#00A8E1"
      />
      <path
        d="M18.5 12.5c.8.6 1.8 1.8 2 2.3-.3.2-1.3.4-2.2.1l-.8-.6c.2-.5.6-1.2 1-1.8z"
        fill="#FF9900"
      />
      <path
        d="M8.5 7h2.8c1.6 0 2.7.9 2.7 2.3 0 1.5-1.1 2.4-2.7 2.4h-1.3v3H8.5V7zm2.7 3.3c.7 0 1.2-.4 1.2-1 0-.6-.5-1-1.2-1H9.9v2h1.3z"
        fill="#00A8E1"
      />
    </svg>
  ),

  jiohotstar: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="hotstarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B44B8" />
          <stop offset="50%" stopColor="#0B79E6" />
          <stop offset="100%" stopColor="#03CD54" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#hotstarGrad)" />
      <path
        d="M12 4.5l2.2 4.6 5 .7-3.6 3.6.9 5.1-4.5-2.4-4.5 2.4.9-5.1-3.6-3.6 5-.7L12 4.5z"
        fill="#FFDF00"
      />
    </svg>
  ),

  disney: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="disneyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#040924" />
          <stop offset="100%" stopColor="#113CCF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#disneyGrad)" />
      <path
        d="M12 4c4.4 0 8 3.6 8 8 0 1.5-.4 2.9-1.2 4.1L12 7.5l-6.8 8.6C4.4 14.9 4 13.5 4 12c0-4.4 3.6-8 8-8z"
        fill="#FFFFFF"
        opacity="0.3"
      />
      <path
        d="M8.5 9c1.5 0 2.5 1 2.5 2.5s-1 2.5-2.5 2.5H7v2h-1.5V9h3zm0 3.5c.7 0 1-.4 1-1s-.3-1-1-1H7v2h1.5zm6-1.5h1.5v-1.5H17V11h1.5v1.5H17v1.5h-1V12.5h-1.5V11z"
        fill="#FFFFFF"
      />
    </svg>
  ),

  max: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#002BE7" />
      <path
        d="M5 15.5V8.5h2.2l2.3 3.6 2.3-3.6H14v7h-1.8v-4.2l-1.9 3.1h-.9l-1.9-3.1v4.2H5zm10.2 0l2.6-3.8-2.4-3.2h2.2l1.3 1.9 1.3-1.9h2.1l-2.4 3.3 2.6 3.7h-2.3l-1.4-2.2-1.4 2.2h-2.2z"
        fill="#FFFFFF"
      />
    </svg>
  ),

  apple: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#1C1C1E" />
      <path
        d="M14.7 12.3c0-2 1.6-3 1.7-3.1-1-.1.4-2.4-.8-2.9-1-.4-1.9.3-2.4.3-.5 0-1.3-.3-2.1-.3-1.1 0-2.1.6-2.6 1.6-1.2 2-1 5.1.8 6.4.6.9 1.4 1.8 2.4 1.8.9 0 1.3-.6 2.4-.6 1.1 0 1.4.6 2.4.6 1 0 1.7-.9 2.3-1.8.7-1 1-2 1-2.1-.1 0-1.9-.7-1.9-2.9zM13.4 5.3c.4-.6.7-1.4.6-2.3-.8 0-1.7.5-2.2 1.1-.4.5-.7 1.3-.6 2.2.9.1 1.8-.4 2.2-1z"
        fill="#FFFFFF"
      />
    </svg>
  ),

  hulu: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#1CE783" />
      <path
        d="M6 7v10h2.2v-4.2h3V17h2.2V7h-2.2v3.8h-3V7H6zm8.5 3.5v6.5h2.2v-4.5c0-1 .6-1.5 1.5-1.5h.5V9h-.7c-.9 0-1.6.4-2 1.1V7h-1.5v3.5z"
        fill="#0B0E14"
      />
    </svg>
  ),

  sonyliv: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#0A0A0A" />
      <rect x="4" y="5" width="4" height="4" rx="1" fill="#FF5252" />
      <rect x="9" y="5" width="4" height="4" rx="1" fill="#FFD740" />
      <rect x="14" y="5" width="4" height="4" rx="1" fill="#40C4FF" />
      <rect x="4" y="10" width="4" height="4" rx="1" fill="#69F0AE" />
      <rect x="9" y="10" width="4" height="4" rx="1" fill="#E040FB" />
      <rect x="14" y="10" width="4" height="4" rx="1" fill="#FF6E40" />
      <text x="11.5" y="20" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">LIV</text>
    </svg>
  ),

  zee5: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="zeeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8E2DE2" />
          <stop offset="100%" stopColor="#4A00E0" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#zeeGrad)" />
      <text x="12" y="16" fill="#FFFFFF" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">5</text>
    </svg>
  ),

  paramount: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#0064FF" />
      <path
        d="M12 4l1.5 3.5 3.7.3-2.8 2.5.8 3.7-3.2-2-3.2 2 .8-3.7-2.8-2.5 3.7-.3L12 4z"
        fill="#FFFFFF"
      />
      <text x="12" y="20" fill="#FFFFFF" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">P+</text>
    </svg>
  ),

  peacock: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#000000" />
      <circle cx="7.5" cy="9" r="2" fill="#F8B133" />
      <circle cx="12" cy="7.5" r="2" fill="#E4232A" />
      <circle cx="16.5" cy="9" r="2" fill="#882384" />
      <circle cx="8" cy="13.5" r="2" fill="#00A651" />
      <circle cx="12" cy="15" r="2" fill="#00AEEF" />
      <circle cx="16" cy="13.5" r="2" fill="#002D62" />
    </svg>
  ),

  crunchyroll: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#F47521" />
      <circle cx="14" cy="10" r="3.5" fill="#FFFFFF" />
      <path
        d="M12 5.5A6.5 6.5 0 0 0 5.5 12a6.5 6.5 0 0 0 11.1 4.6 5 5 0 0 1-8.1-4.6 5 5 0 0 1 4.5-5.9c-.3-.4-.7-.6-1-.6z"
        fill="#23252B"
      />
    </svg>
  ),

  youtube: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#FF0000" />
      <path d="M9.5 8.5l6 3.5-6 3.5v-7z" fill="#FFFFFF" />
    </svg>
  ),

  mubi: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#0A0A0A" />
      <circle cx="7" cy="12" r="2" fill="#00E5FF" />
      <circle cx="12" cy="12" r="2" fill="#00E5FF" />
      <circle cx="17" cy="12" r="2" fill="#00E5FF" />
    </svg>
  ),

  generic: ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  ),
};

export function getPlatformKey(name: string): string {
  const lower = (name || "").toLowerCase().trim();
  if (lower.includes("netflix")) return "netflix";
  if (lower.includes("prime") || lower.includes("amazon")) return "prime";
  if (
    lower.includes("jio") ||
    lower.includes("hotstar") ||
    lower.includes("disney+ hotstar")
  )
    return "jiohotstar";
  if (lower.includes("disney")) return "disney";
  if (lower.includes("hbo") || lower.includes("max")) return "max";
  if (lower.includes("apple")) return "apple";
  if (lower.includes("hulu")) return "hulu";
  if (lower.includes("sony") || lower.includes("liv")) return "sonyliv";
  if (lower.includes("zee")) return "zee5";
  if (lower.includes("paramount")) return "paramount";
  if (lower.includes("peacock")) return "peacock";
  if (lower.includes("crunchyroll")) return "crunchyroll";
  if (lower.includes("youtube")) return "youtube";
  if (lower.includes("mubi")) return "mubi";
  return "generic";
}

export function getPlatformTheme(name: string): {
  bg: string;
  border: string;
  text: string;
  glow: string;
} {
  const key = getPlatformKey(name);
  switch (key) {
    case "netflix":
      return {
        bg: "bg-red-950/40 hover:bg-red-950/60",
        border: "border-red-600/30 hover:border-red-500/60",
        text: "text-red-300 group-hover:text-red-200",
        glow: "shadow-red-950/30",
      };
    case "prime":
      return {
        bg: "bg-sky-950/40 hover:bg-sky-950/60",
        border: "border-sky-500/30 hover:border-sky-400/60",
        text: "text-sky-300 group-hover:text-sky-200",
        glow: "shadow-sky-950/30",
      };
    case "jiohotstar":
      return {
        bg: "bg-blue-950/40 hover:bg-blue-950/60",
        border: "border-blue-500/30 hover:border-emerald-400/60",
        text: "text-blue-200 group-hover:text-white",
        glow: "shadow-blue-950/30",
      };
    case "disney":
      return {
        bg: "bg-indigo-950/40 hover:bg-indigo-950/60",
        border: "border-indigo-500/30 hover:border-indigo-400/60",
        text: "text-indigo-200 group-hover:text-white",
        glow: "shadow-indigo-950/30",
      };
    case "max":
      return {
        bg: "bg-blue-950/40 hover:bg-blue-950/60",
        border: "border-blue-600/40 hover:border-blue-500/70",
        text: "text-blue-300 group-hover:text-blue-100",
        glow: "shadow-blue-950/30",
      };
    case "apple":
      return {
        bg: "bg-zinc-900/60 hover:bg-zinc-850",
        border: "border-zinc-700/50 hover:border-zinc-500/70",
        text: "text-zinc-200 group-hover:text-white",
        glow: "shadow-zinc-900/30",
      };
    case "hulu":
      return {
        bg: "bg-emerald-950/40 hover:bg-emerald-950/60",
        border: "border-emerald-500/30 hover:border-emerald-400/60",
        text: "text-emerald-300 group-hover:text-emerald-100",
        glow: "shadow-emerald-950/30",
      };
    case "sonyliv":
      return {
        bg: "bg-orange-950/40 hover:bg-orange-950/60",
        border: "border-orange-500/30 hover:border-amber-400/60",
        text: "text-orange-200 group-hover:text-amber-100",
        glow: "shadow-orange-950/30",
      };
    case "zee5":
      return {
        bg: "bg-purple-950/40 hover:bg-purple-950/60",
        border: "border-purple-500/30 hover:border-purple-400/60",
        text: "text-purple-200 group-hover:text-purple-100",
        glow: "shadow-purple-950/30",
      };
    default:
      return {
        bg: "bg-amber-500/10 hover:bg-amber-500/20",
        border: "border-amber-500/25 hover:border-amber-500/50",
        text: "text-amber-300 group-hover:text-amber-200",
        glow: "shadow-amber-950/20",
      };
  }
}

export function OttIcon({
  platform,
  className = "w-4 h-4",
}: {
  platform: string;
  className?: string;
}) {
  const key = getPlatformKey(platform);
  const IconComponent = OttLogos[key] || OttLogos.generic;
  return <IconComponent className={className} />;
}

export function OttBadge({
  platform,
  size = "sm",
  showLabel = true,
  className = "",
}: OttBadgeProps) {
  const theme = getPlatformTheme(platform);

  const sizeClasses = {
    xs: {
      badge: "px-1.5 py-0.5 text-[9px] gap-1 rounded",
      icon: "w-3 h-3",
    },
    sm: {
      badge: "px-2 py-0.5 text-[10px] sm:text-[11px] gap-1.5 rounded-md",
      icon: "w-3.5 h-3.5",
    },
    md: {
      badge: "px-2.5 py-1 text-xs gap-1.5 rounded-lg",
      icon: "w-4 h-4",
    },
    lg: {
      badge: "px-3 py-1.5 text-xs sm:text-sm font-semibold gap-2 rounded-xl",
      icon: "w-4.5 h-4.5 sm:w-5 sm:h-5",
    },
  }[size];

  return (
    <div
      className={`group inline-flex items-center font-medium border transition-all duration-150 ${theme.bg} ${theme.border} ${theme.text} ${sizeClasses.badge} ${className}`}
    >
      <OttIcon platform={platform} className={`${sizeClasses.icon} shrink-0`} />
      {showLabel && <span className="truncate">{platform}</span>}
    </div>
  );
}

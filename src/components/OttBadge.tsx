import React from "react";

export interface OttBadgeProps {
  platform: string;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function getPlatformAccentTheme(name: string): {
  bg: string;
  border: string;
  text: string;
} {
  const lower = (name || "").toLowerCase().trim();

  if (lower.includes("netflix")) {
    return {
      bg: "bg-red-950/70 hover:bg-red-950/90",
      border: "border-red-600/40 hover:border-red-500/60",
      text: "text-red-200",
    };
  }
  if (lower.includes("prime") || lower.includes("amazon")) {
    return {
      bg: "bg-sky-950/70 hover:bg-sky-950/90",
      border: "border-sky-500/40 hover:border-sky-400/60",
      text: "text-sky-200",
    };
  }
  if (
    lower.includes("jio") ||
    lower.includes("hotstar") ||
    lower.includes("disney") ||
    lower.includes("hbo") ||
    lower.includes("max")
  ) {
    return {
      bg: "bg-blue-950/70 hover:bg-blue-950/90",
      border: "border-blue-500/40 hover:border-blue-400/60",
      text: "text-blue-200",
    };
  }
  if (lower.includes("apple")) {
    return {
      bg: "bg-zinc-800/90 hover:bg-zinc-800",
      border: "border-zinc-500/50 hover:border-zinc-400/70",
      text: "text-zinc-100",
    };
  }
  if (lower.includes("hulu")) {
    return {
      bg: "bg-emerald-950/70 hover:bg-emerald-950/90",
      border: "border-emerald-500/40 hover:border-emerald-400/60",
      text: "text-emerald-200",
    };
  }
  if (lower.includes("sony") || lower.includes("liv")) {
    return {
      bg: "bg-orange-950/70 hover:bg-orange-950/90",
      border: "border-orange-500/40 hover:border-orange-400/60",
      text: "text-orange-200",
    };
  }
  if (lower.includes("zee")) {
    return {
      bg: "bg-purple-950/70 hover:bg-purple-950/90",
      border: "border-purple-500/40 hover:border-purple-400/60",
      text: "text-purple-200",
    };
  }
  if (lower.includes("crunchyroll")) {
    return {
      bg: "bg-orange-950/70 hover:bg-orange-950/90",
      border: "border-orange-500/40 hover:border-orange-400/60",
      text: "text-orange-200",
    };
  }
  if (lower.includes("paramount")) {
    return {
      bg: "bg-blue-950/70 hover:bg-blue-950/90",
      border: "border-blue-600/40 hover:border-blue-500/60",
      text: "text-blue-200",
    };
  }
  if (lower.includes("peacock")) {
    return {
      bg: "bg-teal-950/70 hover:bg-teal-950/90",
      border: "border-teal-500/40 hover:border-teal-400/60",
      text: "text-teal-200",
    };
  }
  if (lower.includes("mubi")) {
    return {
      bg: "bg-cyan-950/70 hover:bg-cyan-950/90",
      border: "border-cyan-500/40 hover:border-cyan-400/60",
      text: "text-cyan-200",
    };
  }
  if (lower.includes("youtube")) {
    return {
      bg: "bg-red-950/70 hover:bg-red-950/90",
      border: "border-red-500/40 hover:border-red-400/60",
      text: "text-red-200",
    };
  }

  if (lower.includes("theatre") || lower.includes("cinema") || lower.includes("imax") || lower.includes("4dx") || lower.includes("dolby")) {
    return {
      bg: "bg-amber-950/70 hover:bg-amber-950/90",
      border: "border-amber-500/50 hover:border-amber-400/70",
      text: "text-amber-300",
    };
  }
  if (lower.includes("blu-ray") || lower.includes("bluray") || lower.includes("dvd") || lower.includes("disc")) {
    return {
      bg: "bg-violet-950/70 hover:bg-violet-950/90",
      border: "border-violet-500/40 hover:border-violet-400/60",
      text: "text-violet-200",
    };
  }
  if (lower.includes("flight") || lower.includes("fest")) {
    return {
      bg: "bg-indigo-950/70 hover:bg-indigo-950/90",
      border: "border-indigo-500/40 hover:border-indigo-400/60",
      text: "text-indigo-200",
    };
  }

  return {
    bg: "bg-zinc-800/80 hover:bg-zinc-800",
    border: "border-zinc-700/60 hover:border-zinc-600",
    text: "text-zinc-200",
  };
}

export function OttIcon({
  platform,
  className = "",
}: {
  platform: string;
  className?: string;
}) {
  return null;
}

export function OttBadge({
  platform,
  size = "sm",
  showLabel = true,
  className = "",
}: OttBadgeProps) {
  const theme = getPlatformAccentTheme(platform);

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[9px] rounded font-semibold",
    sm: "px-2 py-0.5 text-[10px] sm:text-[11px] rounded-md font-semibold",
    md: "px-2.5 py-1 text-xs rounded-lg font-semibold",
    lg: "px-3 py-1.5 text-xs sm:text-sm rounded-xl font-semibold",
  }[size];

  return (
    <span
      className={`inline-flex items-center tracking-wide border transition-colors shadow-2xs ${theme.bg} ${theme.border} ${theme.text} ${sizeClasses} ${className}`}
    >
      <span className="truncate">{platform}</span>
    </span>
  );
}


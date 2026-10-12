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
  dot: string;
  glow: string;
} {
  const lower = (name || "").toLowerCase().trim();

  if (lower.includes("netflix")) {
    return {
      bg: "bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-600/15 hover:from-red-500/25 hover:to-rose-600/25",
      border: "border-red-500/35 hover:border-red-500/55",
      text: "text-red-200",
      dot: "bg-red-500",
      glow: "shadow-[0_1px_6px_rgba(239,68,68,0.12)]",
    };
  }
  if (lower.includes("prime") || lower.includes("amazon")) {
    return {
      bg: "bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-sky-600/15 hover:from-sky-500/25 hover:to-sky-600/25",
      border: "border-sky-400/35 hover:border-sky-400/55",
      text: "text-sky-200",
      dot: "bg-sky-400",
      glow: "shadow-[0_1px_6px_rgba(56,189,248,0.12)]",
    };
  }
  if (
    lower.includes("jio") ||
    lower.includes("hotstar") ||
    lower.includes("disney")
  ) {
    return {
      bg: "bg-gradient-to-r from-indigo-500/15 via-blue-600/10 to-indigo-600/15 hover:from-indigo-500/25 hover:to-indigo-600/25",
      border: "border-indigo-400/35 hover:border-indigo-400/55",
      text: "text-indigo-200",
      dot: "bg-indigo-400",
      glow: "shadow-[0_1px_6px_rgba(99,102,241,0.12)]",
    };
  }
  if (lower.includes("hbo") || lower.includes("max")) {
    return {
      bg: "bg-gradient-to-r from-purple-500/15 via-violet-600/10 to-purple-600/15 hover:from-purple-500/25 hover:to-purple-600/25",
      border: "border-purple-400/35 hover:border-purple-400/55",
      text: "text-purple-200",
      dot: "bg-purple-400",
      glow: "shadow-[0_1px_6px_rgba(168,85,247,0.12)]",
    };
  }
  if (lower.includes("apple")) {
    return {
      bg: "bg-gradient-to-r from-zinc-700/30 to-zinc-800/40 hover:from-zinc-700/45 hover:to-zinc-800/55",
      border: "border-zinc-500/40 hover:border-zinc-400/60",
      text: "text-zinc-100",
      dot: "bg-zinc-200",
      glow: "shadow-[0_1px_6px_rgba(255,255,255,0.06)]",
    };
  }
  if (lower.includes("hulu")) {
    return {
      bg: "bg-gradient-to-r from-emerald-500/15 via-teal-600/10 to-emerald-600/15 hover:from-emerald-500/25 hover:to-emerald-600/25",
      border: "border-emerald-400/35 hover:border-emerald-400/55",
      text: "text-emerald-200",
      dot: "bg-emerald-400",
      glow: "shadow-[0_1px_6px_rgba(52,211,153,0.12)]",
    };
  }
  if (lower.includes("sony") || lower.includes("liv")) {
    return {
      bg: "bg-gradient-to-r from-amber-500/15 via-orange-600/10 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25",
      border: "border-amber-400/35 hover:border-amber-400/55",
      text: "text-amber-200",
      dot: "bg-amber-400",
      glow: "shadow-[0_1px_6px_rgba(251,191,36,0.12)]",
    };
  }
  if (lower.includes("zee")) {
    return {
      bg: "bg-gradient-to-r from-fuchsia-500/15 via-purple-600/10 to-fuchsia-600/15 hover:from-fuchsia-500/25 hover:to-fuchsia-600/25",
      border: "border-fuchsia-400/35 hover:border-fuchsia-400/55",
      text: "text-fuchsia-200",
      dot: "bg-fuchsia-400",
      glow: "shadow-[0_1px_6px_rgba(217,70,239,0.12)]",
    };
  }
  if (lower.includes("crunchyroll")) {
    return {
      bg: "bg-gradient-to-r from-orange-500/15 via-amber-600/10 to-orange-600/15 hover:from-orange-500/25 hover:to-orange-600/25",
      border: "border-orange-400/35 hover:border-orange-400/55",
      text: "text-orange-200",
      dot: "bg-orange-400",
      glow: "shadow-[0_1px_6px_rgba(249,115,22,0.12)]",
    };
  }
  if (lower.includes("paramount")) {
    return {
      bg: "bg-gradient-to-r from-blue-500/15 via-cyan-600/10 to-blue-600/15 hover:from-blue-500/25 hover:to-blue-600/25",
      border: "border-blue-400/35 hover:border-blue-400/55",
      text: "text-blue-200",
      dot: "bg-blue-400",
      glow: "shadow-[0_1px_6px_rgba(59,130,246,0.12)]",
    };
  }
  if (lower.includes("peacock")) {
    return {
      bg: "bg-gradient-to-r from-teal-500/15 via-emerald-600/10 to-teal-600/15 hover:from-teal-500/25 hover:to-teal-600/25",
      border: "border-teal-400/35 hover:border-teal-400/55",
      text: "text-teal-200",
      dot: "bg-teal-400",
      glow: "shadow-[0_1px_6px_rgba(45,212,191,0.12)]",
    };
  }
  if (lower.includes("mubi")) {
    return {
      bg: "bg-gradient-to-r from-cyan-500/15 via-sky-600/10 to-cyan-600/15 hover:from-cyan-500/25 hover:to-cyan-600/25",
      border: "border-cyan-400/35 hover:border-cyan-400/55",
      text: "text-cyan-200",
      dot: "bg-cyan-400",
      glow: "shadow-[0_1px_6px_rgba(34,211,238,0.12)]",
    };
  }
  if (lower.includes("youtube")) {
    return {
      bg: "bg-gradient-to-r from-red-500/15 via-red-600/10 to-rose-600/15 hover:from-red-500/25 hover:to-rose-600/25",
      border: "border-red-500/35 hover:border-red-500/55",
      text: "text-red-200",
      dot: "bg-red-500",
      glow: "shadow-[0_1px_6px_rgba(239,68,68,0.12)]",
    };
  }

  if (lower.includes("theatre") || lower.includes("cinema") || lower.includes("imax") || lower.includes("4dx") || lower.includes("dolby")) {
    return {
      bg: "bg-gradient-to-r from-amber-500/15 via-yellow-600/10 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25",
      border: "border-amber-400/35 hover:border-amber-400/60",
      text: "text-amber-300",
      dot: "bg-amber-400",
      glow: "shadow-[0_1px_6px_rgba(251,191,36,0.14)]",
    };
  }
  if (lower.includes("blu-ray") || lower.includes("bluray") || lower.includes("dvd") || lower.includes("disc")) {
    return {
      bg: "bg-gradient-to-r from-violet-500/15 via-purple-600/10 to-violet-600/15 hover:from-violet-500/25 hover:to-violet-600/25",
      border: "border-violet-400/35 hover:border-violet-400/55",
      text: "text-violet-200",
      dot: "bg-violet-400",
      glow: "shadow-[0_1px_6px_rgba(139,92,246,0.12)]",
    };
  }
  if (lower.includes("flight") || lower.includes("fest")) {
    return {
      bg: "bg-gradient-to-r from-indigo-500/15 via-blue-600/10 to-indigo-600/15 hover:from-indigo-500/25 hover:to-indigo-600/25",
      border: "border-indigo-400/35 hover:border-indigo-400/55",
      text: "text-indigo-200",
      dot: "bg-indigo-400",
      glow: "shadow-[0_1px_6px_rgba(99,102,241,0.12)]",
    };
  }

  return {
    bg: "bg-gradient-to-r from-zinc-800/70 to-zinc-850/70 hover:from-zinc-800/90 hover:to-zinc-850/90",
    border: "border-zinc-700/50 hover:border-zinc-600/70",
    text: "text-zinc-200",
    dot: "bg-zinc-400",
    glow: "shadow-2xs",
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
    xs: "px-1.5 py-0.5 text-[9px] rounded gap-1 font-semibold",
    sm: "px-2 py-0.5 text-[10px] sm:text-[11px] rounded-md gap-1.5 font-semibold",
    md: "px-2.5 py-1 text-xs rounded-lg gap-1.5 font-semibold",
    lg: "px-3 py-1.5 text-xs sm:text-sm rounded-xl gap-2 font-semibold",
  }[size];

  const dotSizes = {
    xs: "w-1 h-1",
    sm: "w-1.5 h-1.5",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center tracking-wide border transition-all duration-150 backdrop-blur-xs select-none ${theme.bg} ${theme.border} ${theme.text} ${theme.glow} ${sizeClasses} ${className}`}
      title={platform}
    >
      <span className={`${dotSizes} rounded-full shrink-0 ${theme.dot}`} />
      <span className="truncate">{platform}</span>
    </span>
  );
}


import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  type PriorityLevel,
  type AppMode,
  PRIORITY_ORDER,
  getPriorityConfig,
} from "../types";

interface PriorityBadgeProps {
  priority?: PriorityLevel | string | null;
  size?: "xs" | "sm" | "md" | "lg";
  interactive?: boolean;
  onSelectPriority?: (newPriority: PriorityLevel) => void;
  className?: string;
  showDropdownArrow?: boolean;
  showFullLabel?: boolean;
  showDot?: boolean;
  appMode?: AppMode;
}

export function PriorityBadge({
  priority,
  size = "sm",
  interactive = false,
  onSelectPriority,
  className = "",
  showDropdownArrow = false,
  showFullLabel = true,
  showDot = false,
  appMode = "cinema",
}: PriorityBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentConfig = getPriorityConfig(priority, appMode);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5 gap-1 rounded tracking-wide",
    sm: "text-[10px] sm:text-[11px] px-2 py-0.5 gap-1 rounded-md tracking-wide",
    md: "text-xs px-2.5 py-1 gap-1.5 rounded-lg font-semibold tracking-wide",
    lg: "text-sm px-3 py-1.5 gap-2 rounded-xl font-bold tracking-wide",
  };

  const badgeContent = (
    <>
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentConfig.dotBg}`}
        />
      )}
      <span className="whitespace-nowrap font-semibold">
        {showFullLabel ? currentConfig.label : currentConfig.shortLabel}
      </span>
      {interactive && showDropdownArrow && (
        <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
      )}
    </>
  );

  if (!interactive || !onSelectPriority) {
    return (
      <span
        className={`inline-flex items-center font-medium border shadow-2xs ${currentConfig.badgeBg} ${currentConfig.badgeBorder} ${currentConfig.badgeText} ${sizeClasses[size]} ${className}`}
        title={`Priority: ${currentConfig.label}`}
      >
        {badgeContent}
      </span>
    );
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center font-medium border shadow-2xs transition-all cursor-pointer select-none active:scale-95 ${currentConfig.badgeBg} ${currentConfig.badgeBorder} ${currentConfig.badgeText} ${currentConfig.hoverBg} ${sizeClasses[size]} ${className}`}
        title="Click to change priority level"
      >
        {badgeContent}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 z-[100] w-52 bg-zinc-950/98 backdrop-blur-md border border-zinc-750/90 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800/80 mb-1">
            Priority Tier
          </div>

          <div className="space-y-0.5">
            {PRIORITY_ORDER.map((levelKey) => {
              const cfg = getPriorityConfig(levelKey, appMode);
              const isSelected = (priority || "wanna_see") === levelKey;

              return (
                <button
                  key={levelKey}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPriority(levelKey);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? `${cfg.badgeBg} ${cfg.badgeText} font-bold border ${cfg.badgeBorder}`
                      : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                  }`}
                >
                  <span className="leading-tight font-semibold">{cfg.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

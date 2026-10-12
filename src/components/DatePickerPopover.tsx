import React, { useRef } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import type { AppMode } from "../types";

interface DatePickerPopoverProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  maxDate?: string; // YYYY-MM-DD
  compact?: boolean;
  appMode?: AppMode;
  verb?: string; // Custom prefix like "Watched", "Played", etc.
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({
  value,
  onChange,
  maxDate = getTodayString(),
  compact = false,
  appMode = "cinema",
  verb,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const actionVerb = verb || (appMode === "gaming" ? "Played" : "Watched");

  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();
  const currentDateValue = value || todayStr;

  const openPicker = () => {
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === "function") {
        try {
          inputRef.current.showPicker();
          return;
        } catch {
          // fallback to click
        }
      }
      try {
        inputRef.current.click();
      } catch {
        // focus fallback
        inputRef.current.focus();
      }
    }
  };

  // Format human-readable date label
  const getDisplayLabel = () => {
    if (!value) {
      return compact ? "Today" : `${actionVerb} Today`;
    }
    if (value === todayStr) {
      return compact ? "Today" : `${actionVerb} Today`;
    }
    if (value === yesterdayStr) {
      return compact ? "Yesterday" : `${actionVerb} Yesterday`;
    }
    try {
      const parts = value.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const dt = new Date(parts[0], parts[1] - 1, parts[2]);
        const formatted = dt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return compact ? formatted : `${actionVerb} ${formatted}`;
      }
    } catch {
      // Fallback
    }
    return compact ? value : `${actionVerb} ${value}`;
  };

  const isCustomDate = value && value !== todayStr && value !== yesterdayStr;

  // COMPACT MODE: (used in timeline cards & dense lists)
  if (compact) {
    return (
      <div
        className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-amber-500/50 shadow-xs transition-all cursor-pointer group select-none"
        title="Change date with native calendar"
        onClick={openPicker}
      >
        <CalendarIcon className="w-3 h-3 text-amber-400 shrink-0 group-hover:scale-105 transition-transform" />
        <span className="pointer-events-none">{getDisplayLabel()}</span>
        <ChevronDown className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors pointer-events-none" />

        {/* Native HTML5 date input - overlays container directly */}
        <input
          ref={inputRef}
          type="date"
          value={currentDateValue}
          max={maxDate}
          style={{ colorScheme: "dark" }}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
            }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Pick date"
          title="Click to select date"
        />
      </div>
    );
  }

  // STANDARD MODE: (used in Rate & Mark Watched / Played Modal)
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {/* Quick 1-Tap "Today" Pill */}
      <button
        type="button"
        onClick={() => onChange(todayStr)}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
          value === todayStr
            ? "bg-gradient-to-r from-amber-400 to-amber-300 text-zinc-950 font-bold border-amber-400 shadow-sm shadow-amber-500/20"
            : "bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 hover:border-zinc-700"
        }`}
        title="Mark as Today"
      >
        Today
      </button>

      {/* Quick 1-Tap "Yesterday" Pill */}
      <button
        type="button"
        onClick={() => onChange(yesterdayStr)}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
          value === yesterdayStr
            ? "bg-gradient-to-r from-amber-400 to-amber-300 text-zinc-950 font-bold border-amber-400 shadow-sm shadow-amber-500/20"
            : "bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 hover:border-zinc-700"
        }`}
        title="Mark as Yesterday"
      >
        Yesterday
      </button>

      {/* Native Calendar Button: Triggers native Windows & Android calendar picker */}
      <div
        onClick={openPicker}
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-xs group select-none ${
          isCustomDate
            ? "bg-gradient-to-r from-amber-500/15 to-yellow-500/10 text-amber-200 border-amber-500/40 ring-1 ring-amber-500/30 font-bold"
            : "bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700"
        }`}
        title="Open native calendar (Windows & Android)"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform pointer-events-none" />
        <span className="pointer-events-none">{isCustomDate ? getDisplayLabel() : "Other Date"}</span>
        <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors ml-0.5 pointer-events-none" />

        {/* Native date input overlay with full-size picker indicator */}
        <input
          ref={inputRef}
          type="date"
          value={currentDateValue}
          max={maxDate}
          style={{ colorScheme: "dark" }}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
            }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Pick date"
          title="Open native calendar"
        />
      </div>
    </div>
  );
};

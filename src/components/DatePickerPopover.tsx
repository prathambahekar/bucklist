import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface DatePickerPopoverProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  maxDate?: string; // YYYY-MM-DD
  compact?: boolean;
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today
  const selectedDate = value || getTodayString();
  const [selectedY, selectedM, selectedD] = selectedDate.split("-").map(Number);

  // Month navigation state
  const [viewYear, setViewYear] = useState<number>(selectedY || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(
    selectedM !== undefined ? selectedM - 1 : new Date().getMonth()
  );

  // Sync view when opened
  useEffect(() => {
    if (isOpen && value) {
      const [y, m] = value.split("-").map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [isOpen, value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate days for the month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${viewYear}-${mm}-${dd}`;
    if (maxDate && dateStr > maxDate) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  // Format label for button
  const getButtonLabel = () => {
    if (value === todayStr) {
      return compact ? "Today" : "Watched Today";
    }
    if (value === yesterdayStr) {
      return compact ? "Yesterday" : "Watched Yesterday";
    }
    try {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) {
        const dt = new Date(y, m - 1, d);
        if (compact) {
          return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
        return `Watched ${dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      }
    } catch {
      // fallback
    }
    return compact ? value : `Watched ${value}`;
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Simple Button with Calendar Icon */}
      <button
        type="button"
        id="watched-date-picker-button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border ${
          compact
            ? "px-2 py-0.5 rounded-md text-[11px] font-medium"
            : "px-3.5 py-1.5 rounded-full text-xs font-semibold"
        } ${
          isOpen
            ? "bg-zinc-800 text-white border-amber-500/60 ring-2 ring-amber-500/20"
            : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700"
        }`}
        title="Click to select watched date"
      >
        <CalendarIcon className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} text-amber-400 shrink-0`} />
        <span>{getButtonLabel()}</span>
      </button>

      {/* Floating Mini Calendar Popover */}
      {isOpen && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{ maxWidth: "calc(100vw - 32px)" }}
        >
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-zinc-800/80">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
              }}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                value === todayStr
                  ? "bg-amber-500 text-zinc-950 font-bold"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(yesterdayStr);
                setIsOpen(false);
              }}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                value === yesterdayStr
                  ? "bg-amber-500 text-zinc-950 font-bold"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
              }`}
            >
              Yesterday
            </button>
          </div>

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-zinc-200">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
              <span key={dayName} className="text-[10px] font-bold text-zinc-500">
                {dayName}
              </span>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="w-7 h-7" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mm = String(viewMonth + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const currentDayStr = `${viewYear}-${mm}-${dd}`;
              const isSelected = value === currentDayStr;
              const isToday = currentDayStr === todayStr;
              const isFuture = Boolean(maxDate && currentDayStr > maxDate);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isFuture}
                  onClick={() => handleSelectDay(day)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isFuture
                      ? "text-zinc-700 opacity-40 cursor-not-allowed"
                      : isSelected
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20 scale-105"
                      : isToday
                      ? "bg-zinc-800 text-amber-300 hover:bg-zinc-700 font-bold border border-amber-500/30"
                      : "text-zinc-300 hover:bg-zinc-800/90 hover:text-white"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

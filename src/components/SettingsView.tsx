import React, { useState, useRef } from "react";
import {
  Download,
  Upload,
  Check,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Database,
  X,
  Send,
  ChevronRight,
  BarChart3,
  Users,
  Layers,
  Code2,
} from "lucide-react";
import {
  downloadBackupToStorage,
  shareBackupToApps,
  validateAndParseBackupJson,
  applyImportedBackup,
  resetAllLocalData,
  getLocalBlendEnabled,
  saveLocalBlendEnabled,
  getLocalCollectionsEnabled,
  saveLocalCollectionsEnabled,
} from "../lib/storage";
import type { TvProgressMap } from "../lib/storage";
import type { ImportValidationResult, WatchlistMovie } from "../types";
import { StatsView } from "./StatsView";

interface SettingsViewProps {
  watched: WatchlistMovie[];
  movies: WatchlistMovie[];
  tvProgressMap: TvProgressMap;
  blendEnabled: boolean;
  onToggleBlend: (enabled: boolean) => void;
  collectionsEnabled: boolean;
  onToggleCollections: (enabled: boolean) => void;
  onDataUpdated: () => void;
  onNavigateToWatchlist?: () => void;
}

export function SettingsView({
  watched,
  movies,
  tvProgressMap,
  blendEnabled,
  onToggleBlend,
  collectionsEnabled,
  onToggleCollections,
  onDataUpdated,
  onNavigateToWatchlist,
}: SettingsViewProps) {
  // Settings view mode: "stats" | "data" | "developer"
  const [activeTab, setActiveTab] = useState<"stats" | "data" | "developer">("stats");

  // Reset confirmation modal state
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Export Drawer state
  const [showExportDrawer, setShowExportDrawer] = useState(false);

  // Notifications
  const [exportNotification, setExportNotification] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Import state
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setShowExportDrawer(true);
    } else {
      handleExportToStorage();
    }
  };

  const handleExportToStorage = async () => {
    const result = await downloadBackupToStorage();
    if (result.success) {
      setExportNotification(`Saved ${result.filename} to Downloads.`);
    } else {
      setExportNotification(result.error || "Failed to trigger backup download.");
    }
    setShowExportDrawer(false);
    setTimeout(() => setExportNotification(null), 4500);
  };

  const handleShareToApps = async () => {
    try {
      const result = await shareBackupToApps();
      if (result.success) {
        setExportNotification(`Backup file shared (${result.filename}).`);
      } else if (result.error) {
        setExportNotification(result.error);
      }
    } catch (err: any) {
      setExportNotification("Sharing failed.");
    } finally {
      setShowExportDrawer(false);
    }
    setTimeout(() => setExportNotification(null), 4500);
  };

  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedFileName(file.name);
    setNotification(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const result = validateAndParseBackupJson(content);
        setValidationResult(result);
      }
    };
    reader.onerror = () => {
      setValidationResult({
        valid: false,
        error: "Failed to read the selected backup file.",
      });
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!validationResult || !validationResult.valid || !validationResult.data) {
      return;
    }

    setIsProcessing(true);
    try {
      const outcome = applyImportedBackup(validationResult.data, importMode);
      onDataUpdated();

      let msg = "";
      if (importMode === "replace") {
        msg = `Restored ${outcome.totalItems} items (${outcome.tvProgressMerged} TV series).`;
      } else {
        msg = `Import complete: ${outcome.newItemsAdded} added, ${outcome.itemsUpdated} updated. Total: ${outcome.totalItems}.`;
      }

      setNotification(msg);
      setSelectedFileName(null);
      setValidationResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setValidationResult({
        valid: false,
        error: `Import failed: ${(err as Error).message || "Unknown error"}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelImport = () => {
    setSelectedFileName(null);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExecuteReset = () => {
    resetAllLocalData();
    onDataUpdated();
    setShowResetConfirmModal(false);
    setNotification("All local data and progress have been cleared.");
  };

  return (
    <div id="settings-view" className="w-full max-w-4xl mx-auto py-1 sm:py-2 px-1 animate-in fade-in duration-200">
      {/* Top Segmented Navigation (Stats vs Backup vs Developer) */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
          <button
            type="button"
            id="settings-tab-stats"
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "stats"
                ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Stats</span>
          </button>

          <button
            type="button"
            id="settings-tab-data"
            onClick={() => setActiveTab("data")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "data"
                ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Data</span>
          </button>

          <button
            type="button"
            id="settings-tab-developer"
            onClick={() => setActiveTab("developer")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "developer"
                ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Developer</span>
          </button>
        </div>
      </div>

      {/* STATS VIEW */}
      {activeTab === "stats" && (
        <StatsView
          watched={watched}
          movies={movies}
          tvProgressMap={tvProgressMap}
          onNavigateToWatchlist={onNavigateToWatchlist}
        />
      )}

      {/* DEVELOPER VIEW */}
      {activeTab === "developer" && (
        <div id="developer-settings-tab" className="max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
          {/* Experimental Features & Feature Flags Card */}
          <div className="bg-[#18181b] border border-zinc-800/90 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100 tracking-tight leading-tight">
                  Developer Flags & Features
                </h2>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  Configure experimental tabs, view modes, and capabilities
                </p>
              </div>
            </div>

            {/* Blend Toggle Row */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                      Blend Mode
                    </h3>
                    <span className="text-[9px] bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.2 rounded-full border border-amber-400/30 font-mono">
                      LABS
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                    Show the Blend tab for shared group watchlists & taste matching
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                id="toggle-blend-feature-btn"
                type="button"
                role="switch"
                aria-checked={blendEnabled}
                onClick={() => {
                  const newVal = !blendEnabled;
                  saveLocalBlendEnabled(newVal);
                  onToggleBlend(newVal);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  blendEnabled ? "bg-amber-400" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                    blendEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Collections Toggle Row */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                      Franchises & Collections
                    </h3>
                    <span className="text-[9px] bg-zinc-800 text-zinc-300 font-bold px-1.5 py-0.2 rounded-full border border-zinc-700 font-mono">
                      FEATURE
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                    Enable sagas, movie universes, and custom list curation in the Watched tab
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                id="toggle-collections-feature-btn"
                type="button"
                role="switch"
                aria-checked={collectionsEnabled}
                onClick={() => {
                  const newVal = !collectionsEnabled;
                  saveLocalCollectionsEnabled(newVal);
                  onToggleCollections(newVal);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  collectionsEnabled ? "bg-amber-400" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                    collectionsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATA & BACKUP VIEW */}
      {activeTab === "data" && (
        <div className="max-w-md mx-auto space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          {/* Notifications */}
          {(notification || exportNotification) && (
            <div className="mb-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 text-emerald-300 text-xs shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium leading-tight">{notification || exportNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNotification(null);
                  setExportNotification(null);
                }}
                className="text-emerald-400 hover:text-emerald-200 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Compact Main Data Card */}
          <div className="bg-[#18181b] border border-zinc-800/90 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-0.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-sm shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100 tracking-tight leading-tight">
                    Data
                  </h2>
                  <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Export, import, or manage local storage
                  </p>
                </div>
              </div>
            </div>

            {/* Hidden File Input for Native File Selection */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />

            {/* 2 Primary Side-by-Side Action Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Direct Instant Export Card */}
              <button
                id="settings-card-export-btn"
                type="button"
                onClick={handleExportClick}
                className="rounded-2xl p-3.5 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 border min-h-[92px] active:scale-[0.98] bg-zinc-950/60 hover:bg-zinc-850 border-zinc-800/80 hover:border-amber-500/50 group"
              >
                <Download className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-zinc-100 mt-2 group-hover:text-amber-300 transition-colors">
                  Export
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  Save or share backup
                </span>
              </button>

              {/* Direct Native Import Card */}
              <button
                id="settings-card-import-btn"
                type="button"
                onClick={handleTriggerImport}
                className="rounded-2xl p-3.5 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 border min-h-[92px] active:scale-[0.98] bg-zinc-950/60 hover:bg-zinc-850 border-zinc-800/80 hover:border-blue-500/50 group"
              >
                <Upload className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-zinc-100 mt-2 group-hover:text-blue-300 transition-colors">
                  Import
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  Restore .json backup
                </span>
              </button>
            </div>

            {/* Import Validation & Confirmation Card */}
            {validationResult && !validationResult.valid && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 text-red-300 text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{validationResult.error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelImport}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {validationResult && validationResult.valid && validationResult.summary && (
              <div className="bg-zinc-950/90 border border-blue-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{validationResult.summary.totalItems} titles ready to import</span>
                  </span>
                  <span className="text-[11px] text-zinc-400 truncate max-w-[150px]">
                    {selectedFileName}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs">
                  <span className="text-zinc-400">Import strategy:</span>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-zinc-200">
                      <input
                        type="radio"
                        name="import-strategy"
                        checked={importMode === "merge"}
                        onChange={() => setImportMode("merge")}
                        className="accent-amber-500"
                      />
                      <span>Merge</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-zinc-200">
                      <input
                        type="radio"
                        name="import-strategy"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                        className="accent-red-500"
                      />
                      <span>Replace All</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleExecuteImport}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing...</span>
                      </span>
                    ) : (
                      <span>Confirm Import</span>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCancelImport}
                    className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs border border-zinc-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Row: Reset All Data Trigger */}
            <div className="pt-2 border-t border-zinc-800/80">
              <button
                id="settings-reset-all-row-btn"
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="w-full flex items-center justify-between py-2 px-1 rounded-xl text-left group cursor-pointer hover:bg-red-500/10 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-red-400/90 group-hover:text-red-300 font-semibold text-xs sm:text-sm transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Reset all data</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Bottom Drawer Modal */}
      {showExportDrawer && (
        <div
          id="export-drawer-backdrop"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowExportDrawer(false)}
        >
          <div
            id="export-drawer-content"
            className="w-full max-w-md bg-[#18181b] border-t sm:border border-zinc-800 rounded-t-[2rem] sm:rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Drag Pill (Mobile) */}
            <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full mx-auto -mt-2 mb-2 sm:hidden" />

            {/* Drawer Header */}
            <div className="flex items-center gap-3.5 px-1">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center text-amber-500 shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-zinc-100 leading-tight">Export Backup</h3>
                <p className="text-[13px] text-zinc-400 mt-1">Save or share your backup file</p>
              </div>
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-1">
              {/* Option 1: Export to Storage */}
              <button
                id="export-to-storage-option-btn"
                type="button"
                onClick={handleExportToStorage}
                className="w-full flex items-center justify-between p-4 rounded-3xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all text-left group cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[15px] font-bold text-zinc-100 group-hover:text-white truncate">
                      Export to Storage
                    </span>
                    <span className="block text-[12px] text-zinc-400 truncate mt-0.5">
                      Save file directly to Downloads folder
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 ml-2" />
              </button>

              {/* Option 2: Share to Apps */}
              <button
                id="share-to-apps-option-btn"
                type="button"
                onClick={handleShareToApps}
                className="w-full flex items-center justify-between p-4 rounded-3xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all text-left group cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[15px] font-bold text-zinc-100 group-hover:text-white truncate">
                      Share to Apps
                    </span>
                    <span className="block text-[12px] text-zinc-400 truncate mt-0.5">
                      Send via WhatsApp, Telegram, Drive, Email
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 ml-2" />
              </button>
            </div>

            {/* Cancel Button */}
            <button
              id="export-drawer-cancel-btn"
              type="button"
              onClick={() => setShowExportDrawer(false)}
              className="w-full py-3.5 px-4 rounded-3xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white font-bold text-[14px] transition-colors cursor-pointer text-center active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-100">Reset All Data?</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  This will permanently clear all your saved movies, ratings, and TV series progress from this browser.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                id="modal-confirm-reset-btn"
                type="button"
                onClick={handleExecuteReset}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-98"
              >
                Yes, Delete All
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs border border-zinc-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

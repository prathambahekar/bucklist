import React, { useState, useRef } from "react";
import {
  Download,
  Upload,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Database,
  X,
  ChevronRight,
  FileCode2,
} from "lucide-react";
import {
  createBackupPayload,
  downloadBackupFile,
  validateAndParseBackupJson,
  applyImportedBackup,
  resetAllLocalData,
} from "../lib/storage";
import type { ImportValidationResult } from "../types";

interface SettingsViewProps {
  onDataUpdated: () => void;
  onNavigateToWatchlist?: () => void;
}

export function SettingsView({
  onDataUpdated,
  onNavigateToWatchlist,
}: SettingsViewProps) {
  // Active expandable section: "export" | "import" | null
  const [expandedSection, setExpandedSection] = useState<"export" | "import" | null>(null);

  // Reset confirmation modal state (direct dialog, no inline accordion)
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Export states
  const [copied, setCopied] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  // Import states
  const [importInputMode, setImportInputMode] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentBackup = createBackupPayload();
  const currentJsonString = JSON.stringify(currentBackup, null, 2);

  const toggleSection = (section: "export" | "import") => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(currentJsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = currentJsonString;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleQuickExport = () => {
    downloadBackupFile();
    setExportNotification("Backup file downloaded successfully.");
    setTimeout(() => setExportNotification(null), 4000);
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
        setExpandedSection("import");
      }
    };
    reader.onerror = () => {
      setValidationResult({
        valid: false,
        error: "Failed to read the selected file.",
      });
      setExpandedSection("import");
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setPasteText(text);
    setNotification(null);
    if (!text.trim()) {
      setValidationResult(null);
      return;
    }
    const result = validateAndParseBackupJson(text);
    setValidationResult(result);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
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
      setExpandedSection(null);
      setPasteText("");
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

  const handleExecuteReset = () => {
    resetAllLocalData();
    onDataUpdated();
    setShowResetConfirmModal(false);
    setNotification("All local data and progress have been cleared.");
  };

  return (
    <div id="settings-view" className="w-full max-w-md mx-auto py-2 sm:py-4 px-1 sm:px-2 animate-in fade-in duration-200">
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

      {/* Compact Main Card */}
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

          {onNavigateToWatchlist && (
            <button
              id="close-settings-btn"
              type="button"
              onClick={onNavigateToWatchlist}
              className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2 Primary Side-by-Side Action Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Export Card */}
          <button
            id="settings-card-export-btn"
            type="button"
            onClick={() => toggleSection("export")}
            className={`rounded-2xl p-3.5 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 border min-h-[92px] active:scale-[0.98] ${
              expandedSection === "export"
                ? "bg-zinc-800/90 border-amber-500/70 ring-2 ring-amber-500/20 shadow-md"
                : "bg-zinc-950/60 hover:bg-zinc-800/50 border-zinc-800/80 hover:border-zinc-700"
            }`}
          >
            <Download
              className={`w-5 h-5 transition-colors shrink-0 ${
                expandedSection === "export" ? "text-amber-400" : "text-zinc-200"
              }`}
            />
            <span className="text-xs sm:text-sm font-bold text-zinc-100 mt-2">
              Export
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
              Save or share backup
            </span>
          </button>

          {/* Import Card */}
          <button
            id="settings-card-import-btn"
            type="button"
            onClick={() => toggleSection("import")}
            className={`rounded-2xl p-3.5 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 border min-h-[92px] active:scale-[0.98] ${
              expandedSection === "import"
                ? "bg-zinc-800/90 border-blue-500/70 ring-2 ring-blue-500/20 shadow-md"
                : "bg-zinc-950/60 hover:bg-zinc-800/50 border-zinc-800/80 hover:border-zinc-700"
            }`}
          >
            <Upload
              className={`w-5 h-5 transition-colors shrink-0 ${
                expandedSection === "import" ? "text-blue-400" : "text-zinc-200"
              }`}
            />
            <span className="text-xs sm:text-sm font-bold text-zinc-100 mt-2">
              Import
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
              Restore from backup
            </span>
          </button>
        </div>

        {/* Expandable Section 1: Export Panel */}
        {expandedSection === "export" && (
          <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Watchlist</span>
              </span>
              <button
                type="button"
                onClick={() => setShowExportPreview(!showExportPreview)}
                className="text-[11px] text-zinc-400 hover:text-amber-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <FileCode2 className="w-3 h-3" />
                <span>{showExportPreview ? "Hide JSON" : "View JSON"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickExport}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/10 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .json File</span>
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 transition-all cursor-pointer active:scale-[0.98]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">JSON Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON Text</span>
                  </>
                )}
              </button>
            </div>

            {showExportPreview && (
              <pre className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-36 select-all animate-in fade-in">
                {currentJsonString}
              </pre>
            )}
          </div>
        )}

        {/* Expandable Section 2: Import Panel */}
        {expandedSection === "import" && (
          <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Import JSON Backup</span>
              </span>
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setImportInputMode("file");
                    setValidationResult(null);
                  }}
                  className={`text-[10px] font-medium py-1 px-2.5 rounded cursor-pointer transition-colors ${
                    importInputMode === "file"
                      ? "bg-zinc-800 text-zinc-100 font-bold"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportInputMode("paste");
                    setValidationResult(null);
                  }}
                  className={`text-[10px] font-medium py-1 px-2.5 rounded cursor-pointer transition-colors ${
                    importInputMode === "paste"
                      ? "bg-zinc-800 text-zinc-100 font-bold"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Paste
                </button>
              </div>
            </div>

            {importInputMode === "file" ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl py-3 px-3 flex items-center justify-center gap-2 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                    : selectedFileName
                    ? "border-emerald-500/50 bg-emerald-500/5 text-zinc-200"
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 text-zinc-400"
                }`}
              >
                <Upload className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs font-medium truncate">
                  {selectedFileName ? selectedFileName : "Choose or drop JSON backup file"}
                </span>
              </div>
            ) : (
              <textarea
                rows={2}
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder="Paste backup JSON data here..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            )}

            {validationResult && !validationResult.valid && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 flex items-center gap-2 text-red-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{validationResult.error}</span>
              </div>
            )}

            {validationResult && validationResult.valid && validationResult.summary && (
              <div className="space-y-2.5 pt-1.5 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>{validationResult.summary.totalItems} titles valid</span>
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <label className="inline-flex items-center gap-1 cursor-pointer text-zinc-300">
                      <input
                        type="radio"
                        name="mobile-import-strategy"
                        checked={importMode === "merge"}
                        onChange={() => setImportMode("merge")}
                        className="accent-amber-500"
                      />
                      <span>Merge</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer text-zinc-300">
                      <input
                        type="radio"
                        name="mobile-import-strategy"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                        className="accent-red-500"
                      />
                      <span>Replace</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecuteImport}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </span>
                  ) : (
                    <span>Confirm & Import ({importMode === "merge" ? "Merge" : "Replace All"})</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Row: Reset All Data Trigger (No expand/collapse, directly opens modal) */}
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

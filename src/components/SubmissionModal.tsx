import React, { useState, useEffect } from "react";
import { SubmissionReason, StudentDetails, NetworkCheckStatus } from "../types";
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  Send, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  User, 
  RotateCw, 
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Smartphone
} from "lucide-react";

interface SubmissionModalProps {
  isOpen: boolean;
  reason: SubmissionReason;
  isSubmitting: boolean;
  answeredCount: number;
  totalQuestions: number;
  isOnline: boolean;
  student?: StudentDetails | null;
  networkCheckStatus?: NetworkCheckStatus;
  onConfirm: () => void;
  onCancel: () => void;
  onToggleNetworkSim?: (online: boolean) => void;
  onCheckNetworkNow?: () => void;
  isCheckingNetwork?: boolean;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  reason,
  isSubmitting,
  answeredCount,
  totalQuestions,
  isOnline,
  student,
  networkCheckStatus,
  onConfirm,
  onCancel,
  onToggleNetworkSim,
  onCheckNetworkNow,
  isCheckingNetwork = false,
}) => {
  const [offlineWarning, setOfflineWarning] = useState<string | null>(null);
  const [hasClickedSubmit, setHasClickedSubmit] = useState(false);

  // Reset local submission click lock when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setHasClickedSubmit(false);
      setOfflineWarning(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unansweredCount = totalQuestions - answeredCount;
  const isEmergency = reason === "AUTO_NETWORK_DETECTED" || reason === "TIMER_EXPIRED";

  const handleFinalSubmitClick = () => {
    if (isSubmitting || hasClickedSubmit) return;
    if (!isOnline && reason !== "AUTO_NETWORK_DETECTED") {
      setOfflineWarning("Internet connection is required! Please turn ON your network to submit your personal details and quiz score.");
      return;
    }
    setHasClickedSubmit(true);
    setOfflineWarning(null);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="exam-submission-confirmation-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div
          className={`p-5 text-white ${
            reason === "AUTO_NETWORK_DETECTED"
              ? "bg-rose-600"
              : reason === "TIMER_EXPIRED"
              ? "bg-amber-600"
              : isOnline
              ? "bg-emerald-600"
              : "bg-blue-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
              {reason === "AUTO_NETWORK_DETECTED" ? (
                <Wifi className="w-6 h-6 animate-pulse text-white" />
              ) : reason === "TIMER_EXPIRED" ? (
                <Clock className="w-6 h-6 text-white" />
              ) : isOnline ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <Send className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {reason === "AUTO_NETWORK_DETECTED"
                  ? "Network Connection Detected!"
                  : reason === "TIMER_EXPIRED"
                  ? "Time Limit Expired!"
                  : "Final Exam Submission"}
              </h3>
              <p className="text-xs text-white/90 mt-0.5">
                {reason === "AUTO_NETWORK_DETECTED"
                  ? "Network online event captured. Submitting responses now."
                  : reason === "TIMER_EXPIRED"
                  ? "Allotted exam duration has concluded."
                  : "Personal info and quiz score will be submitted together."}
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Candidate Identification Preview */}
          {student && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Candidate Information
                </span>
                <span className="font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {student.enrollmentNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Name</span>
                  <span className="font-semibold text-slate-900">{student.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Roll Number</span>
                  <span className="font-semibold text-slate-900 font-mono">{student.roll}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Department & Section</span>
                  <span className="font-medium text-slate-800">{student.department} • {student.section}</span>
                </div>
              </div>
            </div>
          )}

          {/* Answer Progress Breakdown */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="p-2">
              <span className="block text-2xl font-bold text-emerald-600">
                {answeredCount}
              </span>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Answered
              </span>
            </div>
            <div className="p-2 border-l border-slate-200">
              <span className="block text-2xl font-bold text-slate-400">
                {unansweredCount}
              </span>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Unanswered
              </span>
            </div>
          </div>

          {unansweredCount > 0 && !isEmergency && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You still have {unansweredCount} unanswered question(s). Unanswered questions will be scored as zero.</span>
            </p>
          )}

          {/* Network Status & Instructions (Requirement: Last submit button clicked when network is on or tells user to turn on network) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Network Connection Status</span>
              {onCheckNetworkNow && (
                <button
                  type="button"
                  onClick={onCheckNetworkNow}
                  disabled={isCheckingNetwork}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3 h-3 ${isCheckingNetwork ? "animate-spin" : ""}`} />
                  <span>Check Network</span>
                </button>
              )}
            </div>

            {isOnline ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs leading-relaxed space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="flex items-center gap-1.5">
                    {networkCheckStatus?.isMobileNetwork ? (
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Wifi className="w-4 h-4 text-emerald-600" />
                    )}
                    {networkCheckStatus?.isMobileNetwork
                      ? `Mobile Network Active (${networkCheckStatus.effectiveType ? networkCheckStatus.effectiveType.toUpperCase() : "Cellular"})`
                      : "Network is ON (Internet Connected)"}
                  </span>
                </div>
                <p className="text-emerald-900">
                  Your device is online via {networkCheckStatus?.isMobileNetwork ? "cellular mobile network" : "internet connection"}. The last submit button is ready. Clicking submit will transmit your personal details and quiz score together directly.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Network is OFF (Device Offline)</span>
                </div>
                <p className="text-amber-900">
                  <strong>Action Required:</strong> Please turn ON your Wi-Fi or mobile data network to submit your answers and save your scorecard.
                </p>
                {onToggleNetworkSim && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleNetworkSim(true);
                      setOfflineWarning(null);
                    }}
                    className="w-full mt-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Turn ON Network Connection Now</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Warning Message Banner if user tried submitting while offline */}
          {offlineWarning && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs leading-relaxed flex items-start gap-2 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{offlineWarning}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {!isEmergency && !isSubmitting ? (
            <button
              type="button"
              id="btn-cancel-modal"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer text-center"
            >
              Back to Questions
            </button>
          ) : (
            <div className="text-[11px] text-slate-400">
              {isEmergency ? "Auto-finalizing exam submission..." : ""}
            </div>
          )}

          <button
            type="button"
            id="btn-confirm-submit-modal"
            onClick={handleFinalSubmitClick}
            disabled={isSubmitting || hasClickedSubmit}
            className={`w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isSubmitting || hasClickedSubmit
                ? "bg-slate-400 cursor-not-allowed"
                : !isOnline && reason !== "AUTO_NETWORK_DETECTED"
                ? "bg-amber-600 hover:bg-amber-700"
                : reason === "AUTO_NETWORK_DETECTED"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
            }`}
          >
            {isSubmitting || hasClickedSubmit ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Examination...</span>
              </>
            ) : !isOnline && reason !== "AUTO_NETWORK_DETECTED" ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Turn ON Network to Submit</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Examination</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

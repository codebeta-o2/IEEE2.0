import React from "react";
import { NetworkCheckStatus, NetworkMode, StudentDetails } from "../types";
import { 
  Clock, 
  Wifi, 
  WifiOff, 
  Send, 
  AlertTriangle, 
  User, 
  GraduationCap, 
  RotateCw, 
  Activity, 
  ShieldCheck,
  Smartphone,
  Shield
} from "lucide-react";

interface QuizHeaderProps {
  student: StudentDetails;
  timeRemainingSeconds: number;
  totalDurationSeconds: number;
  isOnline: boolean;
  networkMode?: NetworkMode;
  networkCheckStatus: NetworkCheckStatus;
  isCheckingNetwork: boolean;
  onToggleNetworkMode?: (mode: NetworkMode) => void;
  onCheckNetworkNow: () => void;
  onToggleNetworkSim?: (targetOnline: boolean) => void;
  onRequestManualSubmit: () => void;
  totalQuestions: number;
  answeredCount: number;
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({
  student,
  timeRemainingSeconds,
  totalDurationSeconds,
  isOnline,
  networkMode,
  networkCheckStatus,
  isCheckingNetwork,
  onToggleNetworkMode,
  onCheckNetworkNow,
  onToggleNetworkSim,
  onRequestManualSubmit,
  totalQuestions,
  answeredCount,
}) => {
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const timePercentage = Math.max(0, Math.min(100, (timeRemainingSeconds / totalDurationSeconds) * 100));
  const isTimeCritical = timeRemainingSeconds <= 60;
  const isTimeWarning = timeRemainingSeconds <= 180 && !isTimeCritical;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Network Alert Warning Ribbon if Online */}
      {isOnline && (
        <div className="bg-rose-600 text-white text-xs py-2 px-4 font-bold flex items-center justify-center gap-2 animate-pulse shadow-inner">
          <AlertTriangle className="w-4 h-4" />
          <span>
            {networkCheckStatus.isMobileNetwork 
              ? "MOBILE NETWORK (CELLULAR DATA) DETECTED! Active mobile network captured by watchdog. Submitting exam to server..." 
              : "NETWORK ONLINE DETECTED! Real-time watchdog captured active network. Submitting exam to server..."}
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Student Credentials Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[170px] sm:max-w-[220px]">
                  {student.name}
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-md font-mono bg-slate-100 text-slate-700 border border-slate-200">
                  {student.roll}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{student.department} • {student.section}</span>
              </div>
            </div>
          </div>

          {/* Center & Right Controls: Real-time Network Watchdog, Anti-Copy Guard, Timer, Submit */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-3">
            {/* Anti-Copy Protection Status Pill */}
            <div 
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/90 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200"
              title="Copy, Cut, Paste, Right-Click, and text selection are strictly disabled for examination integrity."
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Copy-Paste Blocked</span>
            </div>

            {/* Real-time Network Proctor Watchdog Box */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs">
              {/* Online/Offline Status Indicator */}
              <div 
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-bold transition-all ${
                  isOnline
                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
                title={
                  isOnline 
                    ? networkCheckStatus.isMobileNetwork 
                      ? "Device is on Mobile Network (Cellular Data)! Auto-submit in progress." 
                      : "Device is Online via Wi-Fi! Auto-submit in progress."
                    : "Device is Offline / Airplane Mode (Exam integrity protected)"
                }
              >
                {isOnline ? (
                  networkCheckStatus.isMobileNetwork ? (
                    <>
                      <Smartphone className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      <span>Mobile Data (Violation!)</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      <span>Online (Violation!)</span>
                    </>
                  )
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Offline (Secure)</span>
                  </>
                )}
              </div>

              {/* Active Watchdog Polling Pulse & Last Check Badge */}
              <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-slate-500 font-medium border-l border-slate-200">
                <span className="relative flex h-2 w-2 mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span title="Continuous background check runs every 1.5s during quiz">
                  Watchdog: 1.5s
                </span>
                {networkCheckStatus.checksCount > 0 && (
                  <span className="text-slate-400">
                    (#{networkCheckStatus.checksCount})
                  </span>
                )}
              </div>

              {/* Manual "Check Now" Probe Button */}
              <button
                type="button"
                id="btn-check-network-now"
                onClick={onCheckNetworkNow}
                disabled={isCheckingNetwork}
                title="Immediately probe device connectivity and network sockets"
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isCheckingNetwork ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>

            {/* Live Countdown Timer */}
            <div 
              id="quiz-timer-container"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
                isTimeCritical
                  ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                  : isTimeWarning
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <Clock className={`w-4 h-4 ${isTimeCritical ? "text-rose-600" : isTimeWarning ? "text-amber-600" : "text-slate-500"}`} />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold tracking-wider leading-none text-slate-400">
                  Time Left
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm tracking-tight leading-tight">
                  {formattedTime}
                </span>
              </div>
            </div>

            {/* Answered Counter & Finish Button */}
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline text-xs text-slate-500 font-medium">
                {answeredCount}/{totalQuestions} Answered
              </span>
              <button
                type="button"
                id="btn-submit-exam-header"
                onClick={onRequestManualSubmit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Subtle Timer Progress Line */}
        <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isTimeCritical ? "bg-rose-500" : isTimeWarning ? "bg-amber-500" : "bg-blue-600"
            }`}
            style={{ width: `${timePercentage}%` }}
          />
        </div>
      </div>
    </header>
  );
};


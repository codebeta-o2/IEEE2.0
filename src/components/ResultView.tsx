import React, { useState } from "react";
import { QuizSubmission } from "../types";
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Clock, 
  WifiOff, 
  Wifi, 
  User, 
  RotateCcw, 
  Printer, 
  Eye, 
  ArrowLeftRight,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  FileText,
  EyeOff,
  Loader2,
  FileSpreadsheet,
  Lock,
  ExternalLink
} from "lucide-react";
import { getGoogleSheetUrl, sendSubmissionToGoogleSheet } from "../utils/googleSheetsSync";

interface ResultViewProps {
  submission: QuizSubmission;
  onRetakeExam: () => void;
  onOpenInvigilatorLog: () => void;
  onSubmitToNetwork?: () => Promise<void>;
  isSubmittingToNetwork?: boolean;
  sheetSyncResult?: {
    submissionId: string;
    success: boolean;
    message?: string;
    rowNumber?: number;
  } | null;
}

export const ResultView: React.FC<ResultViewProps> = ({
  submission,
  onRetakeExam,
  onOpenInvigilatorLog,
  onSubmitToNetwork,
  isSubmittingToNetwork = false,
  sheetSyncResult,
}) => {
  const [filter, setFilter] = useState<"ALL" | "CORRECT" | "INCORRECT" | "UNANSWERED">("ALL");
  const [sheetSyncState, setSheetSyncState] = useState<{
    status: "idle" | "syncing" | "success" | "error";
    message: string;
    rowNumber?: number;
  }>(() => {
    const result = sheetSyncResult?.submissionId === submission.id ? sheetSyncResult : null;
    if (result?.success) {
      return {
        status: "success",
        message: result.message || "Exam scorecard and candidate details were saved to Google Sheets.",
        rowNumber: result.rowNumber,
      };
    }
    if (result) {
      return { status: "error", message: result.message || "Google Sheets did not confirm the write." };
    }
    return {
      status: submission.isSubmittedOnNetwork ? "error" : "idle",
      message: submission.isSubmittedOnNetwork
        ? "Google Sheets did not confirm the write. Select Sync Now to retry."
        : "Ready to record examination.",
    };
  });

  const { student, breakdown, score, totalQuestions, percentage, timeSpentSeconds, submissionReason, toggleCount } = submission;

  React.useEffect(() => {
    if (sheetSyncResult?.submissionId !== submission.id) return;
    setSheetSyncState({
      status: sheetSyncResult.success ? "success" : "error",
      message: sheetSyncResult.message || (sheetSyncResult.success
        ? "Exam scorecard and candidate details were saved to Google Sheets."
        : "Google Sheets did not confirm the write. Select Sync Now to retry."),
      rowNumber: sheetSyncResult.rowNumber,
    });
  }, [sheetSyncResult, submission.id]);

  // Auto-attempt sync ONLY if taking exam offline and not already submitted on network
  React.useEffect(() => {
    let mounted = true;
    if (submission.isSubmittedOnNetwork) {
      // Already submitted & recorded on the network. Never send duplicate data!
      return;
    }

    setSheetSyncState({ status: "syncing", message: "Recording exam scorecard..." });
    
    sendSubmissionToGoogleSheet(
      submission,
      submission.giftAwarded || "None",
      submission.attemptNumber || 1
    ).then((res) => {
      if (!mounted) return;
      if (res.success) {
        setSheetSyncState({
          status: "success",
          message: res.message || "Exam scorecard successfully recorded!",
          rowNumber: res.data?.rowNumber,
        });
      } else {
        setSheetSyncState({
          status: "error",
          message: res.message || "Could not save scorecard at this time.",
        });
      }
    }).catch((err) => {
      if (!mounted) return;
      setSheetSyncState({
        status: "error",
        message: err.message || "Connection error while saving scorecard.",
      });
    });

    return () => {
      mounted = false;
    };
  }, [submission.id, submission.isSubmittedOnNetwork]);

  const handleManualSheetSync = async () => {
    setSheetSyncState({ status: "syncing", message: "Pushing submission to database..." });
    try {
      const res = await sendSubmissionToGoogleSheet(
        submission,
        submission.giftAwarded || "None",
        submission.attemptNumber || 1
      );
      if (res.success) {
        setSheetSyncState({
          status: "success",
          message: res.message || "Exam scorecard saved successfully!",
          rowNumber: res.data?.rowNumber,
        });
      } else {
        setSheetSyncState({
          status: "error",
          message: res.message || "Failed to record scorecard.",
        });
      }
    } catch (e: any) {
      setSheetSyncState({
        status: "error",
        message: e.message || "Network exception while syncing.",
      });
    }
  };

  const filteredBreakdown = breakdown.filter((item) => {
    if (filter === "CORRECT") return item.isCorrect;
    if (filter === "INCORRECT") return item.selectedOption !== null && !item.isCorrect;
    if (filter === "UNANSWERED") return item.selectedOption === null;
    return true;
  });

  const minutesSpent = Math.floor(timeSpentSeconds / 60);
  const secondsSpent = timeSpentSeconds % 60;
  const formattedTimeSpent = `${minutesSpent}m ${secondsSpent}s`;

  const getReasonDetails = () => {
    switch (submissionReason) {
      case "AUTO_NETWORK_DETECTED":
        return {
          title: "Auto-Submitted: Network Connection Detected",
          description: "Anti-tamper safeguard triggered. Network connectivity was established during the offline session.",
          color: "bg-rose-50 border-rose-200 text-rose-800",
          icon: Wifi,
          badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
        };
      case "TIMER_EXPIRED":
        return {
          title: "Auto-Submitted: 20-Minute Time Limit Expired",
          description: "The countdown timer completed. Responses were automatically locked and evaluated.",
          color: "bg-amber-50 border-amber-200 text-amber-800",
          icon: Clock,
          badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        };
      case "MANUAL_SUBMISSION":
      default:
        return {
          title: "Candidate Manual Submission",
          description: "Exam concluded and successfully verified by candidate before evaluation.",
          color: "bg-emerald-50 border-emerald-200 text-emerald-800",
          icon: ShieldCheck,
          badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
        };
    }
  };

  const reasonInfo = getReasonDetails();
  const ReasonIcon = reasonInfo.icon;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Top Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Official Examination Result & Evaluation
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            MCQ Performance Scorecard
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            id="btn-print-scorecard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={onOpenInvigilatorLog}
            id="btn-view-server-audit"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Examiner Portal</span>
          </button>

          <button
            type="button"
            onClick={onRetakeExam}
            id="btn-retake-exam"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Candidate</span>
          </button>
        </div>
      </div>

      {/* Prominent Successfully Submitted Notification Banner */}
      <div 
        id="banner-successfully-submitted"
        className="p-5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl shadow-xs animate-in fade-in duration-300"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm ring-4 ring-emerald-100">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-emerald-950">
                  Exam Submitted
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">
                  ✓ Recorded in Database
                </span>
                <span className="text-[11px] font-mono text-emerald-800 bg-white/80 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  Attempt {submission.attemptNumber || 1} of 2
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-900 mt-1 leading-relaxed">
                The exam server received the scorecard for <strong>{student.name}</strong> (Roll: <strong>{student.roll}</strong>, Enrollment: <strong>{student.enrollmentNumber}</strong>): <strong>{score}/{totalQuestions}</strong> (<strong>{percentage}%</strong>). Google Sheets storage is reported separately below.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center bg-white/70 px-4 py-2 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-emerald-950">Record Verified</p>
              <p className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Confirmed & Logged
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Reason Banner */}
      <div className={`p-4 rounded-2xl border flex items-start sm:items-center justify-between gap-3 ${reasonInfo.color}`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-white/80 rounded-xl shadow-2xs shrink-0">
            <ReasonIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold">{reasonInfo.title}</h2>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border font-bold ${reasonInfo.badgeColor}`}>
                {submissionReason}
              </span>
            </div>
            <p className="text-xs mt-0.5 opacity-90">{reasonInfo.description}</p>
          </div>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <span className="text-[11px] block font-mono text-slate-500">
            {new Date(submission.submittedAt).toLocaleTimeString()}
          </span>
          <span className="text-[10px] font-semibold mt-0.5 block">
            {submission.isSubmittedOnNetwork ? (
              <span className="text-emerald-700 flex items-center justify-end gap-1">
                <Wifi className="w-3 h-3 text-emerald-600" />
                Submitted to Network
              </span>
            ) : (
              <span className="text-amber-700 flex items-center justify-end gap-1">
                <WifiOff className="w-3 h-3 text-amber-600" />
                Concluded Offline (Unsubmitted)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Central Database Live Synchronization Status Banner */}
      <div 
        id="record-sync-status-card"
        className={`p-4 rounded-2xl border transition-all ${
          sheetSyncState.status === "success"
            ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
            : sheetSyncState.status === "syncing"
            ? "bg-blue-50/80 border-blue-300 text-blue-900"
            : sheetSyncState.status === "error"
            ? "bg-rose-50/80 border-rose-300 text-rose-900"
            : "bg-amber-50/80 border-amber-300 text-amber-900"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              sheetSyncState.status === "success"
                ? "bg-emerald-600 text-white"
                : sheetSyncState.status === "syncing"
                ? "bg-blue-600 text-white"
                : sheetSyncState.status === "error"
                ? "bg-rose-600 text-white"
                : "bg-amber-600 text-white"
            }`}>
              {sheetSyncState.status === "syncing" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : sheetSyncState.status === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : sheetSyncState.status === "error" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold">
                  {sheetSyncState.status === "success"
                    ? "Examination Record Synchronized"
                    : sheetSyncState.status === "syncing"
                    ? "Syncing Examination Record..."
                    : sheetSyncState.status === "error"
                    ? "Synchronization Alert"
                    : "Ready to Synchronize"}
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                  sheetSyncState.status === "success"
                    ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                    : sheetSyncState.status === "syncing"
                    ? "bg-blue-100 border-blue-300 text-blue-800"
                    : sheetSyncState.status === "error"
                    ? "bg-rose-100 border-rose-300 text-rose-800"
                    : "bg-amber-100 border-amber-300 text-amber-800"
                }`}>
                  {sheetSyncState.status === "success"
                    ? "CONFIRMED"
                    : sheetSyncState.status === "syncing"
                    ? "CONNECTING"
                    : sheetSyncState.status === "error"
                    ? "SYNC FAILED"
                    : "STANDBY"}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                {sheetSyncState.message || "Submissions are recorded and securely logged in the central database."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleManualSheetSync}
              disabled={sheetSyncState.status === "syncing"}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                sheetSyncState.status === "success"
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : sheetSyncState.status === "error"
                  ? "bg-rose-700 hover:bg-rose-800 text-white"
                  : "bg-blue-700 hover:bg-blue-800 text-white"
              }`}
            >
              {sheetSyncState.status === "syncing" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>{sheetSyncState.status === "syncing" ? "Syncing..." : "Sync Now"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Candidate Profile & Score Summary Bento */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Candidate Identity Card */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Verified Candidate Credentials
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-lg font-bold text-slate-900">{student.name}</p>
                <p className="text-xs text-slate-500">{student.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Roll Number</span>
                  <span className="font-mono font-bold text-slate-800">{student.roll}</span>
                </div>
                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200">
                  <span className="text-blue-600 block text-[10px] uppercase font-bold">Enrollment (Primary Key)</span>
                  <span className="font-mono font-bold text-blue-900">{student.enrollmentNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department & Section</span>
                  <span className="font-medium text-slate-800 truncate block">{student.department} • {student.section}</span>
                </div>
                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
                  <span className="text-amber-700 block text-[10px] uppercase font-bold">Candidate Attempt</span>
                  <span className="font-semibold text-amber-900">
                    Attempt {submission.attemptNumber || 1} of 2 {submission.attemptNumber === 2 ? "(Final)" : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>ID: {submission.id}</span>
            <span>{totalQuestions} Questions Evaluated</span>
          </div>
        </div>

        {/* Score & Metrics Card */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Evaluation Metrics
          </h3>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Primary Score */}
            <div className="col-span-1 p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-center flex flex-col justify-center">
              <span className="text-3xl font-black text-blue-700 tracking-tight">
                {score}<span className="text-sm font-semibold text-blue-500">/{totalQuestions}</span>
              </span>
              <span className="text-[11px] uppercase font-bold text-blue-900 mt-1">
                Final Score
              </span>
            </div>

            {/* Percentage */}
            <div className="col-span-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center flex flex-col justify-center">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {percentage}%
              </span>
              <span className="text-[11px] uppercase font-bold text-slate-600 mt-1">
                Accuracy
              </span>
            </div>

            {/* Time Taken */}
            <div className="col-span-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center flex flex-col justify-center">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {formattedTimeSpent}
              </span>
              <span className="text-[11px] uppercase font-bold text-slate-600 mt-1">
                Time Elapsed
              </span>
            </div>
          </div>

          {/* Sub metrics: Correct, Incorrect, Unanswered, Toggles */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="block font-bold text-emerald-700 text-sm">{submission.correctAnswersCount}</span>
              <span className="text-[10px] text-emerald-800 font-medium">Correct</span>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
              <span className="block font-bold text-rose-700 text-sm">{submission.incorrectAnswersCount}</span>
              <span className="text-[10px] text-rose-800 font-medium">Incorrect</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 border border-slate-200">
              <span className="block font-bold text-slate-600 text-sm">{submission.unansweredCount}</span>
              <span className="text-[10px] text-slate-500 font-medium">Unanswered</span>
            </div>
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200" title="Cognitive proctoring metric: times candidate toggled between question text and options view">
              <span className="block font-bold text-indigo-700 text-sm">{toggleCount}</span>
              <span className="text-[10px] text-indigo-800 font-medium">Q/Opt Toggles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Key & Solutions Section - ONLY shown after submitting on the network */}
      {submission.isSubmittedOnNetwork ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Comprehensive Question Review & Solutions
                </h2>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Submitted on Network
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your responses against official correct options and explanations.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({breakdown.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("CORRECT")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === "CORRECT"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Correct ({submission.correctAnswersCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("INCORRECT")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === "INCORRECT"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                Incorrect ({submission.incorrectAnswersCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("UNANSWERED")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === "UNANSWERED"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Skipped ({submission.unansweredCount})
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {filteredBreakdown.map((item, idx) => {
              const hasAnswered = item.selectedOption !== null;
              const isCorrect = item.isCorrect;

              return (
                <div
                  key={item.questionId}
                  className={`p-5 rounded-2xl border transition-all ${
                    !hasAnswered
                      ? "bg-slate-50/60 border-slate-200"
                      : isCorrect
                      ? "bg-emerald-50/30 border-emerald-200"
                      : "bg-rose-50/30 border-rose-200"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-slate-200 text-slate-800 shadow-2xs">
                        Q{item.questionNumber}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                        {item.questionText}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {!hasAnswered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Not Answered
                        </span>
                      ) : isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Correct (+1)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5" />
                          Incorrect (0)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4 Options Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                    {item.options.map((optText, optIdx) => {
                      const isCandidateChoice = item.selectedOption === optIdx;
                      const isOfficialCorrect = item.correctOption === optIdx;
                      const optLabel = ["A", "B", "C", "D"][optIdx];

                      let cardClass = "bg-white border-slate-200 text-slate-700";
                      let badgeClass = "bg-slate-100 text-slate-600";

                      if (isOfficialCorrect) {
                        cardClass = "bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-300 font-medium";
                        badgeClass = "bg-emerald-600 text-white";
                      } else if (isCandidateChoice && !isCorrect) {
                        cardClass = "bg-rose-50 border-rose-300 text-rose-900 font-medium";
                        badgeClass = "bg-rose-600 text-white";
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${cardClass}`}
                        >
                          <span className={`w-5 h-5 rounded-md font-bold text-[11px] flex items-center justify-center shrink-0 ${badgeClass}`}>
                            {optLabel}
                          </span>
                          <div className="flex-1">
                            <p>{optText}</p>
                            {isCandidateChoice && (
                              <span className="text-[10px] font-bold mt-1 block text-slate-500 uppercase">
                                {isCorrect ? "✓ Your Selection (Correct)" : "✗ Your Selection"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-0.5">Solution Explanation:</span>
                    <p>{item.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Concealed Review & Solutions State: Not shown before submitting to the network */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <EyeOff className="w-7 h-7" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <WifiOff className="w-3.5 h-3.5 text-amber-700" />
              Examination Concluded in Offline Mode
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Questions & Official Solutions Concealed
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with examination protocols, <strong>Comprehensive Question Review & Solutions</strong> (official answers and detailed explanations) are <strong>not shown before submitting to the server on the network</strong>.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your candidate responses have been locked on this device. Connect to the network or click below to transmit your examination to the server. Official solutions will be unlocked immediately upon network submission.
            </p>
          </div>

          {onSubmitToNetwork && (
            <div className="pt-3">
              <button
                type="button"
                id="btn-submit-to-server-network"
                onClick={onSubmitToNetwork}
                disabled={isSubmittingToNetwork}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSubmittingToNetwork ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting to Server over Network...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Submit to Server on Network & Unlock Solutions</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

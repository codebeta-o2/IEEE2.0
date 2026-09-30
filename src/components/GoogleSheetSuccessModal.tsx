import React from "react";
import { QuizSubmission } from "../types";
import { 
  CheckCircle2, 
  FileSpreadsheet, 
  Award, 
  User, 
  Check, 
  X, 
  ChevronRight, 
  Clock, 
  Hash, 
  ExternalLink 
} from "lucide-react";

interface GoogleSheetSuccessModalProps {
  isOpen: boolean;
  submission: QuizSubmission | null;
  sheetData?: {
    rowNumber?: number;
    message?: string;
  } | null;
  onClose: () => void;
}

export const GoogleSheetSuccessModal: React.FC<GoogleSheetSuccessModalProps> = ({
  isOpen,
  submission,
  sheetData,
  onClose,
}) => {
  if (!isOpen || !submission) return null;

  const { student, score, totalQuestions, percentage, attemptNumber } = submission;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="google-sheet-success-popup"
        className="bg-white rounded-2xl shadow-2xl border border-emerald-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-emerald-400/40">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Submission Successful!
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            Your personal information and quiz score have been successfully recorded in the official examination database.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
            <span>Record Status: <strong>Confirmed & Saved</strong></span>
            {Boolean(sheetData?.rowNumber) && (
              <span className="bg-white text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-md ml-1">
                Ref #{sheetData?.rowNumber}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Success Status Alert Box */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-950">Data Successfully Saved</p>
              <p className="text-emerald-800 mt-0.5">
                {sheetData?.message || "Scorecard and candidate identification details recorded successfully."}
              </p>
            </div>
          </div>

          {/* Candidate Personal Information Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Personal Information Submitted</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Candidate Name</span>
                <span className="font-bold text-slate-900 truncate block">{student.name}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</span>
                <span className="font-bold text-slate-900 truncate block">{student.phone}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Roll Number</span>
                <span className="font-bold text-slate-900 font-mono block">{student.roll}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrollment ID</span>
                <span className="font-bold text-slate-900 font-mono truncate block">{student.enrollmentNumber}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Department & Sec</span>
                <span className="font-bold text-slate-900 truncate block">{student.department} • {student.section}</span>
              </div>
            </div>
          </div>

          {/* Quiz Score & Award Card */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-950 font-bold text-xs uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span>Quiz Performance Score</span>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                Attempt #{attemptNumber || 1} of 2
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100">
              <div>
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {score}
                  <span className="text-sm font-medium text-slate-400">/{totalQuestions}</span>
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-2">
                  ({percentage}% Score)
                </span>
              </div>

            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-emerald-600 font-bold block">Correct</span>
                <span className="font-bold text-slate-800">{submission.correctAnswersCount}</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-rose-600 font-bold block">Incorrect</span>
                <span className="font-bold text-slate-800">{submission.incorrectAnswersCount}</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">Unanswered</span>
                <span className="font-bold text-slate-800">{submission.unansweredCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Submitted at {new Date(submission.submittedAt).toLocaleTimeString()}</span>
          </div>

          <button
            type="button"
            id="btn-close-success-modal"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>View Scorecard & Review</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

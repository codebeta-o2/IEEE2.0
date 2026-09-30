import React, { useEffect, useState } from "react";
import { QuizSubmission } from "../types";
import { 
  X, 
  RefreshCw, 
  Wifi, 
  Clock, 
  ShieldCheck, 
  Trash2, 
  Search, 
  Eye,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface InvigilatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewSubmissionDetails?: (sub: QuizSubmission) => void;
}

export const InvigilatorModal: React.FC<InvigilatorModalProps> = ({
  isOpen,
  onClose,
  onViewSubmissionDetails,
}) => {
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/submissions");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all server submission logs?")) return;
    try {
      await fetch("/api/submissions", { method: "DELETE" });
      setSubmissions([]);
    } catch (err) {
      console.error("Failed to clear submissions:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubmissions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = submissions.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.student.name.toLowerCase().includes(term) ||
      s.student.roll.toLowerCase().includes(term) ||
      s.student.enrollmentNumber.toLowerCase().includes(term) ||
      s.student.department.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">Examiner & Server Submission Log</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300">
                {submissions.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live server records of all student submissions, network triggers, and scores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSubmissions}
              title="Refresh logs"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleClear}
              title="Clear all logs"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate by name, roll number, or enrollment..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Fetching server records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <p className="text-sm font-semibold">No submissions recorded yet.</p>
              <p className="text-xs">
                Take the quiz and trigger submission (either via completion, timer, or network online detection).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((sub) => {
                const isNetworkTrigger = sub.submissionReason === "AUTO_NETWORK_DETECTED";
                const isTimerTrigger = sub.submissionReason === "TIMER_EXPIRED";

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {sub.student.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                          {sub.student.roll}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                          {sub.student.enrollmentNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <span>{sub.student.department} • {sub.student.section}</span>
                        <span className="mx-1.5">•</span>
                        <span>{new Date(sub.submittedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Trigger badge */}
                      <div>
                        {isNetworkTrigger ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            <Wifi className="w-3 h-3 text-rose-600" />
                            Network Auto-Submit
                          </span>
                        ) : isTimerTrigger ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Timer Auto-Submit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Candidate Manual
                          </span>
                        )}
                      </div>

                      {/* Score Chip */}
                      <div className="text-right">
                        <span className="block text-sm font-black text-slate-900">
                          {sub.score}/{sub.totalQuestions}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {sub.percentage}%
                        </span>
                      </div>

                      {onViewSubmissionDetails && (
                        <button
                          type="button"
                          onClick={() => onViewSubmissionDetails(sub)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                          title="View Scorecard"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Evaluated on Express Server</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

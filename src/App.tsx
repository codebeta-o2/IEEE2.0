import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  StudentDetails, 
  QuestionData, 
  QuizSubmission, 
  ExamStep, 
  QuestionViewMode, 
  SubmissionReason,
  NetworkMode,
  NetworkCheckStatus
} from "./types";
import { 
  probeDeviceConnectivity, 
  subscribeToNetworkEvents, 
  inspectConnectionDetails 
} from "./utils/networkMonitor";
import { setupAntiCopyPasteGuard } from "./utils/antiCheating";
import { AntiCheatNotification } from "./components/AntiCheatNotification";
import { selectRandomQuestions, evaluateExamAnswers, fetchExamQuestions } from "./utils/questionSelector";
import { RegistrationForm } from "./components/RegistrationForm";
import { QuizHeader } from "./components/QuizHeader";
import { ToggledQuestionView } from "./components/ToggledQuestionView";
import { QuestionPalette } from "./components/QuestionPalette";
import { SubmissionModal } from "./components/SubmissionModal";
import { GoogleSheetSuccessModal } from "./components/GoogleSheetSuccessModal";
import { ResultView } from "./components/ResultView";
import { InvigilatorModal } from "./components/InvigilatorModal";
import { recordLocalAttempt, getLocalAttempts } from "./utils/attemptTracker";
import { 
  sendSubmissionToGoogleSheet, 
  flushPendingSubmissions, 
  getGoogleSheetUrl,
  initGoogleSheetSync 
} from "./utils/googleSheetsSync";
import { 
  ShieldAlert, 
  Wifi, 
  WifiOff, 
  Clock, 
  FileText, 
  CheckCircle,
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";

const TOTAL_DURATION_SECONDS = 1200; // 20 minutes (1 minute per question for 20 questions)

export default function App() {
  // Core Navigation State
  const [step, setStep] = useState<ExamStep>("REGISTRATION");

  // Student details
  const [student, setStudent] = useState<StudentDetails | null>(null);

  // Questions state: automatically selected 20 questions randomly from JSON bank
  const [questions, setQuestions] = useState<QuestionData[]>(() => selectRandomQuestions(20));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Student Answers state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(() => {
    const initial = selectRandomQuestions(20);
    return new Set([initial[0]?.id || "q1"]);
  });

  // The Crucial User Requirement: Toggled Question and Option View
  // "the qustion and the 4 options willlbe show togoled mens at a time ether question or option will be show ."
  const [viewMode, setViewMode] = useState<QuestionViewMode>("QUESTION");
  const [toggleCount, setToggleCount] = useState<number>(0);

  // Time limit state
  const [timeRemaining, setTimeRemaining] = useState<number>(TOTAL_DURATION_SECONDS);

  // Network State & Offline Proctoring
  // The exam must be taken in offline mode. If anyone is on the network, auto-submit!
  const [networkMode, setNetworkMode] = useState<NetworkMode>("REAL_DEVICE");
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : false;
  });
  const [hasNetworkTriggered, setHasNetworkTriggered] = useState<boolean>(false);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState<boolean>(false);
  const [networkCheckStatus, setNetworkCheckStatus] = useState<NetworkCheckStatus>(() => {
    const details = inspectConnectionDetails();
    return {
      isOnline: details.isOnline,
      isMobileNetwork: details.isMobileNetwork,
      connectionType: details.connectionType,
      effectiveType: details.effectiveType,
      networkLabel: details.networkLabel,
      isMobileDevice: details.isMobileDevice,
      lastChecked: null,
      checkMethod: "navigator",
      checksCount: 0,
    };
  });

  // Anti-Cheating Protection: globally blocks copy, cut, paste, right-click, and forbidden shortcuts
  useEffect(() => {
    const teardownAntiCheat = setupAntiCopyPasteGuard();
    return () => {
      teardownAntiCheat();
    };
  }, []);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState<boolean>(false);
  const [submissionReason, setSubmissionReason] = useState<SubmissionReason>("MANUAL_SUBMISSION");
  const [submissionResult, setSubmissionResult] = useState<QuizSubmission | null>(null);

  // Google Sheet Success Feedback Popup
  const [sheetSuccessModalOpen, setSheetSuccessModalOpen] = useState<boolean>(false);
  const [sheetSuccessData, setSheetSuccessData] = useState<{ rowNumber?: number; message?: string } | null>(null);
  const [sheetSyncResult, setSheetSyncResult] = useState<{ submissionId: string; success: boolean; rowNumber?: number; message?: string } | null>(null);

  // Invigilator / Server Log Modal
  const [invigilatorModalOpen, setInvigilatorModalOpen] = useState<boolean>(false);

  // Refs for tracking active state in listeners
  const activeStepRef = useRef(step);
  activeStepRef.current = step;

  const isSubmittingRef = useRef(isSubmitting);
  isSubmittingRef.current = isSubmitting;

  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  const networkModeRef = useRef(networkMode);
  networkModeRef.current = networkMode;

  const submissionResultRef = useRef(submissionResult);
  submissionResultRef.current = submissionResult;

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const studentRef = useRef(student);
  studentRef.current = student;

  const timeRemainingRef = useRef(timeRemaining);
  timeRemainingRef.current = timeRemaining;

  const toggleCountRef = useRef(toggleCount);
  toggleCountRef.current = toggleCount;

  // Single-submission safeguard ref to prevent duplicate submissions
  const hasCompletedSubmissionRef = useRef(false);

  // Load questions from server if accessible and sync Google Sheet URL
  useEffect(() => {
    initGoogleSheetSync();

    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => {
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        }
      })
      .catch((err) => {
        console.log("Using built-in question bank:", err);
      });
  }, []);

  // Server Submission Pipeline
  const executeSubmission = useCallback(async (reason: SubmissionReason) => {
    if (isSubmittingRef.current || hasCompletedSubmissionRef.current) return;
    isSubmittingRef.current = true;
    hasCompletedSubmissionRef.current = true;
    setIsSubmitting(true);
    setSubmissionReason(reason);

    const currentStudent = studentRef.current;
    if (!currentStudent) {
      isSubmittingRef.current = false;
      hasCompletedSubmissionRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const isNetworkActive = isOnlineRef.current || reason === "AUTO_NETWORK_DETECTED";

    // If on network (or network auto-detected trigger), submit directly to the server!
    if (isNetworkActive) {
      try {
        const payload = {
          student: currentStudent,
          answers: answersRef.current,
          questionIds: questions.map((q) => q.id),
          timeRemainingSeconds: timeRemainingRef.current,
          totalDurationSeconds: TOTAL_DURATION_SECONDS,
          submissionReason: reason,
          toggleCount: toggleCountRef.current,
        };

        const response = await fetch("/api/submit-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Server rejected submission");
        }

        const data = await response.json();
        const attemptNum = data.submission.attemptNumber || 1;

        recordLocalAttempt(currentStudent.enrollmentNumber, {
          attemptNumber: attemptNum,
          timestamp: data.submission.submittedAt || new Date().toISOString(),
          score: data.submission.score,
          totalQuestions: data.submission.totalQuestions,
          percentage: data.submission.percentage,
          giftAwarded: "None",
          submissionId: data.submission.id,
        });

        const finalSubmission: QuizSubmission = {
          ...data.submission,
          attemptNumber: attemptNum,
          giftAwarded: "None",
          isSubmittedOnNetwork: true,
          networkSubmittedAt: data.submission.networkSubmittedAt || new Date().toISOString(),
        };

        setSubmissionResult(finalSubmission);
        setSubmissionModalOpen(false);
        setStep("SUBMISSION_RESULT");
        setIsSubmitting(false);

        const syncResult = {
          submissionId: finalSubmission.id,
          success: data.sheetResult?.success === true,
          rowNumber: data.sheetResult?.data?.rowNumber,
          message: data.sheetResult?.message || "Google Sheet storage was not confirmed.",
        };
        setSheetSyncResult(syncResult);
        if (syncResult.success) {
          setSheetSuccessData(syncResult);
          setSheetSuccessModalOpen(true);
        }
        return;
      } catch (error) {
        console.error("Online submission failed, falling back to local recording:", error);
      }
    }

    // Offline mode conclusion: accurately evaluate responses against the question bank
    const evaluation = evaluateExamAnswers(answersRef.current, questions);
    const fallbackBreakdown = evaluation.breakdown.map((b) => ({
      ...b,
      explanation: "Official explanation is locked and will be unlocked once submitted to the exam server over the network.",
    }));

    const percentage = Math.round((evaluation.correctCount / questions.length) * 100);
    const priorLocal = getLocalAttempts(currentStudent.enrollmentNumber);
    const attemptNum = priorLocal.length + 1;

    const offlineSubmission: QuizSubmission = {
      id: `sub_${Date.now()}`,
      student: currentStudent,
      answers: answersRef.current,
      score: evaluation.correctCount,
      totalQuestions: questions.length,
      correctAnswersCount: evaluation.correctCount,
      incorrectAnswersCount: evaluation.incorrectCount,
      unansweredCount: evaluation.unansweredCount,
      percentage,
      timeSpentSeconds: Math.max(0, TOTAL_DURATION_SECONDS - timeRemainingRef.current),
      totalDurationSeconds: TOTAL_DURATION_SECONDS,
      submissionReason: reason,
      toggleCount: toggleCountRef.current,
      submittedAt: new Date().toISOString(),
      isSubmittedOnNetwork: false, // NOT submitted on network yet!
      attemptNumber: attemptNum,
      giftAwarded: "None",
      breakdown: fallbackBreakdown,
    };

    recordLocalAttempt(currentStudent.enrollmentNumber, {
      attemptNumber: attemptNum,
      timestamp: offlineSubmission.submittedAt,
      score: offlineSubmission.score,
      totalQuestions: offlineSubmission.totalQuestions,
      percentage: offlineSubmission.percentage,
      giftAwarded: "None",
      submissionId: offlineSubmission.id,
    });

    sendSubmissionToGoogleSheet(offlineSubmission, "None", attemptNum);

    setSubmissionResult(offlineSubmission);
    setSubmissionModalOpen(false);
    setStep("SUBMISSION_RESULT");
    setIsSubmitting(false);
  }, [questions]);

  // Submit to Server on Network (e.g., when connecting to network after taking exam offline)
  const handleSubmitToNetwork = useCallback(async () => {
    const currentSub = submissionResultRef.current;
    if (!currentSub || isSubmittingRef.current) return;
    setIsSubmitting(true);

    try {
      const payload = {
        student: currentSub.student,
        answers: currentSub.answers,
        questionIds: currentSub.breakdown.map((b) => b.questionId),
        timeRemainingSeconds: Math.max(0, TOTAL_DURATION_SECONDS - currentSub.timeSpentSeconds),
        totalDurationSeconds: TOTAL_DURATION_SECONDS,
        submissionReason: currentSub.submissionReason,
        toggleCount: currentSub.toggleCount,
      };

      const response = await fetch("/api/submit-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Server rejected submission");
      }

      const data = await response.json();
      setIsOnline(true);

      const updatedSub: QuizSubmission = {
        ...data.submission,
        attemptNumber: data.submission.attemptNumber || currentSub.attemptNumber || 1,
        giftAwarded: "None",
        isSubmittedOnNetwork: true,
        networkSubmittedAt: new Date().toISOString(),
      };

      setSubmissionResult(updatedSub);
      const syncResult = {
        submissionId: updatedSub.id,
        success: data.sheetResult?.success === true,
        rowNumber: data.sheetResult?.data?.rowNumber,
        message: data.sheetResult?.message || "Google Sheet storage was not confirmed.",
      };
      setSheetSyncResult(syncResult);
      if (syncResult.success) {
        setSheetSuccessData({
          rowNumber: data.sheetResult.data?.rowNumber,
          message: data.sheetResult.message,
        });
        setSheetSuccessModalOpen(true);
      }
      flushPendingSubmissions();
    } catch (error) {
      console.error("Failed to submit to server on network:", error);
      alert("Could not connect to the exam server. Please check your connection and retry.");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Active Network Checker & Watchdog
  // Actively probes device network reachability and browser interfaces
  const performNetworkCheck = useCallback(async (source: "watchdog" | "manual" | "event" = "watchdog") => {
    setIsCheckingNetwork(true);
    try {
      const probe = await probeDeviceConnectivity(1800);

      setNetworkCheckStatus((prev) => ({
        isOnline: probe.isOnline,
        isMobileNetwork: probe.isMobileNetwork,
        connectionType: probe.connectionType,
        effectiveType: probe.effectiveType,
        networkLabel: probe.networkLabel,
        isMobileDevice: probe.isMobileDevice,
        lastChecked: probe.timestamp,
        checkMethod: probe.method,
        latencyMs: probe.latencyMs,
        checksCount: prev.checksCount + 1,
      }));

      // In REAL_DEVICE mode, the probed device status drives the app network state
      if (networkModeRef.current === "REAL_DEVICE") {
        setIsOnline(probe.isOnline);

        // Active Check: If the device is detected as online DURING ACTIVE QUIZ:
        if (probe.isOnline) {
          flushPendingSubmissions();
        }

        if (probe.isOnline && activeStepRef.current === "QUIZ_ACTIVE" && !isSubmittingRef.current) {
          console.warn(`[Proctor Engine] Active network detected during quiz (${probe.networkLabel})! Triggering auto-submit...`);
          setHasNetworkTriggered(true);
          setSubmissionReason("AUTO_NETWORK_DETECTED");
          setSubmissionModalOpen(true);
          setTimeout(() => {
            executeSubmission("AUTO_NETWORK_DETECTED");
          }, 1200);
        } else if (
          probe.isOnline &&
          activeStepRef.current === "SUBMISSION_RESULT" &&
          submissionResultRef.current &&
          !submissionResultRef.current.isSubmittedOnNetwork &&
          !isSubmittingRef.current
        ) {
          // Auto-sync pending submission to server once device goes online in result view
          handleSubmitToNetwork();
        }
      }
    } catch (e) {
      console.error("[Proctor Engine] Network check error:", e);
    } finally {
      setIsCheckingNetwork(false);
    }
  }, [executeSubmission, handleSubmitToNetwork]);

  // Real Browser Network Online/Offline, Visibility & Connection API (Mobile Data) Listeners
  useEffect(() => {
    // Initial check on mount
    performNetworkCheck("event");

    const unsubscribe = subscribeToNetworkEvents(() => {
      performNetworkCheck("event");
    });

    return () => {
      unsubscribe();
    };
  }, [performNetworkCheck]);

  // Continuous Network Watchdog during Quiz: Actively verifies device network state every 1.5 seconds
  useEffect(() => {
    if (step !== "QUIZ_ACTIVE") return;

    // Run an immediate check on entering the quiz
    performNetworkCheck("event");

    const watchdogTimer = setInterval(() => {
      performNetworkCheck("watchdog");
    }, 1500);

    return () => clearInterval(watchdogTimer);
  }, [step, performNetworkCheck]);

  // Manual Network State Simulator Switch
  const handleToggleNetworkSim = (targetOnline: boolean) => {
    setIsOnline(targetOnline);
    setNetworkCheckStatus((prev) => ({
      isOnline: targetOnline,
      lastChecked: new Date(),
      checkMethod: "manual",
      checksCount: prev.checksCount + 1,
    }));

    if (targetOnline && activeStepRef.current === "QUIZ_ACTIVE" && !isSubmittingRef.current) {
      setHasNetworkTriggered(true);
      setSubmissionReason("AUTO_NETWORK_DETECTED");
      setSubmissionModalOpen(true);
      setTimeout(() => {
        executeSubmission("AUTO_NETWORK_DETECTED");
      }, 1000);
    } else if (
      targetOnline &&
      activeStepRef.current === "SUBMISSION_RESULT" &&
      submissionResultRef.current &&
      !submissionResultRef.current.isSubmittedOnNetwork &&
      !isSubmittingRef.current
    ) {
      // User turned on network while in result view -> submit to server
      handleSubmitToNetwork();
    }
  };

  const handleToggleNetworkMode = (mode: NetworkMode) => {
    setNetworkMode(mode);
    if (mode === "REAL_DEVICE") {
      performNetworkCheck("manual");
    }
  };

  const handleCheckNetworkNow = () => {
    performNetworkCheck("manual");
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (step !== "QUIZ_ACTIVE") return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Time expired: auto-submit!
          if (!isSubmittingRef.current) {
            setSubmissionReason("TIMER_EXPIRED");
            setSubmissionModalOpen(true);
            executeSubmission("TIMER_EXPIRED");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, executeSubmission]);

  // Start Exam Handler
  const handleStartExam = async (details: StudentDetails) => {
    // Reset submission lock states for new exam run
    hasCompletedSubmissionRef.current = false;
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    // Automatically retrieve randomized question set from secure backend
    const sessionQuestions = await fetchExamQuestions(20);
    setQuestions(sessionQuestions);
    setStudent(details);
    setTimeRemaining(TOTAL_DURATION_SECONDS);
    setAnswers({});
    setMarkedForReview(new Set());
    setVisitedQuestions(new Set([sessionQuestions[0]?.id || "q1"]));
    setCurrentQuestionIndex(0);
    setViewMode("QUESTION"); // start in Question view
    setToggleCount(0);
    setNetworkMode("REAL_DEVICE");
    setHasNetworkTriggered(false);
    performNetworkCheck("event");
    setStep("QUIZ_ACTIVE");
  };

  // Retake / New Candidate Handler
  const handleRetakeExam = async () => {
    hasCompletedSubmissionRef.current = false;
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    const freshQuestions = await fetchExamQuestions(20);
    setQuestions(freshQuestions);
    setVisitedQuestions(new Set([freshQuestions[0]?.id || "q1"]));
    setStudent(null);
    setSubmissionResult(null);
    setStep("REGISTRATION");
  };

  // Option selection
  const handleSelectOption = (optionIndex: number) => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
  };

  // Clear answer
  const handleClearOption = () => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
  };

  // Toggle Mark for Review
  const handleToggleMarkReview = () => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) {
        next.delete(currentQ.id);
      } else {
        next.add(currentQ.id);
      }
      return next;
    });
  };

  // Navigation handlers
  const handleNavigateToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentQuestionIndex(index);
    const targetQ = questions[index];
    setVisitedQuestions((prev) => new Set(prev).add(targetQ.id));
    // Keep user in Question view by default when switching questions
    setViewMode("QUESTION");
  };

  const handleNextQuestion = () => {
    handleNavigateToQuestion(currentQuestionIndex + 1);
  };

  const handlePrevQuestion = () => {
    handleNavigateToQuestion(currentQuestionIndex - 1);
  };

  const currentQ = questions[currentQuestionIndex] || questions[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Global Bar */}
      <nav className="bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold tracking-tight">IEEE DAY SPECIAL</span>
          <span className="text-slate-400 hidden sm:inline">GRSS/MTTS/SPS/APS/TEMS</span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">Anti-Cheating Network Monitor</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            id="badge-server-sync"
            className="text-xs text-emerald-300 flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-emerald-900/50"
            title="Automated examination synchronization active"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">System Synced</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <button
            type="button"
            id="btn-nav-server-logs"
            onClick={() => setInvigilatorModalOpen(true)}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Examiner Logs</span>
          </button>
        </div>
      </nav>

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {step === "REGISTRATION" && (
          <RegistrationForm
            onStartExam={handleStartExam}
            isOnline={isOnline}
            networkMode={networkMode}
            networkCheckStatus={networkCheckStatus}
            isCheckingNetwork={isCheckingNetwork}
            onToggleNetworkMode={handleToggleNetworkMode}
            onCheckNetworkNow={handleCheckNetworkNow}
            onToggleNetworkSim={handleToggleNetworkSim}
          />
        )}

        {step === "QUIZ_ACTIVE" && student && (
          <div className="flex-1 flex flex-col">
            {/* Examination Sticky Header */}
            <QuizHeader
              student={student}
              timeRemainingSeconds={timeRemaining}
              totalDurationSeconds={TOTAL_DURATION_SECONDS}
              isOnline={isOnline}
              networkMode={networkMode}
              networkCheckStatus={networkCheckStatus}
              isCheckingNetwork={isCheckingNetwork}
              onToggleNetworkMode={handleToggleNetworkMode}
              onCheckNetworkNow={handleCheckNetworkNow}
              onToggleNetworkSim={handleToggleNetworkSim}
              onRequestManualSubmit={() => {
                setSubmissionReason("MANUAL_SUBMISSION");
                setSubmissionModalOpen(true);
              }}
              totalQuestions={questions.length}
              answeredCount={Object.keys(answers).length}
            />

            {/* Offline Proctoring Alert Banner */}
            <div className="bg-blue-50/70 border-b border-blue-200/60 py-2 px-4 text-xs text-blue-900">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span>
                    <strong>Active Watchdog Monitoring:</strong> Device connectivity checked continuously ({networkCheckStatus.checksCount} checks). Going online triggers instant auto-submission.
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <span>Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 text-[10px] font-mono">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 text-[10px] font-mono">T</kbd> to toggle Q/Options</span>
                </div>
              </div>
            </div>

            {/* Quiz Work Area */}
            <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
              {/* Left Column: Toggled Question and Option View */}
              <div className="lg:col-span-8">
                <ToggledQuestionView
                  question={currentQ}
                  currentIndex={currentQuestionIndex}
                  totalQuestions={questions.length}
                  selectedOption={answers[currentQ.id]}
                  isMarkedForReview={markedForReview.has(currentQ.id)}
                  viewMode={viewMode}
                  onSetViewMode={setViewMode}
                  onSelectOption={handleSelectOption}
                  onClearOption={handleClearOption}
                  onToggleMarkReview={handleToggleMarkReview}
                  onNext={handleNextQuestion}
                  onPrev={handlePrevQuestion}
                  toggleCount={toggleCount}
                  onIncrementToggle={() => setToggleCount((c) => c + 1)}
                  onRequestSubmit={() => {
                    setSubmissionReason("MANUAL_SUBMISSION");
                    setSubmissionModalOpen(true);
                  }}
                />
              </div>

              {/* Right Column: Question Palette & Instructions */}
              <div className="lg:col-span-4 space-y-4">
                <QuestionPalette
                  questions={questions}
                  currentIndex={currentQuestionIndex}
                  answers={answers}
                  markedForReview={markedForReview}
                  visitedQuestions={visitedQuestions}
                  onSelectQuestion={handleNavigateToQuestion}
                />

                {/* Cognitive Rule Reminder */}
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                    Cognitive Toggle Rule
                  </h4>
                  <p className="leading-relaxed">
                    Either the question or options are visible at one time. Once you understand the question statement, switch to Options View to choose A, B, C, or D.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "SUBMISSION_RESULT" && submissionResult && (
          <ResultView
            submission={submissionResult}
            sheetSyncResult={sheetSyncResult}
            onRetakeExam={handleRetakeExam}
            onOpenInvigilatorLog={() => setInvigilatorModalOpen(true)}
            onSubmitToNetwork={handleSubmitToNetwork}
            isSubmittingToNetwork={isSubmitting}
          />
        )}
      </main>

      {/* Submission Confirmation & Emergency Network Modal */}
      <SubmissionModal
        isOpen={submissionModalOpen}
        reason={submissionReason}
        isSubmitting={isSubmitting}
        answeredCount={Object.keys(answers).length}
        totalQuestions={questions.length}
        isOnline={isOnline}
        student={student}
        networkCheckStatus={networkCheckStatus}
        onConfirm={() => executeSubmission(submissionReason)}
        onCancel={() => setSubmissionModalOpen(false)}
        onToggleNetworkSim={handleToggleNetworkSim}
        onCheckNetworkNow={handleCheckNetworkNow}
        isCheckingNetwork={isCheckingNetwork}
      />

      {/* Real-time Anti-Cheat Security Notification Toast */}
      <AntiCheatNotification />

      {/* Google Sheet Success Popup Notification */}
      <GoogleSheetSuccessModal
        isOpen={sheetSuccessModalOpen}
        submission={submissionResult}
        sheetData={sheetSuccessData}
        onClose={() => setSheetSuccessModalOpen(false)}
      />

      {/* Invigilator / Server Audit Log Drawer */}
      <InvigilatorModal
        isOpen={invigilatorModalOpen}
        onClose={() => setInvigilatorModalOpen(false)}
        onViewSubmissionDetails={(sub) => {
          setSubmissionResult(sub);
          setStep("SUBMISSION_RESULT");
          setInvigilatorModalOpen(false);
        }}
      />
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { QuestionData, QuestionViewMode } from "../types";
import { 
  BookOpen, 
  ListOrdered, 
  ArrowLeftRight, 
  Check, 
  Bookmark, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff,
  Code,
  Send
} from "lucide-react";

interface ToggledQuestionViewProps {
  question: QuestionData;
  currentIndex: number;
  totalQuestions: number;
  selectedOption: number | undefined;
  isMarkedForReview: boolean;
  viewMode: QuestionViewMode;
  onSetViewMode: (mode: QuestionViewMode) => void;
  onSelectOption: (optionIndex: number) => void;
  onClearOption: () => void;
  onToggleMarkReview: () => void;
  onNext: () => void;
  onPrev: () => void;
  toggleCount: number;
  onIncrementToggle: () => void;
  onRequestSubmit?: () => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export const ToggledQuestionView: React.FC<ToggledQuestionViewProps> = ({
  question,
  currentIndex,
  totalQuestions,
  selectedOption,
  isMarkedForReview,
  viewMode,
  onSetViewMode,
  onSelectOption,
  onClearOption,
  onToggleMarkReview,
  onNext,
  onPrev,
  toggleCount,
  onIncrementToggle,
  onRequestSubmit,
}) => {
  // State for which single option is currently visible in Options Mode (0=A, 1=B, 2=C, 3=D, or null if all hidden)
  const [currentOptionIndex, setCurrentOptionIndex] = useState<number | null>(() => {
    return typeof selectedOption === "number" ? selectedOption : 0;
  });

  // When question changes, reset to selected answer if answered, or Option A (0)
  useEffect(() => {
    if (typeof selectedOption === "number") {
      setCurrentOptionIndex(selectedOption);
    } else {
      setCurrentOptionIndex(0);
    }
  }, [question.id]);

  const handleToggleOption = (idx: number) => {
    onIncrementToggle();
    if (viewMode !== "OPTIONS") {
      onSetViewMode("OPTIONS");
    }
    setCurrentOptionIndex((prev) => (prev === idx ? null : idx));
  };

  // Keyboard navigation: Space/T to toggle Q vs Options, 1-4 or A-D to switch option in column, ArrowUp/Down, Enter to select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Spacebar or 'T' key: Toggle between Question and Options Mode
      if (e.code === "Space" || e.key.toLowerCase() === "t") {
        e.preventDefault();
        onIncrementToggle();
        onSetViewMode(viewMode === "QUESTION" ? "OPTIONS" : "QUESTION");
        return;
      }

      // When in Options Mode: Cycle through options in the column (1 shown at a time)
      if (viewMode === "OPTIONS") {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onIncrementToggle();
          setCurrentOptionIndex((prev) => {
            if (prev === null) return 0;
            return Math.max(0, prev - 1);
          });
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onIncrementToggle();
          setCurrentOptionIndex((prev) => {
            if (prev === null) return 0;
            return Math.min(question.options.length - 1, prev + 1);
          });
        } else if (e.key === "1" || e.key.toLowerCase() === "a") {
          e.preventDefault();
          onIncrementToggle();
          setCurrentOptionIndex(0);
        } else if (e.key === "2" || e.key.toLowerCase() === "b") {
          e.preventDefault();
          if (question.options.length > 1) {
            onIncrementToggle();
            setCurrentOptionIndex(1);
          }
        } else if (e.key === "3" || e.key.toLowerCase() === "c") {
          e.preventDefault();
          if (question.options.length > 2) {
            onIncrementToggle();
            setCurrentOptionIndex(2);
          }
        } else if (e.key === "4" || e.key.toLowerCase() === "d") {
          e.preventDefault();
          if (question.options.length > 3) {
            onIncrementToggle();
            setCurrentOptionIndex(3);
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (currentOptionIndex !== null) {
            onSelectOption(currentOptionIndex);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, onSetViewMode, onIncrementToggle, question.options.length, currentOptionIndex, onSelectOption]);

  const handleToggle = () => {
    onIncrementToggle();
    onSetViewMode(viewMode === "QUESTION" ? "OPTIONS" : "QUESTION");
  };

  return (
    <div 
      className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden select-none exam-prevent-copy"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Bar: Subject, Question Counter, and Mode Switcher */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-xs font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
            {question.subject}
          </span>
          {isMarkedForReview && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
              <Bookmark className="w-3 h-3 fill-amber-500 text-amber-500" />
              Marked for Review
            </span>
          )}
        </div>

        {/* The Mandatory Toggled Switch Control */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl border border-slate-300">
            <button
              type="button"
              id="btn-view-question-mode"
              onClick={() => {
                if (viewMode !== "QUESTION") {
                  onIncrementToggle();
                  onSetViewMode("QUESTION");
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "QUESTION"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Question View</span>
            </button>

            <button
              type="button"
              id="btn-view-options-mode"
              onClick={() => {
                if (viewMode !== "OPTIONS") {
                  onIncrementToggle();
                  onSetViewMode("OPTIONS");
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "OPTIONS"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Options View (Column Toggles)</span>
            </button>
          </div>

          {/* Quick Flip Button */}
          <button
            type="button"
            id="btn-quick-toggle"
            onClick={handleToggle}
            title="Toggle between Question and Options (Shortcut: Spacebar or T)"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode State Indicator Banner */}
      <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100/60 flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-blue-700">
            Active Mode: {viewMode === "QUESTION" ? "Question Only" : currentOptionIndex !== null ? `Option ${OPTION_LABELS[currentOptionIndex]} Shown` : "Options Column (All Hidden)"}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">
            {viewMode === "QUESTION"
              ? "Options are hidden. Click any option toggle in the column below to reveal."
              : currentOptionIndex !== null
                ? `Option ${OPTION_LABELS[currentOptionIndex]} is shown. All other options and question are hidden.`
                : "All options are hidden. Click any option toggle button in the column to reveal."}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-500">
          <span className="text-[11px]">Toggled: {toggleCount} times</span>
          <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">
            Spacebar
          </span>
        </div>
      </div>

      {/* Main Content Area: MUTUALLY EXCLUSIVE TOGGLE VIEW */}
      <div className="p-5 sm:p-7 min-h-[340px] flex flex-col justify-between">
        {viewMode === "QUESTION" ? (
          /* ================= MODE 1: QUESTION VIEW (OPTIONS ARE HIDDEN) ================= */
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Problem Statement
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 leading-relaxed">
                {question.question}
              </h2>
            </div>

            {/* Optional Code Snippet if present */}
            {question.codeSnippet && (
              <div className="rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-2 pb-1 border-b border-slate-800">
                  <Code className="w-3.5 h-3.5" />
                  <span>Code Context</span>
                </div>
                <code>{question.codeSnippet}</code>
              </div>
            )}

            {/* Options in Column: Hidden by default with toggle buttons */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Options in Column
                  </span>
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <EyeOff className="w-3 h-3 text-amber-700" />
                    Hidden (Question Mode)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Click any option's toggle button to show it (hides question and other options)
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {question.options.map((_, idx) => {
                  const label = OPTION_LABELS[idx];
                  const isChosenAnswer = selectedOption === idx;

                  return (
                    <div
                      key={idx}
                      id={`btn-toggle-col-q-${idx}`}
                      onClick={() => {
                        onIncrementToggle();
                        setCurrentOptionIndex(idx);
                        onSetViewMode("OPTIONS");
                      }}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 flex items-center justify-between cursor-pointer transition-all shadow-2xs group"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                            isChosenAnswer
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                          }`}
                        >
                          {label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-900">
                            Option {label}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <EyeOff className="w-3 h-3" />
                            Hidden
                          </span>
                          {isChosenAnswer && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              Selected Answer
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Toggle Button in OFF state */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-400 group-hover:text-blue-600 hidden sm:inline">
                          Show Option {label}
                        </span>
                        <div className="w-10 h-5 bg-slate-200 group-hover:bg-slate-300 rounded-full relative transition-colors">
                          <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-xs" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ================= MODE 2: OPTIONS VIEW (QUESTION IS HIDDEN & OPTIONS SHOWN IN COLUMN LIKE TOGGLE BUTTONS) ================= */
          <div className="space-y-5">
            {/* Concealed Question Compact Bar with Re-read Button */}
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-slate-700">
                <div className="p-1.5 bg-white rounded-lg shadow-2xs text-slate-500">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Question Text is Hidden
                  </span>
                  <span className="hidden sm:inline text-xs text-slate-500 ml-1.5">
                    (Question {currentIndex + 1})
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-reveal-question-from-options"
                onClick={handleToggle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer self-start sm:self-center"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Switch Back to Question Text</span>
                <span className="text-[10px] text-slate-400 font-mono">[Space]</span>
              </button>
            </div>

            {/* Options in Column: Mutually Exclusive Toggle Buttons */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Options in Column
                  </span>
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Eye className="w-3 h-3 text-blue-600" />
                    {currentOptionIndex !== null ? `Option ${OPTION_LABELS[currentOptionIndex]} Shown (Others Hidden)` : "All Options Hidden"}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>Keys <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">1-4</kbd> or <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">A-D</kbd></span>
                  <span>•</span>
                  <span><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">↑ / ↓</kbd></span>
                </div>
              </div>

              {/* The Column of Options */}
              <div className="flex flex-col gap-3">
                {question.options.map((optionText, idx) => {
                  const label = OPTION_LABELS[idx];
                  const isShown = currentOptionIndex === idx;
                  const isChosenAnswer = selectedOption === idx;
                  const otherLabels = OPTION_LABELS.filter((_, i) => i !== idx);

                  if (isShown) {
                    // SHOWN OPTION: Expanded Card with Toggle Button ON
                    return (
                      <div
                        key={idx}
                        id={`option-col-shown-${idx}`}
                        className="border-2 border-blue-500 bg-white rounded-2xl p-4 sm:p-5 shadow-xs transition-all ring-4 ring-blue-50/80"
                      >
                        {/* Header: Option details and Toggle Switch (ON) */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                              {label}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">
                                  Option {label}
                                </h4>
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Eye className="w-2.5 h-2.5 text-blue-600" />
                                  Showing
                                </span>
                                {isChosenAnswer && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    Answer
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Other options ({otherLabels.join(", ")}) are hidden.
                              </p>
                            </div>
                          </div>

                          {/* Toggle Button in ON State */}
                          <button
                            type="button"
                            id={`btn-toggle-option-col-${idx}`}
                            onClick={() => handleToggleOption(idx)}
                            title="Toggle this option off / hide"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition-all cursor-pointer border border-blue-200 shrink-0"
                          >
                            <span className="hidden sm:inline">Showing (Toggle)</span>
                            <div className="w-10 h-5 bg-blue-600 rounded-full relative transition-colors">
                              <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm" />
                            </div>
                          </button>
                        </div>

                        {/* Option Text */}
                        <div className="py-4 my-1">
                          <p className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                            {optionText}
                          </p>
                        </div>

                        {/* Action Buttons for this Option */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <button
                            type="button"
                            id={`btn-select-option-col-${idx}`}
                            onClick={() => {
                              if (isChosenAnswer) {
                                onClearOption();
                              } else {
                                onSelectOption(idx);
                              }
                            }}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                              isChosenAnswer
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300"
                                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {isChosenAnswer
                                ? `Option ${label} is Selected as Your Answer (Click to Deselect)`
                                : `Select Option ${label} as Your Answer`}
                            </span>
                          </button>

                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-slate-700">Enter</kbd> to select</span>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // HIDDEN OPTION: Collapsed Row with Toggle Button OFF
                    return (
                      <div
                        key={idx}
                        id={`option-col-hidden-${idx}`}
                        onClick={() => handleToggleOption(idx)}
                        className="border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-blue-300 rounded-xl p-3 sm:p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-2xs group"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                              isChosenAnswer
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-200/80 text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                            }`}
                          >
                            {label}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-900">
                              Option {label}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <EyeOff className="w-3.5 h-3.5" />
                              Hidden
                            </span>
                            {isChosenAnswer && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                Selected Answer
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Toggle Button in OFF state */}
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-medium text-slate-500 group-hover:text-blue-600 hidden sm:inline">
                            Toggle Show Option {label}
                          </span>
                          <div className="w-10 h-5 bg-slate-200 group-hover:bg-slate-300 rounded-full relative transition-colors">
                            <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-xs" />
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Secondary Actions: Clear & Mark for Review */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              id="btn-mark-for-review"
              onClick={onToggleMarkReview}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                isMarkedForReview
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isMarkedForReview ? "fill-amber-500 text-amber-500" : ""}`} />
              <span>{isMarkedForReview ? "Marked for Review" : "Mark for Review"}</span>
            </button>

            {typeof selectedOption === "number" && (
              <button
                type="button"
                id="btn-clear-selection"
                onClick={onClearOption}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Selection</span>
              </button>
            )}
          </div>

          {/* Primary Navigation Buttons: Previous / Next Question */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              id="btn-prev-question"
              onClick={onPrev}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Question</span>
            </button>

            {currentIndex === totalQuestions - 1 ? (
              <button
                type="button"
                id="btn-submit-last-question"
                onClick={onRequestSubmit}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Examination</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-next-question"
                onClick={onNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

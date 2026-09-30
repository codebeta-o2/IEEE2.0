import React from "react";
import { QuestionData } from "../types";
import { CheckCircle2, Bookmark, Circle, HelpCircle } from "lucide-react";

interface QuestionPaletteProps {
  questions: QuestionData[];
  currentIndex: number;
  answers: Record<string, number>;
  markedForReview: Set<string>;
  visitedQuestions: Set<string>;
  onSelectQuestion: (index: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentIndex,
  answers,
  markedForReview,
  visitedQuestions,
  onSelectQuestion,
}) => {
  const answeredCount = Object.keys(answers).length;
  const markedCount = markedForReview.size;
  const pendingCount = questions.length - answeredCount;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Question Palette
        </h3>
        <span className="text-xs text-slate-500 font-medium">
          {questions.length} Questions
        </span>
      </div>

      {/* Numerical Quick Jump Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-4 gap-2 mb-4">
        {questions.map((q, idx) => {
          const isCurrent = currentIndex === idx;
          const isAnswered = typeof answers[q.id] === "number";
          const isMarked = markedForReview.has(q.id);
          const isVisited = visitedQuestions.has(q.id);

          let bgClass = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";

          if (isAnswered) {
            bgClass = "bg-emerald-600 text-white border-emerald-700 shadow-2xs";
          } else if (isMarked) {
            bgClass = "bg-amber-100 text-amber-900 border-amber-300";
          } else if (isVisited) {
            bgClass = "bg-rose-50 text-rose-700 border-rose-200";
          }

          return (
            <button
              key={q.id}
              type="button"
              id={`palette-btn-${idx}`}
              onClick={() => onSelectQuestion(idx)}
              className={`relative h-10 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center ${bgClass} ${
                isCurrent ? "ring-2 ring-blue-500 ring-offset-2 scale-105" : ""
              }`}
            >
              <span>{idx + 1}</span>

              {/* Tiny marker dot for marked review */}
              {isMarked && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 border border-emerald-700 shrink-0" />
            <span>Answered</span>
          </div>
          <span className="font-bold text-slate-800">{answeredCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-300 shrink-0" />
            <span>Marked for Review</span>
          </div>
          <span className="font-bold text-slate-800">{markedCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-300 shrink-0" />
            <span>Unanswered / Pending</span>
          </div>
          <span className="font-bold text-slate-800">{pendingCount}</span>
        </div>
      </div>
    </div>
  );
};

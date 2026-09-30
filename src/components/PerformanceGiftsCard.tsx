import React, { useState } from "react";
import { 
  Gift, 
  Sparkles, 
  Award, 
  Lock, 
  CheckCircle2, 
  Info, 
  ExternalLink,
  X,
  BadgeCheck,
  Check
} from "lucide-react";
import { StudentDetails } from "../types";
import { GIFT_TIERS, getEarnedGift, GiftTier } from "../utils/giftHelper";

export { getEarnedGift, GIFT_TIERS };

interface PerformanceGiftsCardProps {
  percentage: number;
  student: StudentDetails;
  submissionId: string;
  attemptNumber?: number;
}

export const PerformanceGiftsCard: React.FC<PerformanceGiftsCardProps> = ({
  percentage,
  student,
  submissionId,
  attemptNumber = 1,
}) => {
  const [modalGift, setModalGift] = useState<GiftTier | null>(null);

  // Active earned gift for this specific percentage according to the strict user rules:
  // > 75% (and <=80%): Only Sticker
  // > 80% (and <90%): Only Pen
  // 90% and above: Coffee Mug
  // <= 75%: None
  const earnedGift = getEarnedGift(percentage);
  const hasGift = earnedGift.id !== "none";

  let tierBadgeText = "Milestone Progressing";
  let tierBadgeColor = "bg-slate-100 text-slate-700 border-slate-300";
  let cardHighlight = "border-slate-200 bg-white";

  if (percentage >= 90) {
    tierBadgeText = "Top Tier Award: IEEE Coffee Mug (90%+)";
    tierBadgeColor = "bg-purple-100 text-purple-900 border-purple-300";
    cardHighlight = "border-purple-300 bg-linear-to-br from-purple-50/70 via-white to-blue-50/70";
  } else if (percentage > 80) {
    tierBadgeText = "Merit Award: Executive Pen (>80%)";
    tierBadgeColor = "bg-blue-100 text-blue-900 border-blue-300";
    cardHighlight = "border-blue-300 bg-linear-to-br from-blue-50/60 via-white to-slate-50";
  } else if (percentage > 75) {
    tierBadgeText = "Honor Award: IEEE Stickers (>75%)";
    tierBadgeColor = "bg-emerald-100 text-emerald-900 border-emerald-300";
    cardHighlight = "border-emerald-300 bg-linear-to-br from-emerald-50/60 via-white to-slate-50";
  }

  // Next milestone hint
  let nextMilestoneHint = "";
  if (percentage <= 75) {
    nextMilestoneHint = "Score above 75% to unlock the IEEE Tech Sticker Pack!";
  } else if (percentage <= 80) {
    nextMilestoneHint = "Score above 80% to qualify for the Executive IEEE Metallic Pen!";
  } else if (percentage < 90) {
    nextMilestoneHint = "Score 90% or above to qualify for the IEEE Ceramic Coffee Mug!";
  } else {
    nextMilestoneHint = "Highest tier achieved! You have earned the IEEE Ceramic Coffee Mug!";
  }

  return (
    <div className={`rounded-2xl border-2 p-5 sm:p-6 shadow-xs transition-all ${cardHighlight}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2.5 rounded-2xl shrink-0 ${hasGift ? "bg-amber-500 text-white shadow-sm" : "bg-slate-200 text-slate-500"}`}>
            {hasGift ? <Sparkles className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {hasGift ? "IEEE Candidate Performance Gift Earned" : "IEEE Performance Gift Rewards"}
              </h3>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${tierBadgeColor}`}>
                {tierBadgeText}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasGift ? (
                <span>
                  Congratulations <strong>{student.name}</strong>! Your score of <strong>{percentage}%</strong> on Attempt {attemptNumber} of 2 has earned you the <strong>{earnedGift.name}</strong>.
                </span>
              ) : (
                <span>
                  Candidates scoring above 75% earn official physical gifts. Your score is <strong>{percentage}%</strong>.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Gift Claim Code Pill */}
        {hasGift && (
          <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-right shrink-0 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Gift Voucher ID (Enrollment PK)
            </span>
            <span className="font-mono text-xs font-bold text-blue-700">
              {student.enrollmentNumber || student.roll}-{percentage}PCT-A{attemptNumber}
            </span>
          </div>
        )}
      </div>

      {/* Main Earned Gift Spotlight (if candidate earned a gift) */}
      {hasGift && (
        <div className="mt-4 p-4 rounded-xl bg-white border border-blue-200 shadow-xs flex flex-col sm:flex-row items-center gap-4">
          <div 
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 border border-slate-200 cursor-pointer relative group"
            onClick={() => setModalGift(earnedGift)}
          >
            {earnedGift.image && (
              <img
                src={earnedGift.image}
                alt={earnedGift.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            )}
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
              Zoom
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                OFFICIAL EARNED GIFT
              </span>
              <span className="text-xs font-mono font-bold text-blue-700">
                {earnedGift.criteriaLabel}
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {earnedGift.name}
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {earnedGift.description}
            </p>
            <div className="mt-2 text-[11px] text-slate-500">
              Primary Key: <strong>{student.enrollmentNumber}</strong> · Roll: <strong>{student.roll}</strong>
            </div>
          </div>
        </div>
      )}

      {/* All 3 Tiers Milestone Progression Cards */}
      <div className="mt-5">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
          Performance Gift Tiers Roadmap
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {GIFT_TIERS.map((tier) => {
            const isThisTierActive = earnedGift.id === tier.id;
            const isQualified = 
              (tier.id === "stickers" && percentage > 75) ||
              (tier.id === "pen" && percentage > 80) ||
              (tier.id === "cup" && percentage >= 90);

            return (
              <div
                key={tier.id}
                className={`rounded-xl border flex flex-col justify-between overflow-hidden transition-all ${
                  isThisTierActive
                    ? "bg-white border-blue-400 shadow-sm ring-2 ring-blue-200"
                    : isQualified
                    ? "bg-white/80 border-slate-300 opacity-80"
                    : "bg-slate-50 border-slate-200 opacity-60"
                }`}
              >
                {/* Image */}
                <div 
                  className="relative aspect-video w-full bg-slate-100 cursor-pointer overflow-hidden group"
                  onClick={() => setModalGift(tier)}
                >
                  {tier.image && (
                    <img
                      src={tier.image}
                      alt={tier.name}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${
                        isQualified ? "" : "grayscale contrast-75 brightness-95"
                      }`}
                    />
                  )}

                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs ${
                      isThisTierActive
                        ? "bg-emerald-600 text-white"
                        : isQualified
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800/80 text-white"
                    }`}>
                      {isThisTierActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-white" />
                          EARNED REWARD
                        </>
                      ) : isQualified ? (
                        "UNLOCKED TIER"
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-slate-300" />
                          {tier.criteriaLabel}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-3 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-semibold uppercase">{tier.tag}</span>
                      <span className="font-mono font-bold text-blue-600">{tier.conditionText}</span>
                    </div>
                    <h5 className="font-bold text-xs text-slate-900 leading-snug">
                      {tier.name}
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {tier.description}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setModalGift(tier)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
                    >
                      <span>View Gift</span>
                    </button>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isThisTierActive
                        ? "bg-emerald-100 text-emerald-800"
                        : isQualified
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {isThisTierActive ? "Awarded" : isQualified ? "Tier Passed" : `Requires ${tier.criteriaLabel}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claim Guidelines Footer */}
      <div className="mt-4 p-3 bg-white/90 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-slate-600 text-[11px]">
            {hasGift ? (
              <span>
                <strong>Physical Gift Claim:</strong> Present your Enrollment Number (<strong>{student.enrollmentNumber || student.roll}</strong>) and scorecard at the IEEE Student Branch Desk to collect your <strong>{earnedGift.name}</strong>.
              </span>
            ) : (
              <span>
                <strong>Reward Criteria:</strong> Score &gt;75% for Sticker Pack · &gt;80% for Executive Pen · 90%+ for Ceramic Coffee Mug.
              </span>
            )}
          </div>
        </div>

        {nextMilestoneHint && (
          <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg shrink-0">
            {nextMilestoneHint}
          </span>
        )}
      </div>

      {/* Gift Detail Modal */}
      {modalGift && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalGift(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square w-full bg-slate-100">
              {modalGift.image && (
                <img
                  src={modalGift.image}
                  alt={modalGift.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setModalGift(null)}
                className="absolute top-3 right-3 p-1.5 bg-white/80 hover:bg-white text-slate-700 rounded-full shadow-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-3">
                <span className="bg-slate-900/80 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />
                  {modalGift.tag}
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-mono font-bold text-blue-600 uppercase">
                  Criteria: {modalGift.conditionText}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  earnedGift.id === modalGift.id
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {earnedGift.id === modalGift.id ? "Status: EARNED" : "Tier Reference"}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">
                {modalGift.name}
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {modalGift.description}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Candidate: <strong>{student.name}</strong></span>
                <span>Score: <strong className="text-blue-700 font-mono">{percentage}%</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

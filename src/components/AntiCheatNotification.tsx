import React, { useEffect, useState } from "react";
import { subscribeToAntiCheatViolations, AntiCheatViolation } from "../utils/antiCheating";
import { ShieldAlert, X } from "lucide-react";

export const AntiCheatNotification: React.FC = () => {
  const [currentViolation, setCurrentViolation] = useState<AntiCheatViolation | null>(null);

  useEffect(() => {
    let timeoutId: any = null;

    const unsubscribe = subscribeToAntiCheatViolations((violation) => {
      setCurrentViolation(violation);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setCurrentViolation(null);
      }, 3200);
    });

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!currentViolation) return null;

  return (
    <aside
      aria-label="Anti-cheat security notification"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto animate-bounce-short pointer-events-auto"
    >
      <div 
        id="anti-cheat-toast-alert"
        className="flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-rose-500/80 backdrop-blur-md"
      >
        <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
        </div>
        <div className="text-xs">
          <p className="font-bold text-rose-300 flex items-center gap-1.5">
            <span>Security Guard</span>
            <span className="text-[10px] bg-rose-950 text-rose-200 px-1.5 py-0.5 rounded font-mono font-semibold">
              Action Blocked
            </span>
          </p>
          <p className="text-slate-200 mt-0.5 leading-snug">
            {currentViolation.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentViolation(null)}
          className="ml-auto text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          aria-label="Dismiss security notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

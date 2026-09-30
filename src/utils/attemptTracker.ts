import { QuizSubmission, StudentDetails } from "../types";
import { getGoogleSheetUrl } from "./googleSheetsSync";

export interface PastAttemptRecord {
  attemptNumber: number;
  timestamp: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  giftAwarded: string;
  submissionId: string;
}

export interface AttemptCheckResult {
  enrollmentNumber: string;
  attemptCount: number;
  maxAttempts: number;
  canAttempt: boolean;
  remainingAttempts: number;
  isBlocked: boolean;
  message: string;
  pastAttempts: PastAttemptRecord[];
  source: "local" | "server" | "google_sheet";
}

const STORAGE_KEY = "ieee_exam_attempts_ledger_v1";

/**
 * Reads the local browser ledger of attempts indexed by enrollment number
 */
export function getLocalLedger(): Record<string, PastAttemptRecord[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("Failed to read local attempts ledger:", err);
    return {};
  }
}

/**
 * Returns past attempts for a specific enrollment number from local storage
 */
export function getLocalAttempts(enrollmentNumber: string): PastAttemptRecord[] {
  const key = enrollmentNumber.trim().toUpperCase();
  const ledger = getLocalLedger();
  return ledger[key] || [];
}

/**
 * Saves a new attempt record to the local ledger
 */
export function recordLocalAttempt(
  enrollmentNumber: string,
  record: PastAttemptRecord
): void {
  try {
    const key = enrollmentNumber.trim().toUpperCase();
    const ledger = getLocalLedger();
    const existing = ledger[key] || [];
    
    // Avoid duplicate records by submissionId
    if (!existing.some((r) => r.submissionId === record.submissionId)) {
      existing.push(record);
      ledger[key] = existing;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
    }
  } catch (err) {
    console.warn("Failed to write to local attempts ledger:", err);
  }
}

/**
 * Comprehensive check for attempts across Google Sheet (if configured), Server API, and Local Ledger
 */
export async function checkEnrollmentAttempts(
  rawEnrollment: string
): Promise<AttemptCheckResult> {
  const enrollment = rawEnrollment.trim().toUpperCase();
  if (!enrollment) {
    return {
      enrollmentNumber: "",
      attemptCount: 0,
      maxAttempts: 2,
      canAttempt: true,
      remainingAttempts: 2,
      isBlocked: false,
      message: "Please enter an Enrollment Number to check eligibility.",
      pastAttempts: [],
      source: "local",
    };
  }

  // 1. Check local ledger first for instant responsiveness
  const ledger = getLocalLedger();
  const localAttempts = ledger[enrollment] || [];

  // 2. Try checking Google Apps Script directly if configured
  const sheetUrl = getGoogleSheetUrl();
  if (sheetUrl) {
    try {
      const targetUrl = new URL(sheetUrl);
      targetUrl.searchParams.set("action", "checkAttempts");
      targetUrl.searchParams.set("enrollmentNumber", enrollment);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(targetUrl.toString(), {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const sheetData = await response.json();
        if (sheetData && sheetData.status === "success") {
          const past: PastAttemptRecord[] = (sheetData.pastAttempts || []).map((a: any) => ({
            attemptNumber: Number(a.attemptNumber) || 1,
            timestamp: a.timestamp || new Date().toISOString(),
            score: Number(a.score) || 0,
            totalQuestions: Number(a.totalQuestions) || 20,
            percentage: Number(a.percentage) || 0,
            giftAwarded: a.giftAwarded || "None",
            submissionId: a.submissionId || "",
          }));

          // Merge with local records
          past.forEach((p) => recordLocalAttempt(enrollment, p));

          const count = Math.max(sheetData.attemptCount || 0, localAttempts.length);
          const can = count < 2;

          return {
            enrollmentNumber: enrollment,
            attemptCount: count,
            maxAttempts: 2,
            canAttempt: can,
            remainingAttempts: Math.max(0, 2 - count),
            isBlocked: !can,
            message: can
              ? `Eligible: Attempt ${count + 1} of 2 available.`
              : `Access Blocked: Maximum 2 attempts completed for Enrollment No: ${enrollment}.`,
            pastAttempts: past.length > 0 ? past : localAttempts,
            source: "google_sheet",
          };
        }
      }
    } catch (sheetErr) {
      console.log("Sheet attempt verification skipped/offline:", sheetErr);
    }
  }

  // 3. Fallback: Query backend server API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`/api/check-attempts?enrollmentNumber=${encodeURIComponent(enrollment)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const serverData = await res.json();
      const count = Math.max(serverData.attemptCount || 0, localAttempts.length);
      const can = count < 2;

      return {
        enrollmentNumber: enrollment,
        attemptCount: count,
        maxAttempts: 2,
        canAttempt: can,
        remainingAttempts: Math.max(0, 2 - count),
        isBlocked: !can,
        message: can
          ? `Eligible: Attempt ${count + 1} of 2 available.`
          : `Access Blocked: Maximum 2 attempts reached for Enrollment No: ${enrollment}.`,
        pastAttempts: serverData.pastAttempts && serverData.pastAttempts.length > 0
          ? serverData.pastAttempts
          : localAttempts,
        source: "server",
      };
    }
  } catch (serverErr) {
    // Expected if client is currently in offline mode
  }

  // 4. Fallback to local ledger
  const count = localAttempts.length;
  const can = count < 2;

  return {
    enrollmentNumber: enrollment,
    attemptCount: count,
    maxAttempts: 2,
    canAttempt: can,
    remainingAttempts: Math.max(0, 2 - count),
    isBlocked: !can,
    message: can
      ? `Local Status: Attempt ${count + 1} of 2 available.`
      : `Access Blocked: Maximum 2 attempts recorded locally for ${enrollment}.`,
    pastAttempts: localAttempts,
    source: "local",
  };
}

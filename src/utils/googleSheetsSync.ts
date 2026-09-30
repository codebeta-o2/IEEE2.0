import { QuizSubmission } from "../types";

const URL_STORAGE_KEY = "ieee_google_sheet_webapp_url_v1";
const PENDING_SYNC_KEY = "ieee_pending_sheet_submissions_v1";
const SYNCED_IDS_KEY = "ieee_synced_submission_ids_v1";

/**
 * Checks if a submission ID has already been recorded in Google Sheet
 */
export function isSubmissionAlreadySynced(id: string): boolean {
  if (!id) return false;
  try {
    const raw = localStorage.getItem(SYNCED_IDS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(id);
  } catch {
    return false;
  }
}

/**
 * Marks a submission ID as confirmed saved to Google Sheet
 */
export function markSubmissionAsSynced(id: string): void {
  if (!id) return;
  try {
    const raw = localStorage.getItem(SYNCED_IDS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify(list));
    }
  } catch {}
}

/**
 * Validates Google Apps Script Web App URL format
 */
export function validateWebAppUrl(url: string): {
  valid: boolean;
  error?: string;
  warning?: string;
} {
  const clean = (url || "").trim();
  if (!clean) {
    return { valid: false, error: "Please enter a Google Apps Script Web App URL." };
  }

  if (clean.includes("/edit") || clean.includes("edit#gid")) {
    return {
      valid: false,
      error: "You pasted the script editor URL from the browser address bar. You need the deployed Web App URL ending with /exec. Click 'Deploy' > 'New deployment' > 'Web app' in Google Sheets.",
    };
  }

  if (!clean.startsWith("https://script.google.com/")) {
    return {
      valid: false,
      error: "Invalid Google Apps Script URL. It must start with 'https://script.google.com/macros/s/...' and end with '/exec'.",
    };
  }

  if (!clean.includes("/exec")) {
    return {
      valid: false,
      warning: "The URL does not appear to end with '/exec'. Deployed Web Apps typically end with '/exec'.",
    };
  }

  return { valid: true };
}

/**
 * Client-Side Google Sheet Synchronization Utilities
 * SECURITY NOTICE:
 * For exam integrity and to prevent candidate tampering, the Google Apps Script
 * Web App URL is securely stored and managed on the server backend.
 * The browser client never receives, stores, or handles the secret Web App URL.
 */

// Cache flag indicating if the backend has Google Sheet sync enabled
let isServerConfiguredCache = true;

export function getGoogleSheetUrl(): string {
  // Purge any legacy stored URL from client storage
  try {
    localStorage.removeItem(URL_STORAGE_KEY);
  } catch (e) {}
  return "";
}

export function isGoogleSheetSyncActive(): boolean {
  return isServerConfiguredCache;
}

export function saveGoogleSheetUrl(_url: string): void {
  // Purge client storage - URL is strictly managed server-side
  try {
    localStorage.removeItem(URL_STORAGE_KEY);
  } catch (e) {}
}

/**
 * Initializes Google Sheet status check from backend
 */
export async function initGoogleSheetSync(): Promise<boolean> {
  try {
    localStorage.removeItem(URL_STORAGE_KEY);
    const res = await fetch("/api/google-sheet-config");
    if (res.ok) {
      const data = await res.json();
      isServerConfiguredCache = Boolean(data.configured);
      return isServerConfiguredCache;
    }
  } catch (e) {
    // offline
  }
  return true;
}

/**
 * Tests connection to the Google Apps Script Web App
 */
export async function testGoogleSheetConnection(testUrl?: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  const target = (testUrl || getGoogleSheetUrl()).trim();
  if (!target) {
    return {
      success: false,
      message: "No Google Apps Script Web App URL configured. Please paste your deployed Web App URL.",
    };
  }

  // Check URL format
  const validation = validateWebAppUrl(target);
  if (!validation.valid && validation.error) {
    return {
      success: false,
      message: validation.error,
    };
  }

  // 1. Try testing through the server proxy first (avoids browser CORS issues)
  try {
    const serverRes = await fetch("/api/google-sheet-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: target }),
    });

    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (serverData.testResult && serverData.testResult.status === "ok") {
        return {
          success: true,
          message: `Connected successfully! Target Sheet: "${serverData.testResult.sheetName || "Exam_Submissions"}". Max attempts: ${serverData.testResult.maxAttemptsPerStudent || 2}.`,
          data: serverData.testResult,
        };
      }
      if (serverData.warning) {
        return {
          success: false,
          message: serverData.warning,
        };
      }
    }
  } catch (e) {
    // fallback to direct ping
  }

  // 2. Direct browser test fallback
  try {
    const parsed = new URL(target);
    parsed.searchParams.set("action", "ping");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(parsed.toString(), {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      if (text.includes("accounts.google.com") || text.includes("<html")) {
        return {
          success: false,
          message: "Permission Error: Google returned a sign-in page. Please edit your deployment in Apps Script and set 'Who has access' to 'Anyone'.",
        };
      }
      return {
        success: false,
        message: `Unexpected response: ${text.slice(0, 100)}`,
      };
    }

    if (data && data.status === "ok") {
      return {
        success: true,
        message: `Connected successfully! Target Sheet: "${data.sheetName || "Exam_Submissions"}". Max attempts: ${data.maxAttemptsPerStudent || 2}.`,
        data,
      };
    }

    return {
      success: false,
      message: data.message || "Received unexpected response from Google Apps Script.",
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return {
        success: false,
        message: "Connection timed out after 7 seconds. Please verify the URL.",
      };
    }
    return {
      success: false,
      message: `Failed to reach Web App: ${err.message || String(err)}. Check deployment permissions.`,
    };
  }
}

export interface SheetSubmissionPayload {
  student: {
    name: string;
    email: string;
    phone: string;
    department: string;
    section: string;
    roll: string;
    enrollmentNumber: string;
  };
  score: number;
  totalQuestions: number;
  percentage: number;
  giftAwarded: string;
  attemptNumber?: number;
  submissionReason: string;
  timeSpentSeconds: number;
  submissionId: string;
  submittedAt: string;
}

/**
 * Sends a submission record to the Google Apps Script Web App
 * Uses server proxy first to avoid browser CORS/redirection errors, with client fallback
 */
export async function sendSubmissionToGoogleSheet(
  submission: QuizSubmission,
  giftAwarded: string,
  attemptNumber: number
): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  // Deduplication check: if this submission has already been recorded, do not duplicate
  if (isSubmissionAlreadySynced(submission.id)) {
    return {
      success: true,
      message: `Exam scorecard already confirmed • Attempt ${attemptNumber}`,
      data: { isDuplicatePrevented: true },
    };
  }

  // Use secure server-side proxy which holds the Google Sheet Web App URL
  try {
    const serverProxyRes = await fetch("/api/sync-google-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submission,
        giftAwarded,
        attemptNumber,
      }),
    });

    const serverData = await serverProxyRes.json().catch(() => null);
    if (serverData?.success) {
      markSubmissionAsSynced(submission.id);
      return {
        success: true,
        message: serverData.message || `Recorded in examination database • Attempt ${attemptNumber}`,
        data: serverData.data,
      };
    }
    if (serverData?.message) {
      return {
        success: false,
        message: serverData.message,
        data: serverData.data,
      };
    }
  } catch (proxyErr) {
    console.warn("Server Google Sheet sync unreachable, queueing:", proxyErr);
  }

  // Queue in pending storage for upload when server connection is restored
  queuePendingSubmission(submission, giftAwarded, attemptNumber);
  return {
    success: false,
    message: "Network unreachable. Scorecard saved locally and queued for server synchronization.",
  };
}

/**
 * Queue submissions when offline for later sync
 */
function queuePendingSubmission(
  submission: QuizSubmission,
  giftAwarded: string,
  attemptNumber: number
) {
  if (isSubmissionAlreadySynced(submission.id) || submission.isSubmittedOnNetwork) {
    return;
  }
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    const queue: any[] = raw ? JSON.parse(raw) : [];
    if (!queue.some((item) => item.submission.id === submission.id)) {
      queue.push({
        submission,
        giftAwarded,
        attemptNumber,
        queuedAt: new Date().toISOString(),
      });
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
    }
  } catch (e) {
    console.error("Failed to queue submission:", e);
  }
}

/**
 * Flush all pending offline submissions once network/Google Sheet is connected
 */
export async function flushPendingSubmissions(): Promise<number> {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return 0;
    const queue: any[] = JSON.parse(raw);
    if (queue.length === 0) return 0;

    let syncedCount = 0;
    const remaining: any[] = [];

    for (const item of queue) {
      if (isSubmissionAlreadySynced(item.submission.id)) {
        continue;
      }
      const res = await sendSubmissionToGoogleSheet(
        item.submission,
        item.giftAwarded,
        item.attemptNumber
      );
      if (res.success) {
        markSubmissionAsSynced(item.submission.id);
        syncedCount++;
      } else {
        remaining.push(item);
      }
    }

    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
    return syncedCount;
  } catch (e) {
    console.error("Failed to flush pending submissions:", e);
    return 0;
  }
}

/**
 * Trigger server to sync all recorded exam submissions to Google Sheet
 */
export async function syncAllServerSubmissions(webAppUrl?: string): Promise<{
  success: boolean;
  syncedCount: number;
  total: number;
  message?: string;
}> {
  const targetUrl = webAppUrl || getGoogleSheetUrl();
  try {
    const res = await fetch("/api/sync-all-to-google-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webAppUrl: targetUrl }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    return {
      success: false,
      syncedCount: 0,
      total: 0,
      message: err.message || "Bulk sync failed",
    };
  } catch (e: any) {
    return {
      success: false,
      syncedCount: 0,
      total: 0,
      message: e.message || "Network error during bulk sync",
    };
  }
}

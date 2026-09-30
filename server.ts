import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import rawQuestions from "./server/questions.json";
import { submitToGoogleSheet } from "./server/googleSheetsClient";

export interface StudentDetails {
  name: string;
  email: string;
  phone: string;
  department: string;
  section: string;
  roll: string;
  enrollmentNumber: string;
}

export interface Question {
  id: string;
  number: number;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctOptionIndex: number;
  subject: string;
  explanation: string;
}

export interface QuizSubmission {
  id: string;
  student: StudentDetails;
  answers: Record<string, number>;
  score: number;
  totalQuestions: number;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  unansweredCount: number;
  percentage: number;
  timeSpentSeconds: number;
  totalDurationSeconds: number;
  submissionReason: "AUTO_NETWORK_DETECTED" | "TIMER_EXPIRED" | "MANUAL_SUBMISSION";
  toggleCount: number;
  submittedAt: string;
  isSubmittedOnNetwork: boolean;
  networkSubmittedAt?: string;
  attemptNumber?: number;
  giftAwarded?: string;
  breakdown: Array<{
    questionId: string;
    questionNumber: number;
    questionText: string;
    options: string[];
    selectedOption: number | null;
    correctOption: number;
    isCorrect: boolean;
    explanation: string;
  }>;
}

const submissions: QuizSubmission[] = [];

export const QUESTIONS_BANK: Question[] = (rawQuestions as any[]).map((q, idx) => ({
  id: q.id,
  number: idx + 1,
  subject: q.subject,
  question: q.question,
  codeSnippet: q.codeSnippet,
  options: q.options,
  correctOptionIndex: q.correctOptionIndex,
  explanation: q.explanation,
}));

// Quick lookup map by question ID
export const QUESTIONS_MAP = new Map<string, Question>(
  QUESTIONS_BANK.map((q) => [q.id, q])
);

// Function to select N random questions without replacement
export function selectRandomQuestions(count: number = 20): Question[] {
  const pool = [...QUESTIONS_BANK];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length)).map((q, idx) => ({
    ...q,
    number: idx + 1,
  }));
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3001);

  app.use(express.json({ limit: "5mb" }));

  // ─── CRITICAL SECURITY FIREWALL: Block Direct Candidate/User Access to Sensitive Files ───
  // Strictly denies candidate access to questions.json, qustions.jason, answer keys, and scripts.
  app.use((req, res, next) => {
    const rawUrl = req.url.toLowerCase();
    const cleanPath = rawUrl.split("?")[0];
    const isDevSanitizedQuestionModule =
      process.env.NODE_ENV !== "production" && cleanPath === "/src/data/sanitizedquestions.ts";

    // Allow legitimate API endpoints
    if (cleanPath.startsWith("/api/")) {
      // Disallow any attempt to append .json/.jason to inspect raw data directly
      if (cleanPath.includes(".json") || cleanPath.includes(".jason")) {
        return res.status(403).json({
          error: "Access Denied: Direct file access to examination data is restricted by IEEE security policy.",
          code: "RESTRICTED_DATA_FILE",
        });
      }
      return next();
    }

    // Intercept any direct attempts to download or view question banks or data files
    const isRestrictedTarget =
      cleanPath.includes("questions.json") ||
      cleanPath.includes("qustions.jason") ||
      cleanPath.includes("questions.jason") ||
      cleanPath.includes("qustions.json") ||
      cleanPath.includes("/data/questions") ||
      cleanPath.startsWith("/server/") ||
      (cleanPath.startsWith("/src/data/") && !isDevSanitizedQuestionModule) ||
      cleanPath.startsWith("/data/") ||
      (cleanPath.includes("question") && (cleanPath.endsWith(".json") || cleanPath.endsWith(".jason")));

    if (isRestrictedTarget) {
      console.warn(`[Security Firewall] Blocked user attempt to access restricted exam file: ${req.url} (IP: ${req.ip || "unknown"})`);
      return res.status(403).json({
        error: "Access Denied (IEEE Examination Security Policy): Direct access to question banks, answer keys, and configuration files is strictly forbidden.",
        code: "RESTRICTED_FILE_ACCESS",
        timestamp: new Date().toISOString(),
      });
    }

    next();
  });

  // Helper to determine performance gift
  function determineGiftServer(percentage: number): string {
    if (percentage >= 90) return "IEEE Ceramic Coffee Mug";
    if (percentage > 80) return "Executive IEEE Metallic Pen";
    if (percentage > 75) return "IEEE Tech Sticker Pack";
    return "None (Below 75%)";
  }

  function resolveGoogleSheetWebAppUrl(): string {
    const canonical = String(process.env.GOOGLE_SHEET_WEBAPP_URL || "").trim();
    if (canonical) return canonical;

    const aliases = [
      process.env.GOOGLE_SEET_WEBAPP_URL,
      process.env.google_sheet_webapp_url,
      process.env.google_seet_webapp_url,
    ];

    for (const alias of aliases) {
      const value = String(alias || "").trim();
      if (value) {
        process.env.GOOGLE_SHEET_WEBAPP_URL = value;
        return value;
      }
    }

    return "";
  }

  // Google Sheet Web App Integration Storage
  // Pre-configured with the official IEEE deployment URL (kept strictly server-side)
  let configuredGoogleSheetUrl = resolveGoogleSheetWebAppUrl();

  // Deduplication caches: prevent duplicate row entries in Google Sheet
  const syncedSubmissionsCache = new Map<string, { success: boolean; message: string; data?: any }>();
  const inFlightSyncs = new Map<string, Promise<{ success: boolean; message: string; data?: any }>>();

  // Helper function to sync a submission to Google Sheet directly from server (with deduplication)
  async function syncSubmissionToGoogleSheet(
    submission: QuizSubmission,
    giftAwarded?: string,
    attemptNumber?: number,
    overrideUrl?: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const targetUrl = (overrideUrl || configuredGoogleSheetUrl || "").trim();
    if (!targetUrl) {
      return { success: false, message: "Central database URL not configured." };
    }

    const cleanEnrollment = String(submission.student?.enrollmentNumber || "").trim().toUpperCase();
    const attNum = attemptNumber || submission.attemptNumber || 1;
    const syncKey = cleanEnrollment ? `${cleanEnrollment}_att_${attNum}` : submission.id;

    // Deduplication check 1: Has this submission or attempt already been synced?
    if (syncedSubmissionsCache.has(submission.id)) {
      console.log(`[Exam Server] Deduplication: Submission ID ${submission.id} already synced to Google Sheet.`);
      return syncedSubmissionsCache.get(submission.id)!;
    }
    if (cleanEnrollment && syncedSubmissionsCache.has(syncKey)) {
      console.log(`[Exam Server] Deduplication: Attempt ${syncKey} already synced to Google Sheet. Skipping duplicate.`);
      return syncedSubmissionsCache.get(syncKey)!;
    }

    // Deduplication check 2: Is a sync already in flight for this submission or candidate attempt?
    if (inFlightSyncs.has(syncKey)) {
      console.log(`[Exam Server] Deduplication: Sync already in-flight for ${syncKey}. Joining promise...`);
      return inFlightSyncs.get(syncKey)!;
    }

    // Execute sync with in-flight lock
    const syncPromise = (async () => {
      try {
        const result = await submitToGoogleSheet(targetUrl, {
          ...submission,
          submissionId: submission.id,
        }, giftAwarded || submission.giftAwarded || determineGiftServer(submission.percentage), attNum);
        if (!result.success) return result;

        const successResult = result;

        // Cache success so duplicate requests are rejected
        syncedSubmissionsCache.set(submission.id, successResult);
        if (cleanEnrollment) {
          syncedSubmissionsCache.set(syncKey, successResult);
        }

        return successResult;
      } catch (err: any) {
        console.error("[Exam Server] Google Sheet sync error:", err);
        return {
          success: false,
          message: err.name === "AbortError" ? "Request timed out." : (err.message || String(err)),
        };
      } finally {
        inFlightSyncs.delete(syncKey);
      }
    })();

    inFlightSyncs.set(syncKey, syncPromise);
    return syncPromise;
  }

  // API 1: Health check & Network Reachability
  app.get("/ping.json", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({
      status: "ok",
      ping: true,
      service: "network-monitor",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/ping.txt", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.type("text/plain").send("pong");
  });

  app.get("/api/health", (req, res) => {
    const ua = String(req.headers["user-agent"] || "");
    const isMobileUa = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const chMobile = req.headers["sec-ch-ua-mobile"] === "?1";
    const isMobileDevice = isMobileUa || chMobile;

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      isMobileDevice,
      clientIp: req.ip || req.socket.remoteAddress || "unknown",
    });
  });

  // API 1.5: Check candidate attempts by Enrollment Number (Primary Key)
  app.get("/api/check-attempts", (req, res) => {
    const rawEnrollment = String(req.query.enrollmentNumber || "").trim().toUpperCase();
    if (!rawEnrollment) {
      return res.status(400).json({ error: "Parameter 'enrollmentNumber' is required." });
    }

    const matches = submissions.filter(
      (s) => s.student.enrollmentNumber.trim().toUpperCase() === rawEnrollment
    );

    const attemptCount = matches.length;
    const canAttempt = attemptCount < 2;

    return res.json({
      enrollmentNumber: rawEnrollment,
      attemptCount,
      maxAttempts: 2,
      canAttempt,
      remainingAttempts: Math.max(0, 2 - attemptCount),
      isBlocked: !canAttempt,
      pastAttempts: matches.map((m, idx) => ({
        attemptNumber: m.attemptNumber || (matches.length - idx),
        timestamp: m.submittedAt,
        score: m.score,
        totalQuestions: m.totalQuestions,
        percentage: m.percentage,
        giftAwarded: m.giftAwarded || determineGiftServer(m.percentage),
        submissionId: m.id,
      })),
    });
  });

  // API 2: Get questions list (automatically selects 20 random questions from the bank)
  app.get("/api/questions", (req, res) => {
    const countParam = req.query.count;
    let selected: Question[];
    if (countParam === "all") {
      selected = QUESTIONS_BANK;
    } else {
      const requestedCount = countParam ? parseInt(String(countParam), 10) || 20 : 20;
      selected = selectRandomQuestions(requestedCount);
    }

    const sanitizedQuestions = selected.map((q) => ({
      id: q.id,
      number: q.number,
      subject: q.subject,
      question: q.question,
      codeSnippet: q.codeSnippet,
      options: q.options,
      // Note: correctOptionIndex is intentionally withheld until evaluation
    }));

    res.json({
      durationMinutes: 20,
      totalQuestions: sanitizedQuestions.length,
      totalBankQuestions: QUESTIONS_BANK.length,
      questions: sanitizedQuestions,
    });
  });

  // API 3: Submit Quiz (Handles Offline auto-trigger, Timer runout, or manual submission)
  app.post("/api/submit-quiz", async (req, res) => {
    try {
      const {
        student,
        answers,
        questionIds,
        timeRemainingSeconds,
        totalDurationSeconds = 1200,
        submissionReason = "MANUAL_SUBMISSION",
        toggleCount = 0,
      } = req.body;

      if (!student || !student.name || !student.roll) {
        return res.status(400).json({ error: "Missing required student details (name, roll, etc.)." });
      }
      if (!String(student.phone || "").trim()) {
        return res.status(400).json({ error: "Phone number is required." });
      }

      const cleanEnrollment = String(student.enrollmentNumber || "").trim().toUpperCase();
      if (!cleanEnrollment) {
        return res.status(400).json({ error: "Validation Error: 'Enrollment Number *' (Primary Key) is required." });
      }

      // Deduplication safeguard: if this exact candidate submitted within the last 15 seconds, return that existing submission
      const recentSubmission = submissions.find(
        (s) =>
          s.student.enrollmentNumber.trim().toUpperCase() === cleanEnrollment &&
          Date.now() - new Date(s.submittedAt).getTime() < 15000
      );
      if (recentSubmission) {
        console.log(`[Exam Server] Deduplication: Returning existing submission for ${cleanEnrollment} to prevent duplicate entry.`);
        const cachedSheetRes = syncedSubmissionsCache.get(recentSubmission.id) || 
          syncedSubmissionsCache.get(`${cleanEnrollment}_att_${recentSubmission.attemptNumber || 1}`) || 
          { success: false, message: "Google Sheets did not confirm the previous write. Select Sync Now to retry." };
        return res.json({
          success: true,
          submission: recentSubmission,
          sheetResult: cachedSheetRes,
          isDuplicatePrevented: true,
        });
      }

      // Enforce Primary Key & Maximum 2 Attempts Policy
      const priorAttempts = submissions.filter(
        (s) => s.student.enrollmentNumber.trim().toUpperCase() === cleanEnrollment
      );

      if (priorAttempts.length >= 2) {
        return res.status(403).json({ 
          error: `Attempt Rejected: Enrollment Number ${cleanEnrollment} has already completed all 2 permitted attempts.`,
          code: "MAX_ATTEMPTS_EXCEEDED",
          enrollmentNumber: cleanEnrollment,
          attemptCount: priorAttempts.length,
          maxAttempts: 2,
        });
      }

      const attemptNumber = priorAttempts.length + 1;

      // Determine which questions were in this candidate's quiz session
      let targetQuestions: Question[] = [];
      if (Array.isArray(questionIds) && questionIds.length > 0) {
        targetQuestions = questionIds
          .map((id: string, idx: number) => {
            const found = QUESTIONS_MAP.get(id);
            return found ? { ...found, number: idx + 1 } : null;
          })
          .filter((q): q is Question => q !== null);
      }

      if (targetQuestions.length === 0) {
        // Fallback: evaluate against all questions that received answers, or first 20
        const answeredIds = answers ? Object.keys(answers) : [];
        if (answeredIds.length > 0) {
          targetQuestions = answeredIds
            .map((id: string, idx: number) => {
              const found = QUESTIONS_MAP.get(id);
              return found ? { ...found, number: idx + 1 } : null;
            })
            .filter((q): q is Question => q !== null);
        }
        if (targetQuestions.length === 0) {
          targetQuestions = QUESTIONS_BANK.slice(0, 20);
        }
      }

      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      const breakdown = targetQuestions.map((q) => {
        const studentAns = answers ? answers[q.id] : undefined;
        const hasAnswered = typeof studentAns === "number" && studentAns >= 0 && studentAns < q.options.length;
        const isCorrect = hasAnswered && studentAns === q.correctOptionIndex;

        if (!hasAnswered) {
          unansweredCount++;
        } else if (isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }

        return {
          questionId: q.id,
          questionNumber: q.number,
          questionText: q.question,
          options: q.options,
          selectedOption: hasAnswered ? studentAns : null,
          correctOption: q.correctOptionIndex,
          isCorrect,
          explanation: q.explanation,
        };
      });

      const totalQuestions = targetQuestions.length;
      const score = correctCount; // 1 mark per question
      const percentage = Math.round((score / totalQuestions) * 100);
      const timeSpentSeconds = Math.max(0, totalDurationSeconds - (timeRemainingSeconds || 0));

      const submission: QuizSubmission = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        student: {
          name: String(student.name).trim(),
          email: String(student.email || "").trim(),
          phone: String(student.phone || "").trim(),
          department: String(student.department || "").trim(),
          section: String(student.section || "").trim(),
          roll: String(student.roll).trim(),
          enrollmentNumber: String(student.enrollmentNumber || "").trim(),
        },
        answers: answers || {},
        score,
        totalQuestions,
        correctAnswersCount: correctCount,
        incorrectAnswersCount: incorrectCount,
        unansweredCount,
        percentage,
        timeSpentSeconds,
        totalDurationSeconds,
        submissionReason,
        toggleCount: Number(toggleCount) || 0,
        submittedAt: new Date().toISOString(),
        isSubmittedOnNetwork: true,
        networkSubmittedAt: new Date().toISOString(),
        attemptNumber,
        giftAwarded: determineGiftServer(percentage),
        breakdown,
      };

      submissions.unshift(submission);

      console.log(`[Exam Server] Submission received: ${submission.student.name} (${submission.student.roll}) - Reason: ${submissionReason} - Score: ${score}/${totalQuestions}`);

      // Auto-sync to Google Sheet if URL is configured
      let sheetResult: { success: boolean; message: string; data?: any } | null = null;
      if (configuredGoogleSheetUrl) {
        try {
          sheetResult = await syncSubmissionToGoogleSheet(submission, submission.giftAwarded, attemptNumber);
          console.log(`[Exam Server] Synced submission ${submission.id} to Google Sheet:`, sheetResult?.message);
        } catch (sheetErr) {
          console.warn(`[Exam Server] Sync to Google Sheet failed:`, sheetErr);
        }
      }

      return res.json({
        success: true,
        submission,
        sheetResult,
      });
    } catch (err: any) {
      console.error("[Exam Server] Error processing quiz submission:", err);
      return res.status(500).json({ error: "Failed to evaluate and save quiz submission." });
    }
  });

  // API 4: Get all recorded submissions (Invigilator / Audit dashboard)
  app.get("/api/submissions", (_req, res) => {
    res.json({
      count: submissions.length,
      submissions,
    });
  });

  // API 4.5: Google Sheet Configuration (Security Hardened: Raw URL is NEVER sent to candidates)
  app.get("/api/google-sheet-config", (req, res) => {
    const isInvigilator = req.headers["x-invigilator-key"] === "IEEE-INVIGILATOR-2026";
    res.json({
      configured: Boolean(configuredGoogleSheetUrl),
      isConnected: Boolean(configuredGoogleSheetUrl),
      sheetName: "Exam_Submissions",
      // Protect from candidate access: raw URL is strictly masked/withheld
      isServerSecured: true,
      maskedEndpoint: Boolean(configuredGoogleSheetUrl) ? "https://script.google.com/macros/s/••••••••/exec" : "",
      // Only authorized invigilator with key can see or edit
      ...(isInvigilator ? { url: configuredGoogleSheetUrl } : {}),
    });
  });

  app.post("/api/google-sheet-config", async (req, res) => {
    const isInvigilator = req.headers["x-invigilator-key"] === "IEEE-INVIGILATOR-2026";
    if (!isInvigilator) {
      return res.status(403).json({
        error: "Forbidden: Only authorized invigilators may configure Google Sheet settings.",
        code: "UNAUTHORIZED_INVIGILATOR",
      });
    }

    const { url } = req.body;
    const cleanUrl = String(url || "").trim();
    configuredGoogleSheetUrl = cleanUrl;
    console.log(`[Exam Server] Google Sheet URL updated by invigilator.`);

    if (cleanUrl) {
      try {
        const testUrl = new URL(cleanUrl);
        testUrl.searchParams.set("action", "ping");
        const resp = await fetch(testUrl.toString());
        const json = await resp.json();
        return res.json({
          success: true,
          configured: true,
          testResult: json,
        });
      } catch (e: any) {
        return res.json({
          success: true,
          configured: true,
          warning: `Saved URL, but test ping returned: ${e.message}`,
        });
      }
    }

    return res.json({ success: true, configured: Boolean(configuredGoogleSheetUrl) });
  });

  app.post("/api/sync-google-sheet", async (req, res) => {
    try {
      const { submission, giftAwarded, attemptNumber } = req.body;
      if (!submission || !submission.student) {
        return res.status(400).json({ success: false, message: "Missing submission object" });
      }
      // Server always uses the securely stored server-side URL
      const result = await syncSubmissionToGoogleSheet(
        submission,
        giftAwarded,
        attemptNumber
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || "Failed to sync to Google Sheet" });
    }
  });

  app.post("/api/sync-all-to-google-sheet", async (req, res) => {
    try {
      const { webAppUrl } = req.body;
      const targetUrl = (webAppUrl || configuredGoogleSheetUrl || "").trim();
      if (!targetUrl) {
        return res.status(400).json({ success: false, message: "No Google Sheet Web App URL configured." });
      }
      let parsedTarget: URL;
      try {
        parsedTarget = new URL(targetUrl);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid Google Apps Script URL." });
      }
      if (parsedTarget.protocol !== "https:" || parsedTarget.hostname !== "script.google.com" || !parsedTarget.pathname.includes("/macros/s/") || !parsedTarget.pathname.endsWith("/exec")) {
        return res.status(400).json({ success: false, message: "Use a deployed Google Apps Script Web App URL ending in /exec." });
      }

      const results = [];
      for (const sub of [...submissions].reverse()) {
        const r = await syncSubmissionToGoogleSheet(sub, sub.giftAwarded, sub.attemptNumber, targetUrl);
        results.push({
          submissionId: sub.id,
          candidate: sub.student.name,
          enrollment: sub.student.enrollmentNumber,
          success: r.success,
          message: r.message,
        });
      }

      return res.json({
        success: true,
        syncedCount: results.filter((r) => r.success).length,
        total: results.length,
        results,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || "Bulk sync failed" });
    }
  });

  // API 5: Clear submissions (useful for test resets)
  app.delete("/api/submissions", (_req, res) => {
    submissions.length = 0;
    res.json({ success: true, message: "Submissions cleared." });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Exam Portal Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

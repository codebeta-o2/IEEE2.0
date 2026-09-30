import rawQuestions from "../server/questions.json";
import { submitToGoogleSheet } from "../server/googleSheetsClient";
import { submissions } from "./_store";

function determineGift(percentage: number): string {
  if (percentage >= 90) return "IEEE Ceramic Coffee Mug";
  if (percentage > 80) return "Executive IEEE Metallic Pen";
  if (percentage > 75) return "IEEE Tech Sticker Pack";
  return "None (Below 75%)";
}

const questionsMap = new Map<string, any>((rawQuestions as any[]).map((q) => [q.id, q]));

async function getAttemptCount(enrollmentNumber: string): Promise<number> {
  const sheetUrl = String(process.env.GOOGLE_SHEET_WEBAPP_URL || "").trim();
  if (!sheetUrl) return submissions.filter(
    (submission) => submission.student.enrollmentNumber.trim().toUpperCase() === enrollmentNumber
  ).length;
  try {
    const url = new URL(sheetUrl);
    url.searchParams.set("action", "checkAttempts");
    url.searchParams.set("enrollmentNumber", enrollmentNumber);
    const response = await fetch(url);
    const data = await response.json();
    return Number(data.attemptCount) || 0;
  } catch {
    return submissions.filter(
      (submission) => submission.student.enrollmentNumber.trim().toUpperCase() === enrollmentNumber
    ).length;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const {
      student,
      answers = {},
      questionIds = [],
      timeRemainingSeconds = 0,
      totalDurationSeconds = 1200,
      submissionReason = "MANUAL_SUBMISSION",
      toggleCount = 0,
    } = req.body || {};

    if (!student || !student.name || !student.email || !student.phone || !student.roll) {
      return res.status(400).json({ error: "Validation Error: Candidate details are required." });
    }

    const cleanEnrollment = String(student.enrollmentNumber || "").trim().toUpperCase();
    if (!cleanEnrollment) {
      return res.status(400).json({ error: "Validation Error: 'Enrollment Number *' is required." });
    }

    const priorAttempts = await getAttemptCount(cleanEnrollment);
    if (priorAttempts >= 2) {
      return res.status(403).json({
        error: `Attempt Rejected: Enrollment Number ${cleanEnrollment} has already completed all 2 permitted attempts.`,
        code: "MAX_ATTEMPTS_EXCEEDED",
        enrollmentNumber: cleanEnrollment,
        attemptCount: priorAttempts,
        maxAttempts: 2,
      });
    }

    let targetQuestions: any[] = [];
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      targetQuestions = questionIds
        .map((id: string, idx: number) => {
          const found = questionsMap.get(id);
          return found ? { ...found, number: idx + 1 } : null;
        })
        .filter(Boolean);
    }

    if (targetQuestions.length === 0) {
      targetQuestions = (rawQuestions as any[]).slice(0, 20).map((q, idx) => ({ ...q, number: idx + 1 }));
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
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const giftAwarded = determineGift(percentage);
    const timeSpentSeconds = Math.max(0, totalDurationSeconds - timeRemainingSeconds);
    const submittedAt = new Date().toISOString();
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const submission = {
      id: submissionId,
      student,
      answers,
      score: correctCount,
      totalQuestions,
      correctAnswersCount: correctCount,
      incorrectAnswersCount: incorrectCount,
      unansweredCount,
      percentage,
      timeSpentSeconds,
      totalDurationSeconds,
      submissionReason,
      toggleCount,
      submittedAt,
      isSubmittedOnNetwork: true,
      networkSubmittedAt: submittedAt,
      attemptNumber: priorAttempts + 1,
      giftAwarded,
      breakdown,
    };

    // Forward directly to Google Sheet
    let sheetResult: any = { success: false, message: "Google Sheet sync was not confirmed." };
    try {
      const sheetUrl = String(process.env.GOOGLE_SHEET_WEBAPP_URL || "").trim();
      if (!sheetUrl) {
        sheetResult = { success: false, message: "GOOGLE_SHEET_WEBAPP_URL is not configured in Vercel." };
      } else {
        sheetResult = await submitToGoogleSheet(sheetUrl, {
          student,
          score: correctCount,
          totalQuestions,
          percentage,
          giftAwarded,
          attemptNumber: priorAttempts + 1,
          submissionReason,
          timeSpentSeconds,
          submissionId,
          submittedAt,
        }, giftAwarded, priorAttempts + 1);
      }
    } catch (sheetErr: any) {
      console.warn("Google Sheet sync warning on Vercel:", sheetErr);
      sheetResult = { success: false, message: sheetErr.message || "Google Sheet sync failed." };
    }

    submissions.unshift(submission);

    return res.status(200).json({
      success: true,
      submission,
      sheetResult,
    });
  } catch (error: any) {
    console.error("Vercel submit-quiz error:", error);
    return res.status(500).json({ error: error.message || "Internal submission error" });
  }
}

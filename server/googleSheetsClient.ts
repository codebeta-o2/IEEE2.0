export interface GoogleSheetStudent {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  section?: string;
  roll?: string;
  enrollmentNumber?: string;
}

export interface GoogleSheetSubmission {
  student: GoogleSheetStudent;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  giftAwarded?: string;
  attemptNumber?: number;
  submissionReason?: string;
  timeSpentSeconds?: number;
  submissionId?: string;
  submittedAt?: string;
}

export interface GoogleSheetWriteResult {
  success: boolean;
  message: string;
  data?: any;
}

export async function submitToGoogleSheet(
  endpoint: string,
  submission: GoogleSheetSubmission,
  giftAwarded?: string,
  attemptNumber?: number
): Promise<GoogleSheetWriteResult> {
  const url = new URL(endpoint);
  url.searchParams.set("action", "submit");

  const student = submission.student || {};
  const values: Record<string, string | number | undefined> = {
    enrollmentNumber: student.enrollmentNumber,
    name: student.name,
    roll: student.roll,
    department: student.department,
    section: student.section,
    email: student.email,
    phone: student.phone,
    score: submission.score,
    totalQuestions: submission.totalQuestions,
    percentage: submission.percentage,
    giftAwarded: giftAwarded || submission.giftAwarded,
    attemptNumber: attemptNumber || submission.attemptNumber,
    submissionReason: submission.submissionReason,
    timeSpent: submission.timeSpentSeconds,
    timeSpentSeconds: submission.timeSpentSeconds,
    submissionId: submission.submissionId,
    submittedAt: submission.submittedAt,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && String(value) !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        message: `Google Apps Script returned an unreadable response: ${text.slice(0, 200)}`,
      };
    }

    const hasWriteReceipt = Number(data.rowNumber) > 1 || data.duplicate === true;
    const success = response.ok && data.status === "success" && hasWriteReceipt;
    return {
      success,
      message: data.message || (success
        ? "Saved successfully!"
        : data.status === "success"
          ? "Google Apps Script did not return a saved-row confirmation."
          : `Google Apps Script returned status ${data.status || response.status}`),
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === "AbortError" ? "Request timed out." : error.message || String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

import { submissions } from "./_store";
import { submitToGoogleSheet } from "../server/googleSheetsClient";

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

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed. Use POST." });
  }

  const targetUrl = String(req.body?.webAppUrl || resolveGoogleSheetWebAppUrl()).trim();
  if (!targetUrl) {
    return res.status(400).json({ success: false, message: "GOOGLE_SHEET_WEBAPP_URL is not configured in Vercel." });
  }
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com" || !parsed.pathname.endsWith("/exec")) {
      return res.status(400).json({ success: false, message: "Use a deployed Google Apps Script URL ending in /exec." });
    }

    const results = [];
    for (const submission of [...submissions].reverse()) {
      const result = await submitToGoogleSheet(
        targetUrl,
        { ...submission, submissionId: submission.id },
        submission.giftAwarded,
        submission.attemptNumber
      );
      results.push({
        submissionId: submission.id,
        candidate: submission.student.name,
        enrollment: submission.student.enrollmentNumber,
        success: result.success,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      syncedCount: results.filter((result) => result.success).length,
      total: results.length,
      results,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Bulk sync failed." });
  }
}

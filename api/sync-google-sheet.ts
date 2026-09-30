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
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { submission, giftAwarded, attemptNumber = 1 } = req.body || {};
    if (!submission || !submission.student) {
      return res.status(400).json({ success: false, message: "Invalid submission payload" });
    }

    const sheetUrl = resolveGoogleSheetWebAppUrl();
    if (!sheetUrl) {
      return res.status(503).json({ success: false, message: "GOOGLE_SHEET_WEBAPP_URL is not configured in Vercel." });
    }
    const result = await submitToGoogleSheet(sheetUrl, {
      ...submission,
      submissionId: submission.id,
    }, giftAwarded || submission.giftAwarded || "None", attemptNumber);

    return res.status(result.success ? 200 : 502).json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to sync to Google Sheet",
    });
  }
}

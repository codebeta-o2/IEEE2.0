import { submitToGoogleSheet } from "../server/googleSheetsClient";

const DEFAULT_GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwedbdM3ofZTlsUR1RtbbzgMw58hDHURQvGbeFsiYYbi_X9wrNMmmEAk2Mmpi_inuYSlQ/exec";

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

    const sheetUrl = (process.env.GOOGLE_SHEET_WEBAPP_URL || DEFAULT_GOOGLE_SHEET_URL).trim();
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

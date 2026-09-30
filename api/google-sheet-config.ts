const INVIGILATOR_KEY = "IEEE-INVIGILATOR-2026";

function getSheetUrl(): string {
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

  if (req.method === "GET") {
    const configured = Boolean(getSheetUrl());
    const isInvigilator = req.headers["x-invigilator-key"] === INVIGILATOR_KEY;
    return res.status(200).json({
      configured,
      isConnected: configured,
      sheetName: "Exam_Submissions",
      isServerSecured: true,
      maskedEndpoint: configured ? "https://script.google.com/macros/s/••••••••/exec" : "",
      ...(isInvigilator ? { url: getSheetUrl() } : {}),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use GET or POST." });
  }

  if (req.headers["x-invigilator-key"] !== INVIGILATOR_KEY) {
    return res.status(403).json({
      error: "Forbidden: Only authorized invigilators may configure Google Sheet settings.",
      code: "UNAUTHORIZED_INVIGILATOR",
    });
  }

  const requestedUrl = String(req.body?.url || "").trim();
  if (requestedUrl) {
    try {
      const parsed = new URL(requestedUrl);
      if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com" || !parsed.pathname.endsWith("/exec")) {
        return res.status(400).json({ success: false, error: "Use a deployed Google Apps Script URL ending in /exec." });
      }
      parsed.searchParams.set("action", "ping");
      const response = await fetch(parsed.toString());
      const testResult = await response.json();
      return res.status(200).json({ success: true, configured: true, testResult });
    } catch (error: any) {
      return res.status(200).json({ success: true, configured: true, warning: `Saved URL, but test ping returned: ${error.message}` });
    }
  }

  return res.status(200).json({ success: true, configured: Boolean(getSheetUrl()) });
}

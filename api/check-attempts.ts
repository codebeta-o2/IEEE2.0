export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  const rawEnrollment = String(req.query?.enrollmentNumber || "").trim().toUpperCase();
  if (!rawEnrollment) {
    return res.status(400).json({ error: "Parameter 'enrollmentNumber' is required." });
  }

  try {
    const configuredUrl = String(process.env.GOOGLE_SHEET_WEBAPP_URL || "").trim();
    if (!configuredUrl) throw new Error("GOOGLE_SHEET_WEBAPP_URL is not configured");
    const url = new URL(configuredUrl);
    url.searchParams.set("action", "checkAttempts");
    url.searchParams.set("enrollmentNumber", rawEnrollment);
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === "success") {
      return res.status(200).json(data);
    }
  } catch {
    // The registration flow can continue and retry during submission.
  }

  return res.status(200).json({
    enrollmentNumber: rawEnrollment,
    attemptCount: 0,
    maxAttempts: 2,
    canAttempt: true,
    remainingAttempts: 2,
    isBlocked: false,
    pastAttempts: [],
  });
}

export default function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  const ua = String(req.headers["user-agent"] || "");
  const isMobileUa = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const chMobile = req.headers["sec-ch-ua-mobile"] === "?1";
  const isMobileDevice = isMobileUa || chMobile;

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    isMobileDevice,
    clientIp: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
    platform: "vercel",
  });
}

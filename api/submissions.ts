import { submissions } from "./_store";

export default function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "GET") {
    return res.status(200).json({ count: submissions.length, submissions });
  }

  if (req.method === "DELETE") {
    submissions.length = 0;
    return res.status(200).json({ success: true, message: "Submissions cleared." });
  }

  return res.status(405).json({ error: "Method not allowed. Use GET or DELETE." });
}

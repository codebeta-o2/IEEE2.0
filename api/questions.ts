import rawQuestions from "../server/questions.json";

export default function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  const countParam = req.query?.count;
  const pool = [...(rawQuestions as any[])];

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const limit = countParam === "all" ? pool.length : Math.min(parseInt(String(countParam || "20"), 10) || 20, pool.length);

  // Strip answer keys and explanations for exam integrity
  const sanitized = pool.slice(0, limit).map((q, idx) => ({
    id: q.id,
    number: idx + 1,
    subject: q.subject,
    question: q.question,
    codeSnippet: q.codeSnippet,
    options: q.options,
  }));

  res.status(200).json({ questions: sanitized });
}

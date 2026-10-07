import { NextResponse } from "next/server";
import { retrieve, Clause, getAskFallbackAnswer, getSectionHeaders } from "@/lib/analyze";

// Provider-agnostic LLM call (any OpenAI-compatible API). Returns null if no key/failure -> fallbacks kick in.
async function llm(system: string, user: string): Promise<string | null> {
  const key = process.env.LLM_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${process.env.LLM_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "gpt-4o-mini",
        temperature: 0,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    return (await r.json()).choices[0].message.content;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const b = await req.json();
  if (b.translate) {
    const text = await llm(
      `Translate this legal text into ${b.lang}. Keep key legal terms in English in brackets. Add nothing.`,
      b.text
    );
    return NextResponse.json({ text });
  }

  const { question, clauses, lang = "English" } = b as { question: string; clauses: Clause[]; lang: string };
  const headers = getSectionHeaders(lang);
  const hits = retrieve(question, clauses);
  if (!hits.length) {
    return NextResponse.json({ answer: headers.notFound, sources: [] });
  }

  const ctx = hits.map(c => `[Clause ${c.id} — ${c.title}] ${c.text}`).join("\n");
  const answer = await llm(
    `Answer ONLY using the clauses provided and cite clause numbers. If the answer is not there, reply exactly: ${headers.notFound}. Reply in ${lang}. You are not a lawyer.`,
    `${ctx}\n\nQuestion: ${question}`
  );

  return NextResponse.json({
    answer: answer ?? getAskFallbackAnswer(hits, lang),
    sources: hits.map(c => c.id),
  });
}

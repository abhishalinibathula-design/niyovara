# Niyovara — Understand Legal Documents. In Your Language.
Hackathon MVP: upload a legal document (.txt or the built-in fictional sample), see extracted parties/dates/penalties, read a plain-language explanation, translate clauses, and ask questions answered **only** from the document with clickable source clauses.

**Stack:** Next.js 14 (App Router) + TypeScript, plain CSS, one API route `/api/ask`. No database needed.

## Setup
```
npm install
cp .env.example .env.local   # optional: add LLM_API_KEY (any OpenAI-compatible provider)
npm run dev                  # http://localhost:3000
```
**Env vars:** `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`. Never commit `.env.local`. Without a key the app still works: answers quote the matching clauses, and Telugu/Hindi translation of sample Clause 6 is pre-written.

## How the RAG pipeline works (`lib/analyze.ts`, `app/api/ask/route.ts`)
Upload → text → **segment** into numbered clauses → regex **entity extraction** → question → **retrieve** the best-matching clauses (word-stem overlap; swap for embeddings later) → LLM is told to answer *only* from those clauses and cite numbers → answer + clause references → **View Source** highlights the clause. No match = "I couldn't find this information in the uploaded document."

## Demo (3–5 min)
Try Demo → processing steps → Key information → Explain simply → Translate (click Clause 6, pick Telugu) → Ask "What happens if the agreement is terminated?" → click the source → clause highlights → explain that answers are grounded and verifiable.

## Future improvements
PDF/DOCX parsing, OCR for scans, embeddings + vector DB (Supabase pgvector), LLM-based entity extraction, evaluation set (extraction accuracy, translation fidelity, grounding), history page, mobile bottom nav.

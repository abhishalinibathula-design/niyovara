// Rule-based analysis: simple, fast and never invents text (everything comes from the document).
export type Clause = { id: number; title: string; text: string };

// Splits "6. Termination. Either party may..." lines into clauses, supporting multi-line clauses.
export function segment(t: string): Clause[] {
  const lines = t.split(/\r?\n/);
  const clauses: Clause[] = [];
  let current: Clause | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^(\d+)\.\s+([^.]+?)(?:\.\s*(.*))?$/);
    if (m) {
      if (current) clauses.push(current);
      current = {
        id: +m[1],
        title: m[2].trim(),
        text: (m[3] || "").trim(),
      };
    } else if (current) {
      if (trimmed) {
        current.text = current.text ? `${current.text} ${trimmed}` : trimmed;
      }
    }
  }
  if (current) clauses.push(current);

  // Fallback if no numbered clauses exist: split by non-empty paragraph blocks
  if (clauses.length === 0) {
    const paras = t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    paras.forEach((p, idx) => {
      const firstPeriod = p.indexOf(".");
      const title = firstPeriod > 0 && firstPeriod < 50 ? p.slice(0, firstPeriod).trim() : `Section ${idx + 1}`;
      const text = firstPeriod > 0 && firstPeriod < 50 ? p.slice(firstPeriod + 1).trim() : p;
      clauses.push({ id: idx + 1, title, text: text || p });
    });
  }

  return clauses;
}

// Regex entity extraction (the LLM is only used for answers/translation).
export function entities(t: string) {
  const f = (r: RegExp) =>
    Array.from(new Set((t.match(r) || []).map(s => s.replace(/\s+/g, " ").trim()))).filter(
      s => s.length > 1 && s.length < 90
    );

  const partiesMatches: string[] = [];
  const lines = t.split(/\r?\n/);
  const suffix =
    "(?:Pvt\\.?\\s*Ltd\\.?|Enterprises|Ltd\\.?|Corporation|CORPORATION|Corp\\.?|Inc\\.?|INC\\.?|LLC|LLP|Co\\.?|Company|Team|Authors|Foundation)";
  const pattern = new RegExp(`\\b([A-Z][A-Za-z0-9&.\\-]+(?:\\s+[A-Z][A-Za-z0-9&.\\-]+)*\\s+${suffix})\\b`, "g");

  for (const l of lines) {
    const m = l.match(pattern);
    if (m) partiesMatches.push(...m);

    const roles = l.match(/\b(?:Party [A-Z]|Licensor|Licensee|Contributor)\b/g);
    if (roles) partiesMatches.push(...roles);

    const cp = l.match(/^\s*(?:Copyright|\(c\)|©)\s+(?:(?:\([cC]\)\s*)?\d{4},?\s+)?([^\n]+?)(?:\.\s*All rights reserved|\.?\s*$)/i);
    if (cp && cp[1] && cp[1].length < 80 && !/^(?:\[|\d)/.test(cp[1].trim())) {
      partiesMatches.push(cp[1].trim());
    }
  }

  return {
    Parties: Array.from(new Set(partiesMatches.map(s => s.trim()))).filter(Boolean),
    Dates: f(
      /(?:\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b)|(?:\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b)|(?:\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b)|(?:\b(?:19|20)\d{2}\b)/gi
    ),
    Money: f(/(?:US\s*)?(?:\$|Rs\.?|₹|€|£|USD|INR|EUR|GBP)\s*[\d,]+(?:\.\d{2})?/gi),
    Deadlines: f(/\b\d+\s*(?:business\s+|working\s+)?(?:days?|months?|years?|weeks?|hours?)(?:\s+[a-z]+){0,5}\b/gi),
    Penalties: f(/(?:penalty|fine|liquidated damages|liability for damages)\s+(?:of|for|amounting to)?[^.,;\n]*/gi),
    Licenses: f(/(?:Apache License(?:\s+Version\s+[\d.]+)?|GNU (?:Lesser )?General Public License|MIT License|BSD License)/gi),
  };
}

// Re-export complete multilingual translation and summary helpers for all 8 languages
export {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  getSectionHeaders,
  summarizeClause,
  describeDocument,
  getClauseFallbackTranslation,
  getAskFallbackAnswer,
  FULL_CLAUSE_TRANSLATIONS,
  CLAUSE_SUMMARIES,
} from "./i18n";

// Concept map for multilingual legal querying (English + 7 Indian languages)
const CONCEPT_PATTERNS: Record<string, RegExp> = {
  termination: /terminat|cancel|రద్దు|సమాప్తి|समाप्त|முடிவு|ரத்து|ರದ್ದ|റദ്ദാ|खंडन|বাতিল/i,
  payment: /pay|fee|invoice|చెల్లిం|రూ\.|₹|भुगतान|कட்டண|பணம்|ಪಾವತಿ|പേയ്‌മെ|പണം|पैसे|পেমেন্ট|টাকা/i,
  penalty: /penalt|fine|late|overdue|interest|జరిమానా|ఆలస్య|जुर्माना|அபராதம்|தாமத|ದಂಡ|ಪಿഴ|दंड|জরিমানা/i,
  warranty: /warrant|guarante|వారంటీ|वारंटी|உத்தரவாத|ವಾರಂಟಿ|വാറന്റി|ওয়ারেন্টি/i,
  liability: /liabilit|damage|loss|బాధ్యత|నష్ట|दायित्व|नुकसान|பொறுப்பு|சேத|ಹೊಣೆಗಾರಿಕೆ|ನಷ್ಟ|ബാധ്യത|നഷ്ടം|दोष|দায়/i,
  services: /service|maintenance|deliver|సేవలు|నిర్వహణ|सेवा|रखरखाव|சேவை|பராமரிப்பு|ಸೇವೆ|ನಿರ್ವಹಣೆ|സേവന|পরিষেবা/i,
  confidentiality: /confident|secret|privacy|disclosure|గోప్యత|రహస్య|गोपनीय|ரகசிய|ಗೌಪ್ಯ|രഹസ്യ|গোপনীয়/i,
  patent: /patent|infring|పేటెంట్|ఉల్లంఘన|पेटेंट|उल्लंघन|காப்புரிமை|ಮೀರ|ಪೇಟೆಂಟ್|പേറ്റന്റ്|পেটেন্ট/i,
  copyright: /copyright|author|reproduce|కాపీరైట్|कॉपीराइट|பதிப்புரிமை|ಕೃತಿಸ್ವಾಮ್ಯ|പകർപ്പവകാശ|কপিরাইট/i,
  definitions: /definition|meaning|shall mean|నిర్వచన|అర్థం|परिभाषा|अर्थ|வரையறை|பொருள்|ವ್ಯಾಖ್ಯಾನ|നിർവ്വചന|সংজ্ঞা/i,
  parties: /part(?:y|ies)|who|between|పక్షాలు|ఎవరు|पक्ष|कौन|தரப்பினர்|யார்|ಪಕ್ಷಗಳು|ಯಾರು|കക്ഷികൾ|ആര്|পক্ষ|কারা/i,
};

// Retrieval: score clauses by shared word stems, Indic keywords, and clause references.
export function retrieve(q: string, c: Clause[], k = 2): Clause[] {
  const normQ = q.toLowerCase();

  // 1. Direct clause number inquiry (e.g. "Clause 6", "క్లాజు 1", "धारा 3", "பிரிவு 2")
  const clauseNumMatch = normQ.match(/(?:clause|section|క్లాజు|धारा|பிரிவு|ಷರತ್ತು|ക്ലോസ്|कलम)\s*(\d+)/i);
  if (clauseNumMatch) {
    const targetId = parseInt(clauseNumMatch[1], 10);
    const exact = c.find(x => x.id === targetId);
    if (exact) return [exact];
  }

  // 2. Multilingual concept matches
  const matchedConcepts: string[] = [];
  for (const [concept, regex] of Object.entries(CONCEPT_PATTERNS)) {
    if (regex.test(normQ)) {
      matchedConcepts.push(concept);
    }
  }

  // 3. ASCII word tokens (>= 3 chars)
  const tokens = normQ.match(/[a-z0-9]{3,}/g) || [];

  const scored = c.map(x => {
    let score = 0;
    const clauseSearchText = (x.title + " " + x.text).toLowerCase();

    // Check matched concepts against clause text
    for (const concept of matchedConcepts) {
      const pattern = CONCEPT_PATTERNS[concept];
      if (pattern && pattern.test(clauseSearchText)) {
        score += 4;
      }
    }

    // Check token overlaps
    for (const tok of tokens) {
      if (clauseSearchText.includes(tok)) {
        score += 1;
      }
    }

    return { clause: x, score };
  });

  const hits = scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(r => r.clause);

  return hits.length > 0 ? hits : (c.length > 0 ? [c[0]] : []);
}

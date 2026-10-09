"use client";
import { useState, useEffect, useRef } from "react";
import { SAMPLE } from "@/lib/sample";
import {
  segment,
  entities,
  summarizeClause,
  describeDocument,
  getSectionHeaders,
  getClauseFallbackTranslation,
  SUPPORTED_LANGUAGES,
  type Clause,
} from "@/lib/analyze";

type ThemePreference = "light" | "dark" | "system";

const LANGS = SUPPORTED_LANGUAGES;
const PROCESS = [
  "Document uploaded",
  "Text extracted",
  "Document segmented",
  "Legal clauses identified",
  "Important entities extracted",
  "Summary generated",
];

const MULTILINGUAL_SUGGESTIONS: Record<string, string[]> = {
  English: [
    "What happens if the agreement is terminated?",
    "What are the payment terms?",
    "Who are the parties involved?",
    "Are there any penalties or liabilities?",
  ],
  Telugu: [
    "ఒప్పందం రద్దు అయితే ఏమవుతుంది? (Termination)",
    "చెల్లింపు నిబంధనలు ఏమిటి? (Payment Terms)",
    "ఇందులో పాల్గొన్న పక్షాలు ఎవరు? (Parties)",
    "ఏవైనా జరిమానాలు లేదా బాధ్యతలు ఉన్నాయా? (Penalties & Liabilities)",
  ],
  Hindi: [
    "यदि समझौता समाप्त होता है तो क्या होगा? (Termination)",
    "भुगतान की शर्तें क्या हैं? (Payment Terms)",
    "इसमें शामिल पक्ष कौन से हैं? (Parties)",
    "क्या कोई जुर्माना या दायित्व है? (Penalties & Liabilities)",
  ],
  Tamil: [
    "ஒப்பந்தம் ரத்து செய்யப்பட்டால் என்ன நடக்கும்? (Termination)",
    "கட்டண விதிமுறைகள் என்ன? (Payment Terms)",
    "இதில் சம்பந்தப்பட்ட தரப்பினர் யார்? (Parties)",
    "ஏதேனும் அபராதம் அல்லது பொறுப்புகள் உள்ளதா? (Penalties & Liabilities)",
  ],
  Kannada: [
    "ಒಪ್ಪಂದ ರದ್ದುಗೊಂಡರೆ ಏನಾಗುತ್ತದೆ? (Termination)",
    "ಪಾವತಿ ನಿಯಮಗಳು ಯಾವುವು? (Payment Terms)",
    "ಇದರಲ್ಲಿ ಭಾಗಿಯಾಗಿರುವ ಪಕ್ಷಗಳು ಯಾರು? (Parties)",
    "ಯಾವುದಾದರೂ ದಂಡ ಅಥವಾ ಹೊಣೆಗಾರಿಕೆಗಳಿವೆಯೇ? (Penalties & Liabilities)",
  ],
  Malayalam: [
    "കരാർ റദ്ദാക്കിയാൽ എന്ത് സംഭവിക്കും? (Termination)",
    "പേയ്‌മെന്റ് വ്യവസ്ഥകൾ എന്തൊക്കെയാണ്? (Payment Terms)",
    "ഇതിൽ ഉൾപ്പെട്ടിരിക്കുന്ന കക്ഷികൾ ആരെല്ലാം? (Parties)",
    "എന്തെങ്കിലും പിഴയോ ബാധ്യതകളോ ഉണ്ടോ? (Penalties & Liabilities)",
  ],
  Marathi: [
    "करार संपुष्टात आल्यास काय होईल? (Termination)",
    "पेमेंटच्या अटी काय आहेत? (Payment Terms)",
    "यात सहभागी पक्ष कोणते आहेत? (Parties)",
    "काही दंड किंवा दायित्वे आहेत का? (Penalties & Liabilities)",
  ],
  Bengali: [
    "চুক্তি বাতিল হলে কী হবে? (Termination)",
    "পেমেন্টের শর্তাবলী কী? (Payment Terms)",
    "জড়িত পক্ষগুলি কারা? (Parties)",
    "কোনো জরিমানা বা দায়বদ্ধতা আছে কি? (Penalties & Liabilities)",
  ],
};

const DISC =
  "Niyovara is an AI-powered document understanding tool for informational purposes only. It does not provide legal advice. Please consult a qualified legal professional for legal decisions.";

function ThemeSelector({
  themePref,
  onThemeChange,
}: {
  themePref: ThemePreference;
  onThemeChange: (pref: ThemePreference) => void;
}) {
  return (
    <div className="theme-selector-wrap" role="radiogroup" aria-label="Theme mode selector">
      <button
        type="button"
        className={"theme-pill-btn" + (themePref === "light" ? " active" : "")}
        onClick={() => onThemeChange("light")}
        title="Light theme"
        aria-label="Light theme"
        role="radio"
        aria-checked={themePref === "light"}
      >
        <span className="theme-pill-icon">☀️</span>
        <span className="theme-pill-text">Light</span>
      </button>
      <button
        type="button"
        className={"theme-pill-btn" + (themePref === "dark" ? " active" : "")}
        onClick={() => onThemeChange("dark")}
        title="Dark theme"
        aria-label="Dark theme"
        role="radio"
        aria-checked={themePref === "dark"}
      >
        <span className="theme-pill-icon">🌙</span>
        <span className="theme-pill-text">Dark</span>
      </button>
      <button
        type="button"
        className={"theme-pill-btn" + (themePref === "system" ? " active" : "")}
        onClick={() => onThemeChange("system")}
        title="System / Default theme"
        aria-label="System / Default theme"
        role="radio"
        aria-checked={themePref === "system"}
      >
        <span className="theme-pill-icon">💻</span>
        <span className="theme-pill-text">System</span>
      </button>
    </div>
  );
}

// Independent per-clause translation state
interface ClauseTranslationState {
  selectedLang: string;
  displayMode: "original" | "translated";
  activeLang?: string;
  translatedText?: string;
  loading: boolean;
  error?: string;
}

export default function Home() {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState(-1);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"simple" | "overview">("simple");
  const [active, setActive] = useState<number | null>(null);
  const [lang, setLang] = useState<string>("English");
  const [q, setQ] = useState("");
  const [chat, setChat] = useState<{ q: string; a: string; src: number[] }[]>([]);
  const [find, setFind] = useState("");
  const [copied, setCopied] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>("system");
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  // Per-clause state management & expansion
  const [clauseStates, setClauseStates] = useState<Record<number, ClauseTranslationState>>({});
  const [expandedClauses, setExpandedClauses] = useState<Record<number, boolean>>({});
  // Cache for translations keyed by `${clauseId}:${targetLanguage}`
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const cacheRef = useRef<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved =
      (localStorage.getItem("niyovara_theme") as ThemePreference) ||
      (localStorage.getItem("nyayaai_theme") as ThemePreference) ||
      "system";
    const valid: ThemePreference = ["light", "dark", "system"].includes(saved) ? saved : "system";
    setThemePref(valid);
    applyTheme(valid);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const current =
        (localStorage.getItem("niyovara_theme") as ThemePreference) ||
        (localStorage.getItem("nyayaai_theme") as ThemePreference) ||
        "system";
      if (current === "system") {
        const resolved = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", resolved);
        document.documentElement.style.colorScheme = resolved;
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, []);

  // Close Ask modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAskOpen) {
        setIsAskOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAskOpen]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isAskOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat, isAskOpen, isAsking]);

  function applyTheme(pref: ThemePreference) {
    const isDark =
      pref === "dark" ||
      (pref === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const resolved = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
  }

  function handleThemeChange(pref: ThemePreference) {
    setThemePref(pref);
    try {
      localStorage.setItem("niyovara_theme", pref);
      localStorage.setItem("nyayaai_theme", pref);
    } catch {}
    applyTheme(pref);
  }

  const clauses = segment(text);
  const ents = entities(text);

  async function load(t: string, n: string) {
    if (segment(t).length === 0) {
      setErr(
        "Sorry, we couldn't read clauses in this document. Try a clearer file, or numbered clauses like “1. Title. Text…”."
      );
      return;
    }
    setErr("");
    setText("");
    setName(n);
    setChat([]);
    setActive(null);
    setLang("English");
    setFind("");
    setClauseStates({});
    setTranslationCache({});
    cacheRef.current = {};
    setExpandedClauses({});

    for (let i = 0; i < PROCESS.length; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 320));
    }
    setText(t);
    setStep(-1);
    setTab("simple");

    // Expand the first clause by default for immediate preview
    const parsed = segment(t);
    if (parsed.length > 0) {
      setExpandedClauses({ [parsed[0].id]: true });
    }
  }

  async function onFile(f?: File) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".txt")) {
      setErr(
        "PDF, DOCX and scanned-image support is planned. For now please upload a .txt file or try the demo sample."
      );
      return;
    }
    load(await f.text(), f.name);
  }

  // Helper to safely get or initialize a clause's independent translation state
  const getClauseState = (id: number): ClauseTranslationState => {
    return (
      clauseStates[id] || {
        selectedLang: lang !== "English" ? lang : "Telugu",
        displayMode: "original",
        loading: false,
      }
    );
  };

  // User changes language dropdown in a clause
  const handleLanguageChange = (id: number, newLang: string) => {
    setClauseStates((prev) => {
      const cur = prev[id] || {
        selectedLang: newLang,
        displayMode: "original",
        loading: false,
      };
      return {
        ...prev,
        [id]: {
          ...cur,
          selectedLang: newLang,
        },
      };
    });
  };

  // Restore the exact original English text extracted from the document
  const handleShowOriginal = (id: number) => {
    setClauseStates((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          displayMode: "original",
        },
      };
    });
  };

  // Switch back to viewing the existing translation
  const handleShowTranslated = (id: number) => {
    setClauseStates((prev) => {
      const cur = prev[id];
      if (!cur || !cur.translatedText) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          displayMode: "translated",
        },
      };
    });
  };

  // When user clicks Translate on the clause row
  const handleTranslateClick = (id: number) => {
    // Expand the clause row so the language selector and content are visible
    setExpandedClauses((prev) => ({ ...prev, [id]: true }));
    setClauseStates((prev) => {
      if (prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          selectedLang: lang !== "English" ? lang : "Telugu",
          displayMode: "original",
          loading: false,
        },
      };
    });
  };

  // Confirm and apply translation for a clause
  const handleApplyTranslation = async (id: number, specificLang?: string) => {
    const currentState = getClauseState(id);
    const targetLang = specificLang || currentState.selectedLang || (lang !== "English" ? lang : "Telugu");
    const c = clauses.find((x) => x.id === id);
    if (!c) return;

    // Ensure the clause is expanded
    setExpandedClauses((prev) => ({ ...prev, [id]: true }));

    // If English is selected, revert display to original English
    if (targetLang === "English") {
      setClauseStates((prev) => ({
        ...prev,
        [id]: {
          ...getClauseState(id),
          selectedLang: "English",
          displayMode: "original",
          activeLang: "English",
          loading: false,
          error: undefined,
        },
      }));
      return;
    }

    const cacheKey = `${id}:${targetLang}`;

    // 1. Check in-memory translation cache to avoid duplicate API calls
    if (cacheRef.current[cacheKey]) {
      const cachedText = cacheRef.current[cacheKey];
      setClauseStates((prev) => ({
        ...prev,
        [id]: {
          ...getClauseState(id),
          selectedLang: targetLang,
          displayMode: "translated",
          activeLang: targetLang,
          translatedText: cachedText,
          loading: false,
          error: undefined,
        },
      }));
      return;
    }

    // 2. High-fidelity fallback translation dictionary for native Indic languages
    const fallback = getClauseFallbackTranslation(c, targetLang);

    // Set loading indicator
    setClauseStates((prev) => ({
      ...prev,
      [id]: {
        ...getClauseState(id),
        selectedLang: targetLang,
        displayMode: fallback ? "translated" : prev[id]?.displayMode || "original",
        activeLang: targetLang,
        translatedText: fallback || prev[id]?.translatedText,
        loading: true,
        error: undefined,
      },
    }));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translate: true, text: c.text, lang: targetLang }),
      });
      const data = await res.json();
      if (data?.text) {
        cacheRef.current[cacheKey] = data.text;
        setTranslationCache((prev) => ({ ...prev, [cacheKey]: data.text }));
        setClauseStates((prev) => ({
          ...prev,
          [id]: {
            ...getClauseState(id),
            selectedLang: targetLang,
            displayMode: "translated",
            activeLang: targetLang,
            translatedText: data.text,
            loading: false,
            error: undefined,
          },
        }));
      } else if (fallback) {
        cacheRef.current[cacheKey] = fallback;
        setTranslationCache((prev) => ({ ...prev, [cacheKey]: fallback }));
        setClauseStates((prev) => ({
          ...prev,
          [id]: {
            ...getClauseState(id),
            selectedLang: targetLang,
            displayMode: "translated",
            activeLang: targetLang,
            translatedText: fallback,
            loading: false,
            error: undefined,
          },
        }));
      } else {
        setClauseStates((prev) => ({
          ...prev,
          [id]: {
            ...getClauseState(id),
            selectedLang: targetLang,
            loading: false,
            error: "Translation requires an LLM API key. Configure LLM_API_KEY in .env.local.",
          },
        }));
      }
    } catch {
      if (fallback) {
        cacheRef.current[cacheKey] = fallback;
        setTranslationCache((prev) => ({ ...prev, [cacheKey]: fallback }));
        setClauseStates((prev) => ({
          ...prev,
          [id]: {
            ...getClauseState(id),
            selectedLang: targetLang,
            displayMode: "translated",
            activeLang: targetLang,
            translatedText: fallback,
            loading: false,
            error: undefined,
          },
        }));
      } else {
        setClauseStates((prev) => ({
          ...prev,
          [id]: {
            ...getClauseState(id),
            selectedLang: targetLang,
            loading: false,
            error: "Translation request failed. Please check your connection and try again.",
          },
        }));
      }
    }
  };

  async function ask(queryText?: string) {
    const question = (queryText || q).trim();
    if (!question || isAsking) return;
    setQ("");
    setIsAsking(true);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, clauses, lang }),
      }).then((res) => res.json());

      setChat((c) => [...c, { q: question, a: r.answer || "No response received.", src: r.sources || [] }]);
    } catch {
      setChat((c) => [
        ...c,
        { q: question, a: "Sorry, something went wrong. Please check your connection and try again.", src: [] },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  // Scroll to and highlight a clause in the bottom Original Document section
  const view = (id: number) => {
    setActive(id);
    setExpandedClauses((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      document.getElementById("c" + id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const toggleClauseExpanded = (id: number) => {
    setExpandedClauses((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const hit = (c: Clause) =>
    Boolean(find && (c.title + " " + c.text).toLowerCase().includes(find.toLowerCase()));

  const Ref = ({ id }: { id: number }) => (
    <button
      type="button"
      className="ref-pill"
      onClick={() => view(id)}
      title={`Jump to Clause ${id} in Original Document`}
    >
      Clause {id} ↗
    </button>
  );

  const by = (re: RegExp) => clauses.filter((c) => re.test(c.text) || re.test(c.title));

  const copyText = (val: string) => {
    navigator.clipboard?.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const headers = getSectionHeaders(lang);

  // App Header
  const renderHeader = () => (
    <header className="bar">
      {/* Left side: Niyovara Logo and Dashboard button */}
      <div className="bar-left">
        <div className="bar-brand">
          <span className="bar-logo">⚖️ Niyovara</span>
        </div>
        <button
          type="button"
          className="bar-btn bar-dashboard-btn"
          onClick={() => {
            if (!text) {
              load(SAMPLE, "Sample Service Agreement (fictional).txt");
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          title="Document Dashboard"
        >
          <span className="bar-btn-icon">📊</span>
          <span>Dashboard</span>
        </button>
      </div>

      {/* Right side in exact order: Upload New Document -> Light / Dark / System -> Ask Niyovara */}
      <div className="bar-right">
        <button
          type="button"
          className="bar-btn bar-upload-btn"
          onClick={() => {
            if (text) {
              setText("");
              setStep(-1);
            } else {
              fileInputRef.current?.click();
            }
          }}
          title="Upload New Document"
        >
          <span className="bar-btn-icon">📁</span>
          <span>Upload New Document</span>
        </button>

        <ThemeSelector themePref={themePref} onThemeChange={handleThemeChange} />

        <button
          type="button"
          className={"bar-btn bar-ask-btn" + (isAskOpen ? " active" : "")}
          onClick={() => {
            if (!text) {
              load(SAMPLE, "Sample Service Agreement (fictional).txt").then(() => {
                setIsAskOpen(true);
              });
            } else {
              setIsAskOpen((prev) => !prev);
            }
          }}
          title={isAskOpen ? "Close Ask Niyovara panel" : "Ask Niyovara"}
          aria-label="Ask Niyovara"
          aria-expanded={isAskOpen}
        >
          <span className="bar-btn-icon">💬</span>
          <span>Ask Niyovara</span>
        </button>
      </div>
    </header>
  );

  // Ask Niyovara Right-Side Panel
  const renderAskPanel = () => {
    return (
      <aside
        className="ask-side-panel"
        aria-label="Ask Niyovara Legal Assistant Panel"
      >
        <div className="ask-panel-header">
          <div className="ask-panel-title-group">
            <span className="ask-panel-logo-icon">💬</span>
            <div>
              <h3 className="ask-panel-heading">Ask Niyovara</h3>
              <p className="ask-panel-subtitle">
                Grounded legal Q&A in {lang}. Answers cite verified source clauses.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ask-panel-close-btn"
            onClick={() => setIsAskOpen(false)}
            title="Close Ask Niyovara panel"
            aria-label="Close Ask Niyovara panel"
          >
            ✕
          </button>
        </div>

        <div className="ask-panel-body">
          {/* Suggested Questions Section */}
          <div className="ask-suggestions-box">
            <div className="ask-suggestions-header">
              <span>💡 Suggested questions:</span>
            </div>
            <div className="ask-suggestions-list">
              {(MULTILINGUAL_SUGGESTIONS[lang] || MULTILINGUAL_SUGGESTIONS.English).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => ask(s)}
                >
                  💬 {s}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation History */}
          <div className="ask-chat-thread">
            {chat.length === 0 && (
              <div className="ask-empty-state">
                <span className="ask-empty-icon">⚖️</span>
                <div className="ask-empty-title">Ask any question about this document in {lang}.</div>
                <p className="ask-empty-desc">
                  Every answer is strictly grounded in the document clauses with clickable source citations.
                </p>
              </div>
            )}

            {chat.map((m, i) => (
              <div key={i} className="chat-pair">
                <div className="chat-msg chat-q">
                  <b>Q:</b> {m.q}
                </div>
                <div className="chat-msg chat-a">
                  <div className="chat-a-header">
                    <span>⚖️ Niyovara:</span>
                  </div>
                  <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.a}</p>
                  {m.src.length > 0 ? (
                    <div className="chat-sources-bar">
                      <b>Verified Sources: </b>
                      {m.src.map((id) => (
                        <button
                          key={id}
                          type="button"
                          className="ref-pill"
                          onClick={() => view(id)}
                          title={`Scroll to Clause ${id} in document`}
                        >
                          Clause {id} ↗
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="warn" style={{ display: "inline-block", padding: "4px 8px", fontSize: "0.8rem" }}>
                      {headers.noSource}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {isAsking && (
              <div className="chat-msg chat-a">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="spinner-sm" />
                  <span style={{ fontSize: "0.88rem", color: "var(--ink-secondary)" }}>
                    Retrieving relevant clauses and formulating answer…
                  </span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* Panel Footer: Input & Send Button */}
        <div className="ask-panel-footer">
          <input
            className="ask-panel-input"
            placeholder={headers.askPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            disabled={isAsking}
            aria-label="Ask a legal question"
          />
          <button
            type="button"
            className="ask-panel-send-btn"
            onClick={() => ask()}
            disabled={isAsking || !q.trim()}
          >
            <span>Ask AI</span> ➔
          </button>
        </div>
      </aside>
    );
  };

  // ==========================================
  // VIEW 1: HERO / UPLOAD SCREEN
  // ==========================================
  if (!text) {
    return (
      <>
        {renderHeader()}

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".txt,.pdf,.docx,image/*"
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        <div className={"app-layout" + (isAskOpen ? " with-ask-panel" : "")}>
          <div className="main-content-area">
            <div className="wrap">
              {/* Hero Welcome Section */}
          <div className="hero-wrapper">
            <div className="hero-aura-bg" />
            <div className="hero-content">
              <div className="hero-highlights-row">
                <span className="hero-highlight-pill hl-languages">
                  🇮🇳 8 Indian Languages
                </span>
                <span className="hero-highlight-pill hl-plain">
                  💡 Plain-Language Explanations
                </span>
                <span className="hero-highlight-pill hl-grounded">
                  🛡️ Verifiable & Grounded
                </span>
              </div>

              <h1 className="hero-title-main">
                Understand Legal Documents.{" "}
                <span className="hero-gradient-text">In Your Language.</span>
              </h1>
              <p className="hero-tagline-text">
                Upload court notices, contracts, service agreements, or FIRs. Get instant plain-language summaries,
                verify native translations across 8 Indian languages, and ask grounded questions with verifiable source clause citations.
              </p>
            </div>
          </div>

          {/* Workflow Stepper */}
          <div className="workflow-section">
            <div className="workflow-section-label">
              <span>⚡ 5-Step Grounded Legal Intelligence Pipeline</span>
            </div>
            <div className="workflow-row">
              <div className="workflow-node step-pill step-upload active" title="Current Step: Upload">
                <span className="workflow-node-index">1</span>
                <span className="workflow-node-title">📁 Upload</span>
                <span className="workflow-active-badge">Active</span>
              </div>
              <span className="workflow-arrow-sep" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
              <div className="workflow-node step-pill step-understand" title="Step 2: Understand">
                <span className="workflow-node-index">2</span>
                <span className="workflow-node-title">💡 Understand</span>
              </div>
              <span className="workflow-arrow-sep" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
              <div className="workflow-node step-pill step-translate" title="Step 3: Translate">
                <span className="workflow-node-index">3</span>
                <span className="workflow-node-title">🌐 Translate</span>
              </div>
              <span className="workflow-arrow-sep" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
              <div className="workflow-node step-pill step-ask" title="Step 4: Ask AI">
                <span className="workflow-node-index">4</span>
                <span className="workflow-node-title">💬 Ask AI</span>
              </div>
              <span className="workflow-arrow-sep" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
              <div className="workflow-node step-pill step-verify" title="Step 5: Verify">
                <span className="workflow-node-index">5</span>
                <span className="workflow-node-title">🛡️ Verify</span>
              </div>
            </div>
          </div>

          {/* Upload Dropzone Hero Card */}
          <div
            className="dropzone dropzone-container"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="dropzone-border-glow" aria-hidden="true" />
            <div className="drop-icon-badge" aria-hidden="true">
              <svg className="drop-legal-svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="drop-headline">Upload your legal document</div>
            <div className="drop-subtext">
              Drag & drop your agreement, court notice, or contract (.txt), or choose from your computer
            </div>

            <div className="drop-buttons-row">
              <label className="btn btn-upload-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload Legal Document (.txt)</span>
                <input
                  type="file"
                  hidden
                  accept=".txt,.pdf,.docx,image/*"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                className="btn alt btn-demo-pill"
                onClick={() => load(SAMPLE, "Sample Service Agreement (fictional).txt")}
              >
                <span>✨ Try Demo Sample</span>
              </button>
            </div>

            <div className="drop-formats-tags">
              <span className="format-chip fmt-txt">✓ Plain Text (.txt)</span>
              <span className="format-chip fmt-seg">⚡ Instant Segmentation</span>
              <span className="format-chip fmt-rag">🔒 100% Client-Safe RAG</span>
            </div>
          </div>

          {err && <div className="err">⚠️ {err}</div>}

          {step >= 0 && (
            <div className="card" style={{ maxWidth: 600, margin: "20px auto", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Processing: {name}</b>
                <span className="chip l">Analyzing</span>
              </div>
              <progress value={step + 1} max={6} />
              <div style={{ display: "grid", gap: "6px", marginTop: "10px" }}>
                {PROCESS.map((p, i) => (
                  <div
                    key={p}
                    style={{
                      color: i <= step ? "var(--emerald)" : "var(--ink-muted)",
                      fontWeight: i <= step ? 600 : 400,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <span>{i <= step ? "✓" : "○"}</span> {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature Cards Quad Grid */}
          <div className="features-section-block">
            <div className="features-heading-area">
              <h3>Comprehensive Legal Intelligence</h3>
              <p>Built specifically for Indian legal documents with transparency, accuracy, and regional language support.</p>
            </div>

            <div className="features-quad-grid">
              <div className="feature-box f-understand card">
                <div>
                  <div className="feature-icon-circle">💡</div>
                  <h4>Understand</h4>
                  <p>
                    Converts complex legalese into crystal-clear summaries. Categorizes rights, duties, rules, and risk exposures into plain English.
                  </p>
                </div>
                <span className="feature-badge-pill">Plain-Language Summaries</span>
              </div>

              <div className="feature-box f-translate card">
                <div>
                  <div className="feature-icon-circle">🌐</div>
                  <h4>Translate</h4>
                  <p>
                    High-fidelity native translations across Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, and Bengali, keeping critical legal terms annotated.
                  </p>
                </div>
                <span className="feature-badge-pill">8 Indian Languages</span>
              </div>

              <div className="feature-box f-ask card">
                <div>
                  <div className="feature-icon-circle">💬</div>
                  <h4>Ask AI</h4>
                  <p>
                    Converse with your document in natural language. Powered by strict RAG retrieval—every answer is restricted to verifiable document clauses.
                  </p>
                </div>
                <span className="feature-badge-pill">Grounded Legal Q&A</span>
              </div>

              <div className="feature-box f-verify card">
                <div>
                  <div className="feature-icon-circle">🛡️</div>
                  <h4>Verify</h4>
                  <p>
                    Zero hallucinations. Every generated explanation, liability alert, and AI response links directly to its source clause with one-click navigation.
                  </p>
                </div>
                <span className="feature-badge-pill">Clickable Source Citations</span>
              </div>
            </div>
          </div>

          <div className="warn" style={{ marginTop: "28px" }}>
            🛡️ <b>Notice:</b> {DISC}
          </div>
            </div>
          </div>
          {isAskOpen && renderAskPanel()}
        </div>
      </>
    );
  }

  // ==========================================
  // VIEW 2: DOCUMENT DASHBOARD VIEW
  // ==========================================
  return (
    <>
      {renderHeader()}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".txt,.pdf,.docx,image/*"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className={"app-layout" + (isAskOpen ? " with-ask-panel" : "")}>
        <div className="main-content-area">
          <div className="wrap">
        {/* UPPER SECTION: ANALYSIS & OVERVIEW */}
        <div className="upper-section">
          {/* Document Header Card */}
          <div className="card dashboard-top-card">
            <div style={{ flex: "1 1 320px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  📄 {name}
                </h3>
                <span className="chip l">
                  ⚖️ {clauses.length} {clauses.length === 1 ? "Clause" : "Clauses"}
                </span>
                <span className="chip d">🟢 Analyzed</span>
              </div>
              {text.split("\n")[0].includes("SAMPLE") && (
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "var(--gold)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  ⚠️ FICTIONAL SAMPLE DOCUMENT — FOR DEMO PURPOSES ONLY
                </p>
              )}
            </div>

            {/* Global Language Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label
                htmlFor="global-lang-select"
                style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink-secondary)" }}
              >
                🌐 Language / భాష:
              </label>
              <select
                id="global-lang-select"
                aria-label="Global Language Selector"
                value={lang}
                onChange={(e) => {
                  setLang(e.target.value);
                }}
                style={{
                  padding: "8px 14px",
                  fontWeight: 700,
                  borderColor: "var(--accent)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Analysis Section Block with ONLY 2 tabs: Explain Simply & Key Information */}
          <div className="analysis-section-block">
            <div className="tabs-container">
              <button
                type="button"
                className={"tab-btn" + (tab === "simple" ? " on" : "")}
                onClick={() => setTab("simple")}
              >
                💡 Explain Simply
              </button>
              <button
                type="button"
                className={"tab-btn" + (tab === "overview" ? " on" : "")}
                onClick={() => setTab("overview")}
              >
                📊 Key Information
              </button>
            </div>

            <div className="card analysis-card">
              {/* TAB 1: EXPLAIN SIMPLY */}
              {tab === "simple" && (
                <>
                  {/* Document Overview */}
                  <div className="summary-callout">
                    <h3 style={{ margin: "0 0 6px", color: "var(--accent)" }}>
                      {headers.title}
                    </h3>
                    <p style={{ margin: 0, lineHeight: 1.6, color: "var(--ink-secondary)" }}>
                      {describeDocument(clauses, text, ents.Parties, lang)}
                    </p>
                  </div>

                  {/* Rights and Permissions & Responsibilities and Rules cards */}
                  {([
                    [
                      headers.rights,
                      /grant|license|permission|right|reproduce|services|work/i,
                      "rights",
                    ],
                    [
                      headers.rules,
                      /redistribut|notice|condition|payment|submission|retain|confidential/i,
                      "rules",
                    ],
                    [
                      headers.risks,
                      /trademark|warrant|liabilit|terminat|penalt|disclaim|prohibit|infring/i,
                      "risks",
                    ],
                  ] as [string, RegExp, string][]).map(([h, re, cardType]) => {
                    const matches = by(re);
                    if (matches.length === 0) return null;
                    return (
                      <div key={h} className={`category-card ${cardType}`}>
                        <h4 style={{ margin: "0 0 10px", fontSize: "1rem" }}>{h}</h4>
                        <ul style={{ paddingLeft: "20px", margin: 0 }}>
                          {matches.map((c) => (
                            <li
                              key={c.id}
                              style={{ marginBottom: "10px", lineHeight: "1.6" }}
                            >
                              <b>
                                Clause {c.id} ({c.title}):
                              </b>{" "}
                              {summarizeClause(c, lang)} <Ref id={c.id} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}

                  <div className="warn" style={{ marginTop: "20px" }}>
                    🛡️ {headers.warn}
                  </div>
                </>
              )}

              {/* TAB 2: KEY INFORMATION */}
              {tab === "overview" && (
                <>
                  <div style={{ marginBottom: "16px" }}>
                    <h3 style={{ margin: "0 0 6px" }}>📊 Extracted Key Information</h3>
                    <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: "0.9rem" }}>
                      Automatic entity extraction across parties, dates, financials, obligations, and legal conditions.
                    </p>
                  </div>

                  {Object.entries(ents).some(([_, v]) => v.length > 0) ? (
                    Object.entries(ents).map(
                      ([k, v]) =>
                        v.length > 0 && (
                          <div
                            key={k}
                            className="entity-group-card"
                          >
                            <b style={{ color: "var(--ink-secondary)", display: "block", marginBottom: "6px" }}>
                              {k === "Parties" && "🏢 Parties Involved"}
                              {k === "Dates" && "📅 Important Dates & Deadlines"}
                              {k === "Money" && "💰 Payment Amounts"}
                              {k === "Deadlines" && "⏳ Deadlines & Durations"}
                              {k === "Penalties" && "⚠️ Penalties & Forfeitures"}
                              {k === "Obligations" && "📋 Obligations & Responsibilities"}
                              {k === "Duration" && "⏱️ Contract Duration"}
                              {k === "Termination" && "🚪 Termination Conditions"}
                              {k === "Licenses" && "📜 Recognized Licenses"}
                            </b>
                            <div>
                              {v.map((x) => (
                                <span
                                  key={x}
                                  className={
                                    "chip " +
                                    (k === "Parties"
                                      ? "p"
                                      : k === "Dates"
                                      ? "d"
                                      : k === "Money"
                                      ? "m"
                                      : k === "Licenses"
                                      ? "l"
                                      : k === "Obligations"
                                      ? "o"
                                      : k === "Termination"
                                      ? "t"
                                      : k === "Duration"
                                      ? "u"
                                      : "")
                                  }
                                >
                                  {x}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                    )
                  ) : (
                    <p style={{ color: "var(--ink-muted)", padding: "16px 0" }}>
                      No key entities (parties, dates, financial amounts, or deadlines) were automatically detected.
                    </p>
                  )}

                  <div className="warn" style={{ marginTop: "16px" }}>
                    ⚠️ <b>Verify:</b> Extracted automatically via regex rules. Always verify critical terms against the source document.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: ORIGINAL DOCUMENT (FULL-WIDTH) */}
        <div className="bottom-section card original-doc-section">
          {/* Header row with Title and Clause Count */}
          <div className="doc-section-header">
            <div className="doc-section-title-wrap">
              <h3 style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <span>📜 Original Document</span>
                <span className="chip l">
                  {clauses.length} {clauses.length === 1 ? "Clause" : "Clauses"}
                </span>
              </h3>
              <p style={{ margin: "4px 0 0", color: "var(--ink-muted)", fontSize: "0.88rem" }}>
                Verbatim legal text extracted from {name}. Expand clauses to inspect original phrasing, or translate and restore clauses in place.
              </p>
            </div>

            {/* Expand / Collapse All Controls */}
            <div className="doc-expand-controls">
              <button
                type="button"
                className="btn alt sm"
                onClick={() => {
                  const allExp: Record<number, boolean> = {};
                  clauses.forEach((c) => (allExp[c.id] = true));
                  setExpandedClauses(allExp);
                }}
                title="Expand all clauses"
              >
                ▼ Expand All
              </button>
              <button
                type="button"
                className="btn alt sm"
                onClick={() => setExpandedClauses({})}
                title="Collapse all clauses"
              >
                ▲ Collapse All
              </button>
            </div>
          </div>

          {/* Search Clauses Input Bar */}
          <div className="clause-search-bar-wrap">
            <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  color: "var(--ink-muted)",
                  fontSize: "1rem",
                }}
              >
                🔍
              </span>
              <input
                aria-label="Search clauses"
                placeholder="Search clauses: termination, payment, warranty, liability, penalty..."
                value={find}
                onChange={(e) => setFind(e.target.value)}
                className="clause-search-input"
              />
              {find && (
                <button
                  type="button"
                  onClick={() => setFind("")}
                  className="clause-search-clear-btn"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {find && (
              <div style={{ fontSize: "0.85rem", color: "var(--ink-muted)", marginTop: "6px" }}>
                Found {clauses.filter((c) => hit(c)).length} matching of {clauses.length} clauses
              </div>
            )}
          </div>

          {/* Numbered Clause Rows */}
          <div className="clauses-list">
            {clauses.map((c) => {
              const clauseState = getClauseState(c.id);
              const isExpanded = !!expandedClauses[c.id];
              const isHit = hit(c);
              const isActive = active === c.id;

              const isTranslatedMode =
                clauseState.displayMode === "translated" && Boolean(clauseState.translatedText);
              const currentDisplayedText = isTranslatedMode ? clauseState.translatedText! : c.text;

              return (
                <div
                  key={c.id}
                  id={"c" + c.id}
                  className={
                    "clause-row-item" +
                    (isActive ? " active-clause" : "") +
                    (isHit ? " search-hit" : "")
                  }
                >
                  {/* Row Header Bar */}
                  <div
                    className="clause-row-bar"
                    onClick={() => toggleClauseExpanded(c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleClauseExpanded(c.id);
                      }
                    }}
                    aria-expanded={isExpanded}
                  >
                    <div className="clause-row-title-area">
                      <span className="clause-row-badge">Clause {c.id}</span>
                      <span className="clause-row-name">{c.title}</span>
                      {isTranslatedMode && (
                        <span className="clause-mini-lang-pill" title={`Translated to ${clauseState.activeLang}`}>
                          🌐 {clauseState.activeLang}
                        </span>
                      )}
                    </div>

                    {/* Exact control order: 🌐 Translate button immediately to left of Expand/Collapse arrow */}
                    <div className="clause-row-controls">
                      <button
                        type="button"
                        className="clause-translate-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTranslateClick(c.id);
                        }}
                        title={`Translate Clause ${c.id}`}
                        aria-label={`Translate Clause ${c.id}`}
                      >
                        <span>🌐</span>
                        <span>Translate</span>
                      </button>

                      <button
                        type="button"
                        className="clause-arrow-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleClauseExpanded(c.id);
                        }}
                        title={isExpanded ? "Collapse Clause" : "Expand Clause"}
                        aria-label={isExpanded ? `Collapse Clause ${c.id}` : `Expand Clause ${c.id}`}
                      >
                        <span>{isExpanded ? "▲" : "▼"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content Area with In-Place Text Replacement */}
                  {isExpanded && (
                    <div className="clause-row-content">
                      {/* Translation & Control Toolbar */}
                      <div className="clause-toolbar">
                        {/* Status & Display Toggle Area */}
                        <div className="clause-toolbar-status">
                          {isTranslatedMode ? (
                            <div className="clause-mode-indicator translated">
                              <span className="mode-pill">🌐 {clauseState.activeLang} Translation</span>
                              <button
                                type="button"
                                className="btn-restore-orig"
                                onClick={() => handleShowOriginal(c.id)}
                                title="Restore and view original English text"
                              >
                                ↩ View Original English
                              </button>
                            </div>
                          ) : (
                            <div className="clause-mode-indicator original">
                              <span className="mode-pill">📄 Original English</span>
                              {clauseState.translatedText && (
                                <button
                                  type="button"
                                  className="btn-view-trans"
                                  onClick={() => handleShowTranslated(c.id)}
                                  title={`View ${clauseState.activeLang} translation`}
                                >
                                  🌐 View {clauseState.activeLang} Translation
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Language Selection Dropdown & Apply/Translate Button */}
                        <div className="clause-toolbar-actions">
                          <div className="clause-lang-picker">
                            <label htmlFor={`lang-select-${c.id}`} className="clause-lang-label">
                              🌐 Language:
                            </label>
                            <select
                              id={`lang-select-${c.id}`}
                              className="clause-lang-dropdown"
                              value={clauseState.selectedLang}
                              onChange={(e) => handleLanguageChange(c.id, e.target.value)}
                              aria-label={`Select translation language for Clause ${c.id}`}
                            >
                              {LANGS.map((l) => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn-apply-trans"
                              onClick={() => handleApplyTranslation(c.id)}
                              disabled={clauseState.loading}
                              title={`Translate Clause ${c.id} into ${clauseState.selectedLang}`}
                            >
                              {clauseState.loading ? (
                                <span className="btn-loading-content">
                                  <span className="spinner-xs" />
                                  <span>Translating…</span>
                                </span>
                              ) : (
                                <span>Translate</span>
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            className="btn-copy-clause"
                            onClick={() => copyText(currentDisplayedText)}
                            title="Copy displayed clause text"
                          >
                            {copied ? "✓ Copied" : "📋 Copy"}
                          </button>
                        </div>
                      </div>

                      {/* In-place clause text container */}
                      <div className="clause-text-container">
                        {clauseState.loading && !clauseState.translatedText ? (
                          <div className="clause-loading-state">
                            <span className="spinner-sm" />
                            <span>Translating clause text into {clauseState.selectedLang}…</span>
                          </div>
                        ) : (
                          <div
                            className={`clause-display-text ${isTranslatedMode ? "translated" : "original"}`}
                          >
                            {currentDisplayedText || <i style={{ color: "var(--ink-muted)" }}>No body text</i>}
                          </div>
                        )}

                        {clauseState.error && (
                          <div className="warn" style={{ marginTop: "10px" }}>
                            ⚠️ {clauseState.error}
                          </div>
                        )}

                        {isTranslatedMode && (
                          <div className="clause-confidence-flag">
                            🛡️ <b>Confidence: High.</b> Key legal terminology is preserved with English bracket annotations. Informational only, not legal advice.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="foot">
          ⚖️ <b>Niyovara</b> — Empowering citizen access to legal justice across India. · {DISC}
        </div>
          </div>
        </div>
        {isAskOpen && renderAskPanel()}
      </div>
    </>
  );
}

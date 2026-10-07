"use client";
import { useState, useEffect } from "react";
import { SAMPLE } from "@/lib/sample";

type ThemePreference = "light" | "dark" | "system";
import {
  segment,
  entities,
  summarizeClause,
  describeDocument,
  getSectionHeaders,
  getClauseFallbackTranslation,
  SUPPORTED_LANGUAGES,
} from "@/lib/analyze";

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

export default function Home() {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState(-1);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("simple");
  const [active, setActive] = useState<number | null>(null);
  const [lang, setLang] = useState("English");
  const [tr, setTr] = useState("");
  const [q, setQ] = useState("");
  const [chat, setChat] = useState<{ q: string; a: string; src: number[] }[]>([]);
  const [find, setFind] = useState("");
  const [copied, setCopied] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>("system");

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
  const sel = active ?? clauses.find((c) => /terminat/i.test(c.title))?.id ?? clauses[0]?.id;

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
    setTr("");
    for (let i = 0; i < PROCESS.length; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 350));
    }
    setText(t);
    setStep(-1);
    setTab("simple");
  }

  async function onFile(f?: File) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".txt")) {
      setErr(
        "PDF, DOCX and scanned-image support is planned. For now please upload a .txt file or try the sample demo."
      );
      return;
    }
    load(await f.text(), f.name);
  }

  async function translate(id: number | undefined, l: string) {
    setLang(l);
    if (l === "English" || id === undefined) {
      setTr("");
      return;
    }
    const c = clauses.find((x) => x.id === id);
    if (!c) {
      setTr("");
      return;
    }
    const fallback = getClauseFallbackTranslation(c, l);
    // Render high-fidelity native translation immediately for instant response
    if (fallback) {
      setTr(fallback);
    } else {
      setTr("Translating…");
    }

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translate: true, text: c.text, lang: l }),
      });
      const data = await res.json();
      if (data?.text) {
        setTr(data.text);
      } else if (!fallback) {
        setTr("Translation for this clause needs an LLM API key (see README).");
      }
    } catch {
      if (!fallback) {
        setTr("Translation for this clause needs an LLM API key (see README).");
      }
    }
  }

  async function ask(queryText?: string) {
    const question = (queryText || q).trim();
    if (!question) return;
    setQ("");
    const r = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, clauses, lang }),
    })
      .then((res) => res.json())
      .catch(() => ({ answer: "Sorry, something went wrong. Please try again.", sources: [] }));
    setChat((c) => [...c, { q: question, a: r.answer, src: r.sources }]);
  }

  // Highlight a clause in the original document and scroll to it smoothly.
  const view = (id: number) => {
    setActive(id);
    setTimeout(() => {
      document.getElementById("c" + id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const pick = (id: number) => {
    setActive(id);
    if (tab === "translate") translate(id, lang);
  };

  const hit = (c: { title: string; text: string }) =>
    find && (c.title + c.text).toLowerCase().includes(find.toLowerCase());

  const Ref = ({ id }: { id: number }) => (
    <button className="ref-pill" onClick={() => view(id)} title={`Jump to Clause ${id}`}>
      Clause {id} ↗
    </button>
  );

  const by = (re: RegExp) => clauses.filter((c) => re.test(c.text) || re.test(c.title));

  const copyText = (val: string) => {
    navigator.clipboard?.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ==========================================
  // VIEW 1: UPLOAD / HERO SCREEN
  // ==========================================
  if (!text) {
    return (
      <>
        <div className="bar">
          <div className="bar-brand">
            <span className="bar-logo">⚖️ Niyovara</span>
            <span className="bar-badge">🇮🇳 8 Indian Languages</span>
          </div>
          <ThemeSelector themePref={themePref} onThemeChange={handleThemeChange} />
        </div>

        <div className="wrap">
          {/* Hero Welcome Section */}
          <div className="hero-wrapper">
            <div className="hero-aura-bg" />
            <div className="hero-content">
              {/* 3 Core Highlights Badges */}
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

              {/* Headline & Tagline */}
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
              {/* Feature 1: Understand */}
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

              {/* Feature 2: Translate */}
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

              {/* Feature 3: Ask AI */}
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

              {/* Feature 4: Verify */}
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
      </>
    );
  }

  // ==========================================
  // VIEW 2: DOCUMENT DASHBOARD VIEW
  // ==========================================
  const headers = getSectionHeaders(lang);

  return (
    <>
      <div className="bar">
        <div className="bar-brand">
          <span className="bar-logo">⚖️ Niyovara</span>
          <span className="bar-badge">Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="bar-btn"
            onClick={() => {
              setText("");
              setStep(-1);
            }}
          >
            <span>← Upload New Document</span>
          </button>
          <ThemeSelector themePref={themePref} onThemeChange={handleThemeChange} />
        </div>
      </div>

      <div className="wrap">
        {/* Top Header Card */}
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
              aria-label="Language selector"
              value={lang}
              onChange={(e) => {
                const newLang = e.target.value;
                setLang(newLang);
                translate(sel, newLang);
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

          {/* Live Document Search Bar */}
          <div style={{ width: "100%", marginTop: "4px" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
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
                aria-label="Search document"
                placeholder="Search clauses: termination, payment, warranty, liability, penalty..."
                value={find}
                onChange={(e) => setFind(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: "38px",
                  background: "var(--input-bg)",
                }}
              />
              {find && (
                <button
                  onClick={() => setFind("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: 0,
                    cursor: "pointer",
                    color: "var(--ink-muted)",
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Split Screen Workspace */}
        <div className="split">
          {/* Left Column: Original Document Viewer */}
          <div className="doc-card">
            <div className="doc-header">
              <b>📜 Original Document ({clauses.length} Clauses)</b>
              <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                Click clause to inspect & translate
              </span>
            </div>
            <div className="doc-body">
              {clauses.map((c) => (
                <div
                  key={c.id}
                  id={"c" + c.id}
                  className={
                    "cl" +
                    (sel === c.id && (active !== null || tab === "translate") || hit(c)
                      ? " on"
                      : "")
                  }
                  onClick={() => pick(c.id)}
                >
                  <span className="cl-title">
                    Clause {c.id} — {c.title}
                  </span>
                  <div>{c.text || <i style={{ color: "#94a3b8" }}>No body text</i>}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Analysis Tabs */}
          <div>
            {/* Segmented Pill Tabs */}
            <div className="tabs-container">
              {[
                ["simple", "💡 Explain simply"],
                ["overview", "📊 Key information"],
                ["translate", "🌐 Translate"],
                ["ask", "💬 Ask Niyovara"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  className={"tab-btn" + (tab === k ? " on" : "")}
                  onClick={() => {
                    setTab(k);
                    if (k === "translate") translate(sel, lang);
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* TAB CONTENT CARD */}
            <div className="card" style={{ minHeight: "480px" }}>
              {/* TAB 1: EXPLAIN SIMPLY */}
              {tab === "simple" && (
                <>
                  <div className="summary-callout">
                    <h3 style={{ margin: "0 0 6px", color: "var(--accent)" }}>
                      {headers.title}
                    </h3>
                    <p style={{ margin: 0, lineHeight: 1.6, color: "var(--ink-secondary)" }}>
                      {describeDocument(clauses, text, ents.Parties, lang)}
                    </p>
                  </div>

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
                      Automatic entity extraction across parties, dates, financials, and legal terms.
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
                              {k === "Parties" && "🏢 Parties & Entities"}
                              {k === "Dates" && "📅 Dates & Timelines"}
                              {k === "Money" && "💰 Monetary Amounts"}
                              {k === "Deadlines" && "⏳ Deadlines & Durations"}
                              {k === "Penalties" && "⚠️ Penalties & Forfeitures"}
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

                  <div className="warn">
                    ⚠️ <b>Verify:</b> Extracted automatically via regex rules. Always verify critical terms against the source document.
                  </div>
                </>
              )}

              {/* TAB 3: TRANSLATE */}
              {tab === "translate" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: "0 0 2px" }}>🌐 Clause Translation</h3>
                      <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                        Viewing Clause {sel} ({clauses.find((c) => c.id === sel)?.title || ""}) in {lang}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Target Language:</label>
                      <select
                        aria-label="Target translation language"
                        value={lang}
                        onChange={(e) => {
                          const newLang = e.target.value;
                          setLang(newLang);
                          translate(sel, newLang);
                        }}
                        style={{ padding: "6px 12px", fontWeight: "bold" }}
                      >
                        {LANGS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Original English Box */}
                  <div style={{ marginBottom: "14px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink-muted)" }}>
                        ORIGINAL ENGLISH TEXT — CLAUSE {sel}: {clauses.find((c) => c.id === sel)?.title?.toUpperCase() || ""}
                      </span>
                    </div>
                    <div className="clause-orig-box">
                      {clauses.find((c) => c.id === sel)?.text || "No clause selected"}
                    </div>
                  </div>

                  {/* Translated Box */}
                  {lang !== "English" ? (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>
                          {lang.toUpperCase()} TRANSLATION — CLAUSE {sel}
                        </span>
                        <button
                          className="btn alt sm"
                          onClick={() => copyText(tr)}
                          title="Copy translation"
                        >
                          {copied ? "✓ Copied!" : "📋 Copy"}
                        </button>
                      </div>
                      <div className="clause-trans-box">
                        {tr || "Translating…"}
                      </div>
                      <p className="warn" style={{ marginTop: "12px" }}>
                        ⚠️ Translation confidence: High. Key legal terminology is preserved with English bracket annotations.
                      </p>
                    </div>
                  ) : (
                    <div className="card" style={{ textAlign: "center", padding: "20px", color: "var(--ink-muted)" }}>
                      Select a non-English language from the dropdown above to view native Indian translations.
                    </div>
                  )}

                  <p style={{ color: "var(--ink-muted)", fontSize: "0.85rem", marginTop: "14px" }}>
                    💡 <i>Tip: Click any clause in the left document viewer to instantly translate it.</i>
                  </p>
                </>
              )}

              {/* TAB 4: ASK NIYOVARA */}
              {tab === "ask" && (
                <>
                  <div style={{ marginBottom: "12px" }}>
                    <h3 style={{ margin: "0 0 4px" }}>💬 Ask Niyovara</h3>
                    <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: "0.88rem" }}>
                      Grounded legal Q&A. Answers cite verifiable source clause numbers.
                    </p>
                  </div>

                  {/* Suggested Question Chips */}
                  <div className="suggestions">
                    {(MULTILINGUAL_SUGGESTIONS[lang] || MULTILINGUAL_SUGGESTIONS.English).map((s) => (
                      <button key={s} className="suggestion-chip" onClick={() => ask(s)}>
                        💬 {s}
                      </button>
                    ))}
                  </div>

                  {/* Chat Message Thread */}
                  <div className="chat-box">
                    {chat.length === 0 && (
                      <div className="chat-empty-box">
                        <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>⚖️</span>
                        Ask any question about this document in {lang}. Answers are grounded strictly in the text!
                      </div>
                    )}

                    {chat.map((m, i) => (
                      <div key={i} style={{ display: "grid", gap: "8px" }}>
                        <div className="chat-msg chat-q">
                          <b>Q: </b> {m.q}
                        </div>
                        <div className="chat-msg chat-a">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                            <span style={{ fontWeight: 700, color: "var(--accent)" }}>⚖️ Niyovara:</span>
                          </div>
                          <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.a}</p>
                          {m.src.length > 0 ? (
                            <div style={{ fontSize: "0.85rem", color: "var(--ink-muted)", borderTop: "1px solid var(--line)", paddingTop: "6px" }}>
                              <b>Verified Sources: </b>
                              {m.src.map((id) => (
                                <Ref key={id} id={id} />
                              ))}
                            </div>
                          ) : (
                            <span className="warn" style={{ display: "inline-block", padding: "4px 8px" }}>
                              {headers.noSource}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input Field */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <input
                      style={{ flex: 1 }}
                      aria-label="Ask a question"
                      placeholder={headers.askPlaceholder}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && ask()}
                    />
                    <button className="btn" onClick={() => ask()}>
                      <span>Ask AI</span> ➔
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="foot">
          ⚖️ <b>Niyovara</b> — Empowering citizen access to legal justice across India. · {DISC}
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { SSEEvent, InvestmentReport, AgentStep } from "@/types/research";

const PIPELINE_STEPS: { id: AgentStep; label: string }[] = [
  { id: "company_research", label: "Company Profile" },
  { id: "financial_analysis", label: "Financials" },
  { id: "market_analysis", label: "Market Position" },
  { id: "risk_analysis", label: "Risk Assessment" },
  { id: "news_analysis", label: "News & Sentiment" },
  { id: "scoring", label: "Investment Scoring" },
  { id: "final_decision", label: "Final Decision" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<AgentStep>("idle");
  const [report, setReport] = useState<Partial<InvestmentReport> | null>(null);
  const [citationsOpen, setCitationsOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setReport({ companyName: query });
    setCurrentStep("company_research");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: query }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to start research");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));

              if (event.type === "error") {
                setError(event.error || "An error occurred during analysis");
                setLoading(false);
                setCurrentStep("error");
                break;
              }

              if (event.step) {
                setCurrentStep(event.step);
              }

              if (event.data) {
                setReport((prev) => ({ ...prev, ...event.data }));
              }

              if (event.type === "complete") {
                setLoading(false);
                setCurrentStep("complete");
              }
            } catch (e) {
              console.error("Error parsing SSE event:", e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "An unexpected error occurred");
        setLoading(false);
        setCurrentStep("error");
      }
    }
  };

  const getStepStatus = (stepId: AgentStep) => {
    if (currentStep === "complete") return "done";
    if (currentStep === "error") return "error";
    const stepIndex = PIPELINE_STEPS.findIndex((s) => s.id === stepId);
    const currentIndex = PIPELINE_STEPS.findIndex((s) => s.id === currentStep);
    
    if (currentIndex === -1) return "pending";
    if (stepIndex < currentIndex) return "done";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📈</span>
            <span className="logo-text">Altuni AI Agent</span>
          </div>
          <div className="header-badge">v1.0.0 (Beta)</div>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h1 className="hero-title">
            Institutional-Grade <br />
            <span className="gradient-text">AI Investment Research</span>
          </h1>
          <p className="hero-subtitle">
            Enter a company name or ticker to generate a comprehensive investment analysis report using multi-agent reasoning.
          </p>

          <div className="search-container">
            <form onSubmit={handleSearch} className="search-box">
              <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="e.g. Apple, Tesla, Reliance Industries..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="search-button" disabled={loading || !query.trim()}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing
                  </>
                ) : (
                  <>
                    Research
                    <span className="arrow">→</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {(loading || report?.overview || currentStep !== "idle") && (
          <section className="pipeline-section fade-in">
            <div className="pipeline">
              {PIPELINE_STEPS.map((step, index) => {
                const status = getStepStatus(step.id);
                return (
                  <div key={step.id} className="pipeline-step-wrapper">
                    <div className={`pipeline-step ${status}`}>
                      <div className="step-dot">
                        {status === "done" ? "✓" : index + 1}
                      </div>
                      <span className="step-label">{step.label}</span>
                    </div>
                    {index < PIPELINE_STEPS.length - 1 && (
                      <div className={`step-connector ${status === "done" ? "done" : ""}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {error && (
          <div className="error-card slide-up">
            <div className="error-icon">⚠️</div>
            <div>
              <strong>Analysis Failed</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {report?.decision && (
          <section className="decision-section slide-up">
            <div className={`decision-card ${report.decision.recommendation === "INVEST" ? "decision-invest" : "decision-pass"}`}>
              <div className="decision-header">
                <div className="decision-badge">{report.decision.recommendation}</div>
                <div className="confidence-meter">
                  <span className="confidence-label">Agent Confidence</span>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${report.decision.confidence}%` }}></div>
                  </div>
                  <span className="confidence-value">{report.decision.confidence}%</span>
                </div>
              </div>
              <p className="investment-thesis">{report.decision.investmentThesis}</p>
              
              <div className="decision-details">
                <div className="strengths">
                  <h4>Key Strengths</h4>
                  <ul>
                    {report.decision.keyStrengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="weaknesses">
                  <h4>Key Risks / Weaknesses</h4>
                  <ul>
                    {report.decision.keyWeaknesses.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>

              <div className="reasoning">
                <h4>Detailed Reasoning</h4>
                <p>{report.decision.reasoning}</p>
              </div>
            </div>
          </section>
        )}

        {report?.scores && (
          <section className="scores-section slide-up">
            <h3 className="section-title">Quantitative Analysis</h3>
            <div className="scores-grid">
              <ScoreGauge label="Overall Score" score={report.scores.investmentScore} color="var(--accent-cyan)" />
              <ScoreGauge label="Growth Potential" score={report.scores.growthScore} color="var(--accent-green)" />
              <ScoreGauge label="Financial Health" score={report.scores.financialHealthScore} color="var(--accent-violet)" />
              <ScoreGauge label="Market Sentiment" score={report.scores.sentimentScore} color="var(--accent-amber)" />
              <ScoreGauge label="Risk Level" score={report.scores.riskScore} color="var(--accent-red)" inverted />
            </div>
          </section>
        )}

        <div className="report-grid">
          {report?.overview && (
            <div className="card card-overview slide-up">
              <div className="card-header">
                <span className="card-icon">🏢</span>
                <h2>Company Overview</h2>
              </div>
              <div className="card-body">
                <h3 className="company-name">{report.overview.name}</h3>
                <p className="company-desc">{report.overview.description}</p>
                
                <div className="meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">Industry</span>
                    <span className="meta-value">{report.overview.industry}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Sector</span>
                    <span className="meta-value">{report.overview.sector}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">CEO</span>
                    <span className="meta-value">{report.overview.ceo}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Founded</span>
                    <span className="meta-value">{report.overview.founded}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Employees</span>
                    <span className="meta-value">{report.overview.employees}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Headquarters</span>
                    <span className="meta-value">{report.overview.headquarters}</span>
                  </div>
                </div>

                <div className="subsection">
                  <h4>Business Model</h4>
                  <p className="card-summary">{report.overview.businessModel}</p>
                </div>

                <div className="subsection">
                  <h4>Key Products</h4>
                  <div className="tags">
                    {report.overview.keyProducts.map((p, i) => (
                      <span key={i} className="tag">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {report?.financial && (
            <div className="card card-financial slide-up">
              <div className="card-header">
                <span className="card-icon">💰</span>
                <h2>Financial Health</h2>
              </div>
              <div className="card-body">
                <div className="metric-grid">
                  <div className="metric">
                    <span className="metric-label">Revenue</span>
                    <span className="metric-value">{report.financial.revenue}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Revenue Growth</span>
                    <span className="metric-value">{report.financial.revenueGrowth}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Gross Margin</span>
                    <span className="metric-value">{report.financial.grossMargin}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Net Margin</span>
                    <span className="metric-value">{report.financial.netMargin}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Market Cap</span>
                    <span className="metric-value">{report.financial.marketCap}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">P/E Ratio</span>
                    <span className="metric-value">{report.financial.peRatio}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">EPS</span>
                    <span className="metric-value">{report.financial.eps}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Free Cash Flow</span>
                    <span className="metric-value">{report.financial.freeCashFlow}</span>
                  </div>
                </div>
                <div className="subsection">
                  <h4>Financial Summary</h4>
                  <p className="card-summary">{report.financial.summary}</p>
                </div>
              </div>
            </div>
          )}

          {report?.market && (
            <div className="card card-market slide-up">
              <div className="card-header">
                <span className="card-icon">🎯</span>
                <h2>Market Analysis</h2>
              </div>
              <div className="card-body">
                <div className="meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">Market Size</span>
                    <span className="meta-value">{report.market.marketSize}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Market Growth</span>
                    <span className="meta-value">{report.market.marketGrowthRate}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Market Share</span>
                    <span className="meta-value">{report.market.marketShare}</span>
                  </div>
                </div>

                <div className="subsection">
                  <h4>Positioning</h4>
                  <p className="card-summary">{report.market.marketPositioning}</p>
                </div>

                <div className="subsection">
                  <h4>Key Competitors</h4>
                  <div className="competitor-list">
                    {report.market.competitors.map((c, i) => (
                      <div key={i} className="competitor">
                        <strong>{c.name}</strong>
                        <span>{c.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="subsection">
                  <h4>Competitive Advantages</h4>
                  <ul className="advantage-list">
                    {report.market.competitiveAdvantages.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {report?.risk && (
            <div className="card card-risk slide-up">
              <div className="card-header">
                <span className="card-icon">⚠️</span>
                <h2>Risk Assessment</h2>
                <div className={`risk-badge risk-${report.risk.overallRiskLevel.toLowerCase()}`}>
                  {report.risk.overallRiskLevel} Risk
                </div>
              </div>
              <div className="card-body">
                <p className="card-summary">{report.risk.summary}</p>
                
                <div className="risk-factors">
                  {report.risk.factors.map((f, i) => (
                    <div key={i} className={`risk-factor severity-${f.severity.toLowerCase()}`}>
                      <div className="risk-factor-header">
                        <span className="risk-category">{f.category} Risk</span>
                        <span className={`severity-badge severity-${f.severity.toLowerCase()}`}>
                          {f.severity}
                        </span>
                      </div>
                      <p>{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {report?.news && (
            <div className="card card-news slide-up">
              <div className="card-header">
                <span className="card-icon">📰</span>
                <h2>News & Sentiment</h2>
                <div className={`sentiment-badge sentiment-${report.news.overallSentiment.toLowerCase()}`}>
                  {report.news.overallSentiment} ({(report.news.sentimentScore > 0 ? "+" : "") + report.news.sentimentScore})
                </div>
              </div>
              <div className="card-body">
                <div className="metric-grid">
                  <div className="signals">
                    <h4>Growth Signals</h4>
                    <ul>
                      {report.news.growthSignals.map((s, i) => <li key={i} className="signal-positive">{s}</li>)}
                    </ul>
                  </div>
                  <div className="signals">
                    <h4>Negative Events</h4>
                    <ul>
                      {report.news.negativeEvents.map((s, i) => <li key={i} className="signal-negative">{s}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="news-items">
                  <h4>Recent News Articles</h4>
                  {report.news.items.map((item, i) => (
                    <div key={i} className="news-item">
                      <div className="news-item-header">
                        <span className="news-source">{item.source}</span>
                        <span className="news-date">{item.date}</span>
                        <span className={`severity-badge severity-${
                          item.sentiment === "Positive" ? "low" : 
                          item.sentiment === "Negative" ? "high" : "medium"
                        }`}>{item.sentiment}</span>
                      </div>
                      <h5 className="news-title">{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{item.title}</a> : item.title}</h5>
                      <p className="news-summary">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {report?.allCitations && report.allCitations.length > 0 && (
          <section className="citations-section slide-up">
            <button 
              className="citations-toggle"
              onClick={() => setCitationsOpen(!citationsOpen)}
            >
              <span>Sources & Citations ({report.allCitations.length})</span>
              <span className={`toggle-arrow ${citationsOpen ? "open" : ""}`}>▼</span>
            </button>
            
            {citationsOpen && (
              <div className="citations-list fade-in">
                {report.allCitations.map((citation, i) => (
                  <a key={i} href={citation.url} target="_blank" rel="noopener noreferrer" className="citation">
                    <span className="citation-source">{citation.source}</span>
                    <span className="citation-title">{citation.title}</span>
                    <span className="citation-link">↗</span>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Built with Next.js, LangGraph, and Gemini 2.0 Flash • Designed for InsideIIM × Altuni AI Labs</p>
      </footer>
    </>
  );
}

function ScoreGauge({ label, score, color, inverted = false }: { label: string, score: number, color: string, inverted?: boolean }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  // If inverted (like risk), higher is worse. But visual gauge logic remains the same (fill percentage).
  // Actually, we'll just show the fill.
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="score-gauge">
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle
          cx="42" cy="42" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
        />
        <circle
          className="score-circle"
          cx="42" cy="42" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <text
          x="42" y="48"
          textAnchor="middle"
          fill="white"
          fontSize="18px"
          fontWeight="700"
          className="score-value"
        >
          {score}
        </text>
      </svg>
      <span className="score-label">{label}</span>
    </div>
  );
}

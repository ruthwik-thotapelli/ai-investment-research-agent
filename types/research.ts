// ─── Shared TypeScript Types ─────────────────────────────────────────────────

export interface Citation {
  title: string;
  url: string;
  source: string;
}

export interface CompanyOverview {
  name: string;
  description: string;
  industry: string;
  sector: string;
  headquarters: string;
  founded: string;
  employees: string;
  ceo: string;
  website: string;
  businessModel: string;
  keyProducts: string[];
  citations: Citation[];
}

export interface FinancialData {
  revenue: string;
  revenueGrowth: string;
  grossMargin: string;
  netMargin: string;
  operatingCashFlow: string;
  debtToEquity: string;
  peRatio: string;
  marketCap: string;
  eps: string;
  freeCashFlow: string;
  summary: string;
  citations: Citation[];
}

export interface Competitor {
  name: string;
  description: string;
}

export interface MarketData {
  marketSize: string;
  marketGrowthRate: string;
  targetAddressableMarket: string;
  competitors: Competitor[];
  competitiveAdvantages: string[];
  marketPositioning: string;
  marketShare: string;
  citations: Citation[];
}

export interface RiskFactor {
  category: 'Regulatory' | 'Competition' | 'Financial' | 'Operational' | 'Macro';
  description: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface RiskData {
  overallRiskLevel: 'Low' | 'Medium' | 'High';
  factors: RiskFactor[];
  summary: string;
  citations: Citation[];
}

export interface NewsItem {
  title: string;
  summary: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  date: string;
  source: string;
  url: string;
}

export interface NewsData {
  overallSentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
  sentimentScore: number; // -1 to 1
  items: NewsItem[];
  growthSignals: string[];
  negativeEvents: string[];
  citations: Citation[];
}

export interface InvestmentScores {
  investmentScore: number;    // 0-100
  riskScore: number;          // 0-100 (higher = riskier)
  growthScore: number;        // 0-100
  sentimentScore: number;     // 0-100
  financialHealthScore: number; // 0-100
}

export interface FinalDecision {
  recommendation: 'INVEST' | 'PASS';
  confidence: number;         // 0-100
  investmentThesis: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  reasoning: string;
}

// ─── Full Report ─────────────────────────────────────────────────────────────

export interface InvestmentReport {
  companyName: string;
  generatedAt: string;
  overview: CompanyOverview | null;
  financial: FinancialData | null;
  market: MarketData | null;
  risk: RiskData | null;
  news: NewsData | null;
  scores: InvestmentScores | null;
  decision: FinalDecision | null;
  allCitations: Citation[];
}

// ─── Agent State ─────────────────────────────────────────────────────────────

export interface AgentState {
  companyName: string;
  overview: CompanyOverview | null;
  financial: FinancialData | null;
  market: MarketData | null;
  risk: RiskData | null;
  news: NewsData | null;
  scores: InvestmentScores | null;
  decision: FinalDecision | null;
  currentStep: AgentStep;
  errors: string[];
  citations: Citation[];
}

export type AgentStep =
  | 'idle'
  | 'company_research'
  | 'financial_analysis'
  | 'market_analysis'
  | 'risk_analysis'
  | 'news_analysis'
  | 'scoring'
  | 'final_decision'
  | 'complete'
  | 'error';

// ─── SSE Event Types ─────────────────────────────────────────────────────────

export type SSEEventType =
  | 'progress'
  | 'overview'
  | 'financial'
  | 'market'
  | 'risk'
  | 'news'
  | 'scores'
  | 'decision'
  | 'complete'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  step?: AgentStep;
  message?: string;
  data?: Partial<InvestmentReport>;
  error?: string;
}

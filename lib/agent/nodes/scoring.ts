// ─── Scoring Node ─────────────────────────────────────────────────────────────

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentStateType } from '@/lib/agent/state';
import { InvestmentScores } from '@/types/research';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  temperature: 0.1,
});

export async function scoringNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { companyName, overview, financial, market, risk, news } = state;

  try {
    const contextSummary = `
COMPANY: ${companyName}
INDUSTRY: ${overview?.industry ?? 'N/A'}
BUSINESS MODEL: ${overview?.businessModel ?? 'N/A'}

FINANCIAL:
- Revenue: ${financial?.revenue ?? 'N/A'}
- Revenue Growth: ${financial?.revenueGrowth ?? 'N/A'}
- Net Margin: ${financial?.netMargin ?? 'N/A'}
- Gross Margin: ${financial?.grossMargin ?? 'N/A'}
- Free Cash Flow: ${financial?.freeCashFlow ?? 'N/A'}
- Debt/Equity: ${financial?.debtToEquity ?? 'N/A'}
- Financial Summary: ${financial?.summary ?? 'N/A'}

MARKET:
- Market Size: ${market?.marketSize ?? 'N/A'}
- Market Growth: ${market?.marketGrowthRate ?? 'N/A'}
- Market Share: ${market?.marketShare ?? 'N/A'}
- Competitive Advantages: ${market?.competitiveAdvantages?.join(', ') ?? 'N/A'}
- Positioning: ${market?.marketPositioning ?? 'N/A'}

RISK:
- Overall Risk Level: ${risk?.overallRiskLevel ?? 'N/A'}
- Risk Summary: ${risk?.summary ?? 'N/A'}
- Risk Factors: ${risk?.factors?.map((f) => `${f.category}: ${f.severity}`).join(', ') ?? 'N/A'}

NEWS & SENTIMENT:
- Overall Sentiment: ${news?.overallSentiment ?? 'N/A'}
- Sentiment Score: ${news?.sentimentScore ?? 'N/A'}
- Growth Signals: ${news?.growthSignals?.join(', ') ?? 'N/A'}
- Negative Events: ${news?.negativeEvents?.join(', ') ?? 'N/A'}
    `.trim();

    const prompt = `You are a seasoned investment analyst generating quantitative investment scores for "${companyName}".

ANALYSIS DATA:
${contextSummary}

Based on all the data, generate investment scores on a scale of 0-100 and respond with a valid JSON object ONLY:
{
  "investmentScore": 72,
  "riskScore": 35,
  "growthScore": 78,
  "sentimentScore": 65,
  "financialHealthScore": 80
}

SCORING GUIDELINES:
- investmentScore: Overall investment attractiveness (higher = more attractive)
- riskScore: How risky the investment is (higher = riskier)
- growthScore: Growth potential (higher = more growth potential)
- sentimentScore: Market/news sentiment (higher = more positive)
- financialHealthScore: Financial stability (higher = healthier)

Be realistic and data-driven. Use the full 0-100 range. Respond ONLY with JSON.`;

    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse scores JSON');

    const scores: InvestmentScores = JSON.parse(jsonMatch[0]);

    return {
      scores,
      currentStep: 'final_decision',
    };
  } catch (error) {
    const errMsg = `Scoring failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      errors: [errMsg],
      currentStep: 'final_decision',
    };
  }
}

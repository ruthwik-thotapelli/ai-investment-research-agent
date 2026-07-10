// ─── Final Decision Node ──────────────────────────────────────────────────────

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentStateType } from '@/lib/agent/state';
import { FinalDecision } from '@/types/research';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  temperature: 0.2,
});

export async function finalDecisionNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { companyName, overview, financial, market, risk, news, scores } = state;

  try {
    const contextSummary = `
COMPANY: ${companyName} (${overview?.industry ?? 'N/A'})
DESCRIPTION: ${overview?.description ?? 'N/A'}
BUSINESS MODEL: ${overview?.businessModel ?? 'N/A'}

FINANCIAL HEALTH:
${financial?.summary ?? 'No financial data available'}

MARKET POSITION:
${market?.marketPositioning ?? 'No market data available'}
Competitive Advantages: ${market?.competitiveAdvantages?.join('; ') ?? 'N/A'}

RISK PROFILE:
Overall Risk: ${risk?.overallRiskLevel ?? 'N/A'}
${risk?.summary ?? 'No risk data available'}

MARKET SENTIMENT: ${news?.overallSentiment ?? 'N/A'}
Growth Signals: ${news?.growthSignals?.join('; ') ?? 'N/A'}
Negative Events: ${news?.negativeEvents?.filter(Boolean).join('; ') ?? 'None'}

QUANTITATIVE SCORES:
- Investment Score: ${scores?.investmentScore ?? 'N/A'}/100
- Risk Score: ${scores?.riskScore ?? 'N/A'}/100 (higher = riskier)
- Growth Score: ${scores?.growthScore ?? 'N/A'}/100
- Sentiment Score: ${scores?.sentimentScore ?? 'N/A'}/100
- Financial Health Score: ${scores?.financialHealthScore ?? 'N/A'}/100
    `.trim();

    const prompt = `You are a chief investment officer making a final investment recommendation for "${companyName}".

COMPLETE ANALYSIS:
${contextSummary}

DECISION FRAMEWORK:
- Recommend INVEST if: investmentScore ≥ 55, riskScore ≤ 70, and there are clear growth catalysts
- Recommend PASS if: investmentScore < 55, riskScore > 70, or there are major red flags
- Weight financial health and growth potential most heavily

Respond with a valid JSON object ONLY:
{
  "recommendation": "INVEST" | "PASS",
  "confidence": 75,
  "investmentThesis": "2-3 sentence compelling investment thesis or pass rationale",
  "keyStrengths": [
    "Strength 1",
    "Strength 2", 
    "Strength 3"
  ],
  "keyWeaknesses": [
    "Weakness/Risk 1",
    "Weakness/Risk 2"
  ],
  "reasoning": "Comprehensive 4-6 sentence reasoning that explains the recommendation, referencing specific data points from the analysis including financials, market position, risks, and sentiment."
}

confidence: percentage (50-99) reflecting certainty in the recommendation.
Be decisive and data-driven. Respond ONLY with JSON.`;

    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse decision JSON');

    const decision: FinalDecision = JSON.parse(jsonMatch[0]);

    return {
      decision,
      currentStep: 'complete',
    };
  } catch (error) {
    const errMsg = `Final decision failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      errors: [errMsg],
      currentStep: 'error',
    };
  }
}

// ─── Market Analysis Node ─────────────────────────────────────────────────────

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tavilySearch, formatSearchResults } from '@/lib/tools/tavilySearch';
import { AgentStateType } from '@/lib/agent/state';
import { MarketData } from '@/types/research';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

export async function marketAnalysisNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { companyName, overview } = state;
  const industry = overview?.industry ?? 'technology';

  try {
    const [marketSearch, competitorSearch] = await Promise.all([
      tavilySearch(
        `${companyName} total addressable market TAM market size ${industry} 2024 2025`,
        { maxResults: 5, searchDepth: 'advanced' }
      ),
      tavilySearch(
        `${companyName} competitors competitive advantages market share positioning`,
        { maxResults: 5, searchDepth: 'advanced' }
      ),
    ]);

    const searchContent = formatSearchResults([...marketSearch.results, ...competitorSearch.results]);
    const allCitations = [...marketSearch.citations, ...competitorSearch.citations];

    const prompt = `You are a market research expert. Analyze the market position of "${companyName}" based on:

SEARCH RESULTS:
${searchContent}

COMPANY INDUSTRY: ${industry}

Respond with a valid JSON object ONLY:
{
  "marketSize": "Total addressable market size (e.g., '$500B globally')",
  "marketGrowthRate": "Annual market growth rate (e.g., '12% CAGR')",
  "targetAddressableMarket": "Company's specific TAM or serviceable market",
  "competitors": [
    {"name": "Competitor 1", "description": "Brief description"},
    {"name": "Competitor 2", "description": "Brief description"},
    {"name": "Competitor 3", "description": "Brief description"}
  ],
  "competitiveAdvantages": [
    "Competitive advantage 1",
    "Competitive advantage 2",
    "Competitive advantage 3"
  ],
  "marketPositioning": "2-3 sentence description of how the company is positioned vs competitors",
  "marketShare": "Approximate market share percentage or description"
}

Respond ONLY with JSON.`;

    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse market data JSON');

    const market: MarketData = {
      ...JSON.parse(jsonMatch[0]),
      citations: allCitations.slice(0, 5),
    };

    return {
      market,
      currentStep: 'risk_analysis',
      citations: allCitations,
    };
  } catch (error) {
    const errMsg = `Market analysis failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      errors: [errMsg],
      currentStep: 'risk_analysis',
    };
  }
}

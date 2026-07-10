// ─── Financial Analysis Node ──────────────────────────────────────────────────

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tavilySearch, formatSearchResults } from '@/lib/tools/tavilySearch';
import { getCompanyOverview, formatFinancialMetrics } from '@/lib/tools/alphaVantage';
import { AgentStateType } from '@/lib/agent/state';
import { FinancialData } from '@/types/research';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

export async function financialAnalysisNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { companyName, overview } = state;
  const ticker = overview?.name?.split(' ')[0] ?? companyName;

  try {
    const [financialSearch, avData] = await Promise.all([
      tavilySearch(
        `${companyName} revenue growth profit margin financial results 2024 2025 annual report`,
        { maxResults: 5, searchDepth: 'advanced' }
      ),
      getCompanyOverview(ticker.toUpperCase()),
    ]);

    const searchContent = formatSearchResults(financialSearch.results);
    const avMetrics = formatFinancialMetrics(avData.data);
    const allCitations = [...financialSearch.citations, ...avData.citations];

    const prompt = `You are a senior financial analyst. Analyze the financial health of "${companyName}" using the data below.

SEARCH RESULTS:
${searchContent}

ALPHA VANTAGE FINANCIAL DATA:
${avMetrics}

Extract financial metrics and respond with a valid JSON object ONLY:
{
  "revenue": "Annual revenue with units (e.g., '$394.3B', '₹2.1T')",
  "revenueGrowth": "YoY revenue growth percentage (e.g., '8.1%')",
  "grossMargin": "Gross margin percentage",
  "netMargin": "Net profit margin percentage",
  "operatingCashFlow": "Operating cash flow with units",
  "debtToEquity": "Debt-to-equity ratio",
  "peRatio": "Price-to-earnings ratio",
  "marketCap": "Market capitalization with units",
  "eps": "Earnings per share",
  "freeCashFlow": "Free cash flow with units",
  "summary": "3-4 sentence assessment of the company's financial health, highlighting strengths and concerns"
}

Use data from both sources. If data unavailable, use 'N/A'. Respond ONLY with JSON.`;

    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse financial data JSON');

    const financial: FinancialData = {
      ...JSON.parse(jsonMatch[0]),
      citations: allCitations.slice(0, 5),
    };

    return {
      financial,
      currentStep: 'market_analysis',
      citations: allCitations,
    };
  } catch (error) {
    const errMsg = `Financial analysis failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      errors: [errMsg],
      currentStep: 'market_analysis',
    };
  }
}

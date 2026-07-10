// ─── Company Research Node ────────────────────────────────────────────────────

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tavilySearch, formatSearchResults } from '@/lib/tools/tavilySearch';
import { AgentStateType } from '@/lib/agent/state';
import { CompanyOverview } from '@/types/research';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  temperature: 0.1,
});

export async function companyResearchNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { companyName } = state;

  try {
    const [profileSearch, leadershipSearch] = await Promise.all([
      tavilySearch(`${companyName} company overview business model industry founded`, {
        maxResults: 5,
        searchDepth: 'advanced',
      }),
      tavilySearch(`${companyName} CEO leadership team headquarters employees`, {
        maxResults: 3,
        searchDepth: 'basic',
      }),
    ]);

    const combinedResults = [...profileSearch.results, ...leadershipSearch.results];
    const searchContent = formatSearchResults(combinedResults);
    const allCitations = [...profileSearch.citations, ...leadershipSearch.citations];

    const prompt = `You are an expert investment research analyst. Based on the following search results about "${companyName}", extract and structure the company overview information.

SEARCH RESULTS:
${searchContent}

Extract the following information and respond with a valid JSON object ONLY (no markdown, no explanation):
{
  "name": "Full official company name",
  "description": "2-3 sentence description of what the company does",
  "industry": "Primary industry",
  "sector": "Business sector (e.g., Technology, Healthcare, Finance)",
  "headquarters": "City, Country",
  "founded": "Year founded",
  "employees": "Approximate number of employees (e.g., '50,000+', '~10,000')",
  "ceo": "Current CEO/MD name",
  "website": "Official website URL",
  "businessModel": "How the company makes money (2-3 sentences)",
  "keyProducts": ["Product/service 1", "Product/service 2", "Product/service 3"]
}

If any field is unknown, use "N/A". Respond ONLY with the JSON object.`;

    const response = await llm.invoke(prompt);
    const content = response.content as string;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse company overview JSON');
    
    const overview: CompanyOverview = {
      ...JSON.parse(jsonMatch[0]),
      citations: allCitations.slice(0, 5),
    };

    return {
      overview,
      currentStep: 'financial_analysis',
      citations: allCitations,
    };
  } catch (error) {
    const errMsg = `Company research failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      errors: [errMsg],
      currentStep: 'financial_analysis',
    };
  }
}

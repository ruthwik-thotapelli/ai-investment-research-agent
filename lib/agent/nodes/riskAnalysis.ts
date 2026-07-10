// ─── Risk Analysis Node ───────────────────────────────────────────────────────

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tavilySearch, formatSearchResults } from '@/lib/tools/tavilySearch';
import { AgentStateType } from '@/lib/agent/state';
import { RiskData } from '@/types/research';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  temperature: 0.1,
});

export async function riskAnalysisNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { companyName, overview } = state;
  const industry = overview?.industry ?? '';

  try {
    const [regulatorySearch, financialRiskSearch] = await Promise.all([
      tavilySearch(
        `${companyName} regulatory risk antitrust lawsuit legal issues ${industry} 2024 2025`,
        { maxResults: 4, searchDepth: 'advanced' }
      ),
      tavilySearch(
        `${companyName} financial risk debt competition threats challenges`,
        { maxResults: 4, searchDepth: 'advanced' }
      ),
    ]);

    const searchContent = formatSearchResults([...regulatorySearch.results, ...financialRiskSearch.results]);
    const allCitations = [...regulatorySearch.citations, ...financialRiskSearch.citations];

    const prompt = `You are a risk management expert. Assess all material risks for investing in "${companyName}".

SEARCH RESULTS:
${searchContent}

INDUSTRY: ${industry}

Respond with a valid JSON object ONLY:
{
  "overallRiskLevel": "Low" | "Medium" | "High",
  "factors": [
    {
      "category": "Regulatory" | "Competition" | "Financial" | "Operational" | "Macro",
      "description": "Specific risk description (2 sentences)",
      "severity": "Low" | "Medium" | "High"
    }
  ],
  "summary": "3-4 sentence overall risk assessment"
}

Include 4-7 risk factors covering different categories. Respond ONLY with JSON.`;

    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse risk data JSON');

    const risk: RiskData = {
      ...JSON.parse(jsonMatch[0]),
      citations: allCitations.slice(0, 5),
    };

    return {
      risk,
      currentStep: 'news_analysis',
      citations: allCitations,
    };
  } catch (error) {
    const errMsg = `Risk analysis failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      errors: [errMsg],
      currentStep: 'news_analysis',
    };
  }
}

// ─── News & Sentiment Analysis Node ──────────────────────────────────────────

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tavilySearch, formatSearchResults } from '@/lib/tools/tavilySearch';
import { fetchCompanyNews, formatNewsArticles } from '@/lib/tools/newsApi';
import { AgentStateType } from '@/lib/agent/state';
import { NewsData } from '@/types/research';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  temperature: 0.1,
});

export async function newsAnalysisNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { companyName } = state;

  try {
    const [newsApiData, recentNewsSearch, sentimentSearch] = await Promise.all([
      fetchCompanyNews(companyName, 10),
      tavilySearch(`${companyName} latest news 2025`, {
        maxResults: 5,
        searchDepth: 'advanced',
      }),
      tavilySearch(`${companyName} growth product launch partnership expansion 2025`, {
        maxResults: 4,
        searchDepth: 'basic',
      }),
    ]);

    const newsContent = formatNewsArticles(newsApiData.articles);
    const tavilyContent = formatSearchResults([...recentNewsSearch.results, ...sentimentSearch.results]);
    const allCitations = [
      ...newsApiData.citations,
      ...recentNewsSearch.citations,
      ...sentimentSearch.citations,
    ];

    const prompt = `You are a financial sentiment analyst. Analyze recent news and sentiment for "${companyName}".

NEWS API ARTICLES:
${newsContent}

RECENT WEB SEARCH:
${tavilyContent}

Respond with a valid JSON object ONLY:
{
  "overallSentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
  "sentimentScore": 0.75,
  "items": [
    {
      "title": "News headline",
      "summary": "1-2 sentence summary",
      "sentiment": "Positive" | "Negative" | "Neutral",
      "date": "YYYY-MM-DD or 'Recent'",
      "source": "Source name",
      "url": "URL if available, else empty string"
    }
  ],
  "growthSignals": [
    "Growth signal 1",
    "Growth signal 2"
  ],
  "negativeEvents": [
    "Negative event 1 (or empty if none)"
  ]
}

sentimentScore: number from -1.0 (very negative) to 1.0 (very positive).
Include 4-8 news items. Respond ONLY with JSON.`;

    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse news data JSON');

    const news: NewsData = {
      ...JSON.parse(jsonMatch[0]),
      citations: allCitations.slice(0, 8),
    };

    return {
      news,
      currentStep: 'scoring',
      citations: allCitations,
    };
  } catch (error) {
    const errMsg = `News analysis failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      errors: [errMsg],
      currentStep: 'scoring',
    };
  }
}

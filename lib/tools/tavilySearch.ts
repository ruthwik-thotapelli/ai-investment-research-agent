// ─── Tavily Search Tool ───────────────────────────────────────────────────────

import { Citation } from '@/types/research';

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilyResponse {
  results: TavilyResult[];
  query: string;
}

export async function tavilySearch(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
    includeDomains?: string[];
  } = {}
): Promise<{ results: TavilyResult[]; answer?: string; citations: Citation[] }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('TAVILY_API_KEY is not set');

  const body = {
    api_key: apiKey,
    query,
    max_results: options.maxResults ?? 5,
    search_depth: options.searchDepth ?? 'advanced',
    include_answer: options.includeAnswer ?? true,
    include_domains: options.includeDomains ?? [],
  };

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tavily API error: ${response.status} - ${err}`);
  }

  const data = await response.json();

  const citations: Citation[] = (data.results ?? []).map((r: TavilyResult) => ({
    title: r.title,
    url: r.url,
    source: new URL(r.url).hostname.replace('www.', ''),
  }));

  return {
    results: data.results ?? [],
    answer: data.answer,
    citations,
  };
}

export function formatSearchResults(results: TavilyResult[]): string {
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join('\n\n---\n\n');
}

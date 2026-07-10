// ─── News API Tool ────────────────────────────────────────────────────────────

import { Citation } from '@/types/research';

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
  content?: string;
}

export async function fetchCompanyNews(
  companyName: string,
  maxResults: number = 10
): Promise<{ articles: NewsArticle[]; citations: Citation[] }> {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return { articles: [], citations: [] };
  }

  try {
    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', `"${companyName}"`);
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('pageSize', String(maxResults));
    url.searchParams.set('language', 'en');
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return { articles: [], citations: [] };

    const data = await response.json();
    if (data.status !== 'ok') return { articles: [], citations: [] };

    const articles: NewsArticle[] = data.articles ?? [];
    const citations: Citation[] = articles
      .filter((a) => a.url)
      .map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source.name,
      }));

    return { articles, citations };
  } catch {
    return { articles: [], citations: [] };
  }
}

export function formatNewsArticles(articles: NewsArticle[]): string {
  if (articles.length === 0) return 'No recent news found.';
  return articles
    .slice(0, 8)
    .map(
      (a, i) =>
        `[${i + 1}] ${a.title} (${a.source.name}, ${a.publishedAt?.slice(0, 10) ?? 'N/A'})\n${a.description ?? ''}`
    )
    .join('\n\n');
}

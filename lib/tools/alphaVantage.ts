// ─── Alpha Vantage Financial Data Tool ──────────────────────────────────────

import { Citation } from '@/types/research';

const BASE_URL = 'https://www.alphavantage.co/query';

export interface AlphaVantageOverview {
  Symbol: string;
  Name: string;
  Description: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  EBITDA: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  '52WeekHigh': string;
  '52WeekLow': string;
  Beta: string;
  SharesOutstanding: string;
}

async function alphaVantageRequest(params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return {};

  const url = new URL(BASE_URL);
  url.searchParams.set('apikey', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!response.ok) return {};
    const data = await response.json();
    // Alpha Vantage returns an error note when rate-limited
    if (data.Note || data.Information) return {};
    return data;
  } catch {
    return {};
  }
}

export async function getCompanyOverview(symbol: string): Promise<{
  data: Partial<AlphaVantageOverview>;
  citations: Citation[];
}> {
  const data = await alphaVantageRequest({ function: 'OVERVIEW', symbol });

  const citations: Citation[] = data.Symbol
    ? [
        {
          title: `${data.Name} — Alpha Vantage`,
          url: `https://www.alphavantage.co`,
          source: 'alphavantage.co',
        },
      ]
    : [];

  return { data: data as Partial<AlphaVantageOverview>, citations };
}

export function formatFinancialMetrics(d: Partial<AlphaVantageOverview>): string {
  if (!d.Symbol) return 'No Alpha Vantage data available.';
  return `
Company: ${d.Name ?? 'N/A'}
Symbol: ${d.Symbol}
Market Cap: ${d.MarketCapitalization ?? 'N/A'}
Revenue (TTM): ${d.RevenueTTM ?? 'N/A'}
Gross Profit (TTM): ${d.GrossProfitTTM ?? 'N/A'}
EPS: ${d.EPS ?? 'N/A'}
PE Ratio: ${d.PERatio ?? 'N/A'}
Profit Margin: ${d.ProfitMargin ?? 'N/A'}
Operating Margin (TTM): ${d.OperatingMarginTTM ?? 'N/A'}
Return on Equity (TTM): ${d.ReturnOnEquityTTM ?? 'N/A'}
Quarterly Revenue Growth (YoY): ${d.QuarterlyRevenueGrowthYOY ?? 'N/A'}
Quarterly Earnings Growth (YoY): ${d.QuarterlyEarningsGrowthYOY ?? 'N/A'}
Beta: ${d.Beta ?? 'N/A'}
52-Week High: ${d.['52WeekHigh'] ?? 'N/A'}
52-Week Low: ${d.['52WeekLow'] ?? 'N/A'}
  `.trim();
}

// ─── Investment Research API Route (SSE Streaming) ───────────────────────────

import { NextRequest } from 'next/server';
import { investmentResearchGraph } from '@/lib/agent/graph';
import { validateEnv } from '@/lib/utils/env';
import { SSEEvent, InvestmentReport } from '@/types/research';

export const maxDuration = 300; // 5 minutes for long analyses

export async function POST(req: NextRequest) {
  try {
    validateEnv();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { companyName } = await req.json();
  if (!companyName || typeof companyName !== 'string') {
    return new Response(JSON.stringify({ error: 'Company name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: SSEEvent) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      try {
        const report: Partial<InvestmentReport> = {
          companyName: companyName.trim(),
          generatedAt: new Date().toISOString(),
          allCitations: [],
        };

        // Stream the agent with node-level events
        const stream = await investmentResearchGraph.stream(
          {
            companyName: companyName.trim(),
            currentStep: 'company_research',
          },
          { streamMode: 'updates' }
        );

        for await (const update of stream) {
          const nodeName = Object.keys(update)[0];
          const nodeOutput = (update as Record<string, any>)[nodeName];

          // Check if the node returned an error
          if (nodeOutput.errors && nodeOutput.errors.length > 0) {
            throw new Error(nodeOutput.errors[nodeOutput.errors.length - 1]);
          }

          // Map node outputs to SSE events
          if (nodeName === 'company_research') {
            report.overview = nodeOutput.overview;
            if (nodeOutput.citations) {
              report.allCitations = [...(report.allCitations ?? []), ...nodeOutput.citations];
            }
            sendEvent({
              type: 'overview',
              step: 'financial_analysis',
              message: 'Company overview research complete',
              data: { overview: report.overview },
            });
          }

          if (nodeName === 'financial_analysis') {
            report.financial = nodeOutput.financial;
            if (nodeOutput.citations) {
              report.allCitations = [...(report.allCitations ?? []), ...nodeOutput.citations];
            }
            sendEvent({
              type: 'financial',
              step: 'market_analysis',
              message: 'Financial analysis complete',
              data: { financial: report.financial },
            });
          }

          if (nodeName === 'market_analysis') {
            report.market = nodeOutput.market;
            if (nodeOutput.citations) {
              report.allCitations = [...(report.allCitations ?? []), ...nodeOutput.citations];
            }
            sendEvent({
              type: 'market',
              step: 'risk_analysis',
              message: 'Market analysis complete',
              data: { market: report.market },
            });
          }

          if (nodeName === 'risk_analysis') {
            report.risk = nodeOutput.risk;
            if (nodeOutput.citations) {
              report.allCitations = [...(report.allCitations ?? []), ...nodeOutput.citations];
            }
            sendEvent({
              type: 'risk',
              step: 'news_analysis',
              message: 'Risk analysis complete',
              data: { risk: report.risk },
            });
          }

          if (nodeName === 'news_analysis') {
            report.news = nodeOutput.news;
            if (nodeOutput.citations) {
              report.allCitations = [...(report.allCitations ?? []), ...nodeOutput.citations];
            }
            sendEvent({
              type: 'news',
              step: 'scoring',
              message: 'News & sentiment analysis complete',
              data: { news: report.news },
            });
          }

          if (nodeName === 'scoring') {
            report.scores = nodeOutput.scores;
            sendEvent({
              type: 'scores',
              step: 'final_decision',
              message: 'Investment scoring complete',
              data: { scores: report.scores },
            });
          }

          if (nodeName === 'final_decision') {
            report.decision = nodeOutput.decision;
            sendEvent({
              type: 'decision',
              step: 'complete',
              message: 'Investment decision ready',
              data: { decision: report.decision },
            });
          }
        }

        // Deduplicate citations
        const seen = new Set<string>();
        report.allCitations = (report.allCitations ?? []).filter((c) => {
          if (seen.has(c.url)) return false;
          seen.add(c.url);
          return true;
        });

        // Final complete event with full report
        sendEvent({
          type: 'complete',
          step: 'complete',
          message: 'Research complete',
          data: report as InvestmentReport,
        });
      } catch (error) {
        sendEvent({
          type: 'error',
          step: 'error',
          error: error instanceof Error ? error.message : 'An unexpected error occurred',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

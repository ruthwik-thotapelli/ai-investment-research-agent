// ─── LangGraph Agent State ────────────────────────────────────────────────────

import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import {
  CompanyOverview,
  FinancialData,
  MarketData,
  RiskData,
  NewsData,
  InvestmentScores,
  FinalDecision,
  Citation,
  AgentStep,
} from '@/types/research';

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  companyName: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  overview: Annotation<CompanyOverview | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  financial: Annotation<FinancialData | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  market: Annotation<MarketData | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  risk: Annotation<RiskData | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  news: Annotation<NewsData | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  scores: Annotation<InvestmentScores | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  decision: Annotation<FinalDecision | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  currentStep: Annotation<AgentStep>({
    reducer: (_, next) => next,
    default: () => 'idle',
  }),
  errors: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  citations: Annotation<Citation[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentStateAnnotation.State;

// ─── LangGraph Agent Graph ────────────────────────────────────────────────────

import { StateGraph, END } from '@langchain/langgraph';
import { AgentStateAnnotation } from './state';
import { companyResearchNode } from './nodes/companyResearch';
import { financialAnalysisNode } from './nodes/financialAnalysis';
import { marketAnalysisNode } from './nodes/marketAnalysis';
import { riskAnalysisNode } from './nodes/riskAnalysis';
import { newsAnalysisNode } from './nodes/newsAnalysis';
import { scoringNode } from './nodes/scoring';
import { finalDecisionNode } from './nodes/finalDecision';

// Build the LangGraph state machine
const builder = new StateGraph(AgentStateAnnotation)
  // Add all nodes
  .addNode('company_research', companyResearchNode)
  .addNode('financial_analysis', financialAnalysisNode)
  .addNode('market_analysis', marketAnalysisNode)
  .addNode('risk_analysis', riskAnalysisNode)
  .addNode('news_analysis', newsAnalysisNode)
  .addNode('scoring', scoringNode)
  .addNode('final_decision', finalDecisionNode)

  // Define sequential edges
  .addEdge('__start__', 'company_research')
  .addEdge('company_research', 'financial_analysis')
  .addEdge('financial_analysis', 'market_analysis')
  .addEdge('market_analysis', 'risk_analysis')
  .addEdge('risk_analysis', 'news_analysis')
  .addEdge('news_analysis', 'scoring')
  .addEdge('scoring', 'final_decision')
  .addEdge('final_decision', END);

export const investmentResearchGraph = builder.compile();

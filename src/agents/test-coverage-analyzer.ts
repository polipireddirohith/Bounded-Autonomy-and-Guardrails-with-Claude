import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/test-coverage-analyzer.prompt.js';

/**
 * Test Coverage Analyzer Subagent
 * Analyzes source code files for test completeness, uncovered execution paths,
 * edge cases, and provides concrete test assertions.
 */
export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Specialized test coverage analyzer that identifies untested functions, branches, edge-cases, and proposes concrete test assertions with priority ratings.',
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
  tools: ['Skill', 'Read', 'Grep', 'Glob'],
  model: 'inherit'
};

import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/code-quality-analyzer.prompt.js';

/**
 * Code Quality Analyzer Subagent
 * Analyzes source code for security vulnerabilities, performance bottlenecks,
 * maintainability issues, and best practices. Integrates Claude Skills and ESLint.
 */
export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Specialized code quality analyzer that inspects source files for security vulnerabilities, performance issues, maintainability concerns, and best practice violations. Uses Claude Skills and ESLint.',
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
  tools: ['Skill', 'Read', 'Grep', 'Glob', 'mcp__eslint__lint'],
  model: 'inherit'
};

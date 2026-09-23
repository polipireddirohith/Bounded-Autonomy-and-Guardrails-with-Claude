import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/refactoring-suggester.prompt.js';

/**
 * Refactoring Suggester Subagent
 * Analyzes code for architectural improvements, design pattern applications,
 * modernization, and clean code refactorings.
 */
export const refactoringSuggester: AgentDefinition = {
  description:
    'Specialized refactoring suggester that identifies opportunities for design patterns, modern syntax, extract method/class candidates, and code simplification with before/after snippets.',
  prompt: REFACTORING_SUGGESTER_PROMPT,
  tools: ['Skill', 'Read', 'Grep', 'Glob'],
  model: 'inherit'
};

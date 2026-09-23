import path from 'path';
import { query, AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import {
  ReviewReport,
  ReviewReportSchema,
  ReviewReportJSONSchema
} from './types/index.js';
import {
  mcpServersConfig,
  githubTools,
  eslintTools
} from './config/mcp.config.js';
import {
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester
} from './agents/index.js';
import { createOrchestratorPrompt } from './prompts/index.js';
import {
  RateLimiter,
  globalRateLimiter,
  withRateLimit,
  withRetry,
  withTimeout,
  ReviewError,
  ErrorCodes,
  logger
} from './utils/index.js';

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  model?: string;
  maxTurns?: number;
  rateLimiter?: RateLimiter;
  timeoutMs?: number;
  projectRoot?: string;
  maxRetries?: number;
}

/**
 * Subagent registry
 */
export const reviewSubagents: Record<string, AgentDefinition> = {
  'code-quality-analyzer': codeQualityAnalyzer,
  'test-coverage-analyzer': testCoverageAnalyzer,
  'refactoring-suggester': refactoringSuggester
};

/**
 * Async generator input mode (streaming pattern)
 */
async function* generateMessages(userMessage: string) {
  yield {
    type: 'user' as const,
    message: { role: 'user' as const, content: userMessage },
    parent_tool_use_id: null,
    session_id: `pr-review-${Date.now()}`
  };
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private model: string;
  private maxTurns: number;
  private rateLimiter: RateLimiter;
  private timeoutMs: number;
  private projectRoot: string;
  private maxRetries: number;

  constructor(options: OrchestratorOptions = {}) {
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    this.maxTurns = options.maxTurns || 30;
    this.rateLimiter = options.rateLimiter || globalRateLimiter;
    this.timeoutMs = options.timeoutMs || 300000; // 5 minutes default
    this.projectRoot = options.projectRoot || process.env.PROJECT_ROOT || process.cwd();
    this.maxRetries = options.maxRetries ?? 3;
  }

  /**
   * Get configured rate limiter
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  /**
   * Get configured model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Review a pull request using multi-agent orchestration
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete validated review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    logger.info(`Starting review for PR #${prNumber} on ${owner}/${repo}`, {
      owner,
      repo,
      prNumber,
      model: this.model
    });

    const promptText = createOrchestratorPrompt(owner, repo, prNumber);

    const executeReview = async (): Promise<ReviewReport> => {
      const allowedTools = [
        'Task',
        'Skill',
        'Read',
        'Grep',
        'Glob',
        ...githubTools,
        ...eslintTools
      ];

      const queryIterable = query({
        prompt: generateMessages(promptText),
        options: {
          cwd: this.projectRoot,
          settingSources: ['project'],
          mcpServers: mcpServersConfig,
          allowedTools,
          agents: reviewSubagents,
          model: this.model,
          outputFormat: {
            type: 'json_schema',
            schema: ReviewReportJSONSchema
          },
          maxTurns: this.maxTurns
        }
      });

      for await (const message of queryIterable) {
        // Handle initialization and MCP server status
        if ((message as any).type === 'init') {
          const mcpServers = (message as any).mcpServers as
            | Record<string, { status?: string; error?: string }>
            | undefined;
          if (mcpServers) {
            for (const [name, server] of Object.entries(mcpServers)) {
              if (server?.status === 'failed') {
                logger.warn(`MCP server '${name}' connection failed: ${server.error || 'Unknown error'}`);
              } else {
                logger.info(`MCP server '${name}' connected (status: ${server?.status})`);
              }
            }
          }
        }

        // Handle assistant progress and tool execution
        if (message.type === 'assistant') {
          const content = message.message?.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_use') {
                logger.info(`Tool invocation: ${block.name}`, { tool: block.name });
              }
            }
          }
        }

        // Handle successful structured output
        if (
          message.type === 'result' &&
          message.subtype === 'success' &&
          message.structured_output
        ) {
          logger.info('Structured output received, validating schema...');
          const parsed = ReviewReportSchema.safeParse(message.structured_output);

          if (parsed.success) {
            logger.info('Review report successfully validated against schema');
            return parsed.data;
          }

          logger.error('Review report schema validation failed', {
            errors: parsed.error.issues
          });
          throw new ReviewError(
            `Structured output failed schema validation: ${parsed.error.message}`,
            ErrorCodes.VALIDATION_FAILED,
            { errors: parsed.error.issues }
          );
        }

        // Handle errors from query
        if (message.type === 'result' && message.subtype !== 'success') {
          throw new ReviewError(
            `Agent query terminated with subtype: ${message.subtype}`,
            ErrorCodes.AGENT_FAILED,
            { subtype: message.subtype }
          );
        }
      }

      throw new ReviewError(
        'Failed to receive structured output from orchestrator',
        ErrorCodes.STRUCTURED_OUTPUT_FAILED
      );
    };

    // Apply Rate Limiting, Timeout, and Retry logic
    return withRateLimit(
      this.rateLimiter,
      () =>
        withRetry(
          () => withTimeout(executeReview, this.timeoutMs, `Review for PR #${prNumber} timed out`),
          this.maxRetries
        ),
      5000 // Estimated tokens
    );
  }
}

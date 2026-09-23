import { describe, it, expect, vi } from 'vitest';
import {
  CodeReviewOrchestrator,
  reviewSubagents
} from '../src/orchestrator.js';
import { RateLimiter } from '../src/utils/rate-limiter.js';
import { ReviewReportSchema } from '../src/types/index.js';

describe('CodeReviewOrchestrator', () => {
  describe('Configuration', () => {
    it('should initialize with default options', () => {
      const orchestrator = new CodeReviewOrchestrator();
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getModel()).toBeDefined();
      expect(orchestrator.getRateLimiter()).toBeDefined();
    });

    it('should accept custom rate limit configuration and model', () => {
      const customLimiter = new RateLimiter({
        maxRequestsPerMinute: 20,
        maxTokensPerMinute: 25000,
        maxConcurrent: 2
      });

      const orchestrator = new CodeReviewOrchestrator({
        model: 'claude-haiku-4-5-20251001',
        maxTurns: 15,
        rateLimiter: customLimiter,
        timeoutMs: 60000
      });

      expect(orchestrator.getModel()).toBe('claude-haiku-4-5-20251001');
      expect(orchestrator.getRateLimiter()).toBe(customLimiter);
    });

    it('should have all three specialized subagents registered with correct configuration', () => {
      expect(reviewSubagents).toHaveProperty('code-quality-analyzer');
      expect(reviewSubagents).toHaveProperty('test-coverage-analyzer');
      expect(reviewSubagents).toHaveProperty('refactoring-suggester');

      const qualityAgent = reviewSubagents['code-quality-analyzer'];
      expect(qualityAgent?.tools).toContain('Skill');
      expect(qualityAgent?.model).toBe('inherit');
      expect(qualityAgent?.description).toContain('code quality');

      const testAgent = reviewSubagents['test-coverage-analyzer'];
      expect(testAgent?.tools).toContain('Skill');
      expect(testAgent?.model).toBe('inherit');

      const refactorAgent = reviewSubagents['refactoring-suggester'];
      expect(refactorAgent?.tools).toContain('Skill');
      expect(refactorAgent?.model).toBe('inherit');
    });
  });

  describe('Review Output Processing', () => {
    it('should correctly validate structured review outputs matching ReviewReportSchema', () => {
      const sampleValidReport = {
        pullRequest: {
          owner: 'airaamane',
          repo: 'simple-todo-app',
          number: 1
        },
        fileReviews: [
          {
            file: 'src/todo.ts',
            codeQuality: {
              file: 'src/todo.ts',
              issues: [
                {
                  line: 12,
                  severity: 'low' as const,
                  category: 'style' as const,
                  description: 'Prefer const over let',
                  suggestion: 'Change let to const'
                }
              ],
              overallScore: 95,
              summary: 'Overall good quality'
            },
            testCoverage: {
              file: 'src/todo.ts',
              hasTests: true,
              testFiles: ['tests/todo.test.ts'],
              untestedPaths: [],
              coverageEstimate: 90,
              summary: 'Comprehensive tests'
            },
            refactorings: {
              file: 'src/todo.ts',
              suggestions: [],
              summary: 'No refactoring required'
            }
          }
        ],
        summary: {
          totalFiles: 1,
          overallScore: 95,
          criticalIssues: 0,
          highPriorityTests: 0,
          refactoringOpportunities: 0
        },
        recommendations: [
          {
            priority: 'low' as const,
            category: 'Style',
            description: 'Apply consistent variable declarations',
            files: ['src/todo.ts']
          }
        ],
        metadata: {
          analyzedAt: new Date().toISOString(),
          duration: 3500,
          agentVersions: {
            'code-quality-analyzer': '1.0.0',
            'test-coverage-analyzer': '1.0.0',
            'refactoring-suggester': '1.0.0'
          }
        }
      };

      const parseResult = ReviewReportSchema.safeParse(sampleValidReport);
      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.data.pullRequest.number).toBe(1);
        expect(parseResult.data.fileReviews[0]?.codeQuality.overallScore).toBe(95);
      }
    });
  });

  describe('Integration', () => {
    // Only run when real API key is configured
    it.skip('should review a real small PR', async () => {
      const orchestrator = new CodeReviewOrchestrator();
      const report = await orchestrator.reviewPullRequest('octocat', 'Hello-World', 1);
      expect(report).toBeDefined();
      expect(report.pullRequest.number).toBe(1);
    });
  });
});

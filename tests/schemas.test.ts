import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  ReviewReportSchema,
  CodeQualityResultJSONSchema,
  TestCoverageResultJSONSchema,
  RefactoringSuggestionJSONSchema,
  ReviewReportJSONSchema
} from '../src/types/index.js';

describe('Schema Validation Tests', () => {
  describe('CodeQualityResultSchema', () => {
    it('accepts valid code quality analysis data', () => {
      const validData = {
        file: 'src/todo-manager.ts',
        issues: [
          {
            line: 42,
            severity: 'critical' as const,
            category: 'security' as const,
            description: 'Unescaped SQL query construction allows injection',
            suggestion: 'Use parameterized queries instead of string template interpolation'
          },
          {
            line: 105,
            severity: 'medium' as const,
            category: 'maintainability' as const,
            description: 'Function cyclomatic complexity exceeds 15',
            suggestion: 'Decompose into smaller helper routines'
          }
        ],
        overallScore: 78,
        summary: 'Code has critical security vulnerability and minor maintainability concerns'
      };

      const result = CodeQualityResultSchema.parse(validData);
      expect(result.file).toBe('src/todo-manager.ts');
      expect(result.issues).toHaveLength(2);
      expect(result.overallScore).toBe(78);
    });

    it('rejects invalid severity and category', () => {
      const invalidData = {
        file: 'src/app.ts',
        issues: [
          {
            line: 10,
            severity: 'super-fatal', // Invalid enum
            category: 'unknown-cat', // Invalid enum
            description: 'Something wrong',
            suggestion: 'Fix it'
          }
        ],
        overallScore: 50,
        summary: 'Invalid'
      };

      expect(() => CodeQualityResultSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('handles boundary score values 0 and 100', () => {
      const minData = {
        file: 'src/broken.ts',
        issues: [],
        overallScore: 0,
        summary: 'Terrible'
      };
      const maxData = {
        file: 'src/perfect.ts',
        issues: [],
        overallScore: 100,
        summary: 'Flawless'
      };

      expect(CodeQualityResultSchema.parse(minData).overallScore).toBe(0);
      expect(CodeQualityResultSchema.parse(maxData).overallScore).toBe(100);

      // Beyond boundaries should fail
      expect(() =>
        CodeQualityResultSchema.parse({ ...minData, overallScore: -1 })
      ).toThrow(ZodError);
      expect(() =>
        CodeQualityResultSchema.parse({ ...maxData, overallScore: 101 })
      ).toThrow(ZodError);
    });
  });

  describe('TestCoverageResultSchema', () => {
    it('accepts valid test coverage analysis data', () => {
      const validData = {
        file: 'src/services/auth.ts',
        hasTests: true,
        testFiles: ['tests/auth.test.ts'],
        untestedPaths: [
          {
            type: 'function' as const,
            location: 'refreshToken()',
            priority: 'critical' as const,
            reasoning: 'Critical authentication path handling token expiry',
            suggestedTest: 'it("should refresh expired token with valid refresh token")'
          }
        ],
        coverageEstimate: 65,
        summary: 'Good baseline coverage, but token refresh logic is untested'
      };

      const result = TestCoverageResultSchema.parse(validData);
      expect(result.hasTests).toBe(true);
      expect(result.coverageEstimate).toBe(65);
    });

    it('accepts empty testFiles and empty untestedPaths', () => {
      const validEmpty = {
        file: 'src/types.ts',
        hasTests: false,
        testFiles: [],
        untestedPaths: [],
        coverageEstimate: 100,
        summary: 'Type-only file requires no runtime tests'
      };

      expect(() => TestCoverageResultSchema.parse(validEmpty)).not.toThrow();
    });

    it('rejects invalid untested path priority', () => {
      const invalidData = {
        file: 'src/utils.ts',
        hasTests: false,
        testFiles: [],
        untestedPaths: [
          {
            type: 'function' as const,
            location: 'doStuff()',
            priority: 'p0', // Invalid enum
            reasoning: 'Why',
            suggestedTest: 'test()'
          }
        ],
        coverageEstimate: 50,
        summary: 'Bad'
      };

      expect(() => TestCoverageResultSchema.parse(invalidData)).toThrow(ZodError);
    });
  });

  describe('RefactoringSuggestionSchema', () => {
    it('accepts valid refactoring suggestions', () => {
      const validData = {
        file: 'src/controllers/order.ts',
        suggestions: [
          {
            type: 'modernize' as const,
            location: 'calculateTotals() lines 40-55',
            impact: 'medium' as const,
            description: 'Replace imperative for-loop with Array.reduce',
            before: 'let total = 0;\nfor (const item of items) { total += item.price; }',
            after: 'const total = items.reduce((sum, item) => sum + item.price, 0);',
            benefits: 'More idiomatic and declarative functional approach'
          }
        ],
        summary: 'Several modernization opportunities available'
      };

      const result = RefactoringSuggestionSchema.parse(validData);
      expect(result.suggestions[0]?.type).toBe('modernize');
    });

    it('rejects missing before/after snippets', () => {
      const invalidData = {
        file: 'src/controllers/order.ts',
        suggestions: [
          {
            type: 'modernize' as const,
            location: 'line 10',
            impact: 'low' as const,
            description: 'Modernize this'
            // Missing before, after, benefits
          }
        ],
        summary: 'Invalid'
      };

      expect(() => RefactoringSuggestionSchema.parse(invalidData)).toThrow(ZodError);
    });
  });

  describe('ReviewReportSchema', () => {
    it('accepts full aggregated review report', () => {
      const validReport = {
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
              issues: [],
              overallScore: 95,
              summary: 'Clean implementation'
            },
            testCoverage: {
              file: 'src/todo.ts',
              hasTests: true,
              testFiles: ['tests/todo.test.ts'],
              untestedPaths: [],
              coverageEstimate: 90,
              summary: 'Solid unit test coverage'
            },
            refactorings: {
              file: 'src/todo.ts',
              suggestions: [],
              summary: 'No major refactorings needed'
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
            category: 'Documentation',
            description: 'Add JSDoc comments to public APIs',
            files: ['src/todo.ts']
          }
        ],
        metadata: {
          analyzedAt: new Date().toISOString(),
          duration: 1250,
          agentVersions: {
            'code-quality-analyzer': '1.0.0',
            'test-coverage-analyzer': '1.0.0',
            'refactoring-suggester': '1.0.0'
          }
        }
      };

      const parsed = ReviewReportSchema.parse(validReport);
      expect(parsed.pullRequest.number).toBe(1);
      expect(parsed.fileReviews).toHaveLength(1);
      expect(parsed.summary.overallScore).toBe(95);
    });

    it('rejects report with missing metadata or summary', () => {
      const incompleteReport = {
        pullRequest: {
          owner: 'test',
          repo: 'test',
          number: 1
        },
        fileReviews: []
      };

      expect(() => ReviewReportSchema.parse(incompleteReport)).toThrow(ZodError);
    });
  });

  describe('JSON Schema Exports for SDK', () => {
    it('exports valid JSON Schemas compatible with Claude Agent SDK', () => {
      expect(CodeQualityResultJSONSchema).toBeDefined();
      expect(typeof CodeQualityResultJSONSchema).toBe('object');

      expect(TestCoverageResultJSONSchema).toBeDefined();
      expect(typeof TestCoverageResultJSONSchema).toBe('object');

      expect(RefactoringSuggestionJSONSchema).toBeDefined();
      expect(typeof RefactoringSuggestionJSONSchema).toBe('object');

      expect(ReviewReportJSONSchema).toBeDefined();
      expect(typeof ReviewReportJSONSchema).toBe('object');
      expect((ReviewReportJSONSchema as any).type).toBe('object');
      expect((ReviewReportJSONSchema as any).properties).toBeDefined();
    });
  });
});

# Enterprise Multi-Agent Code Review Orchestrator

A production-ready multi-agent system that automates GitHub PR code reviews using the **Claude Agent SDK**, **Model Context Protocol (MCP)**, and specialized AI subagents.

---

## Project Overview

This system uses three specialized AI agents working in parallel under an orchestrator to provide comprehensive, structured code reviews:

| Agent | Responsibility |
|-------|---------------|
| **Code Quality Analyzer** | Identifies security vulnerabilities, performance issues, code smells, and best-practice violations using ESLint MCP |
| **Test Coverage Analyzer** | Evaluates test completeness, uncovers untested paths, and generates concrete test assertions |
| **Refactoring Suggester** | Recommends architectural improvements with before/after code snippets |
| **Orchestrator** | Coordinates the three agents, aggregates results, validates output against a Zod schema, and generates reports |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│               CLI  (src/main.ts)                │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│        Orchestrator  (src/orchestrator.ts)       │
│  • query() loop with structured JSON output      │
│  • Rate limiting + retry + timeout wrappers      │
│  • Zod schema validation of ReviewReport         │
└──────┬────────────────┬────────────────┬─────────┘
       │                │                │
       ▼                ▼                ▼
 Code Quality     Test Coverage    Refactoring
  Analyzer          Analyzer        Suggester
(MCP: eslint)   (Skill: js-bp)   (Skill: js-bp)
       │                │                │
       └────────────────┴────────────────┘
                        │
                 GitHub MCP Server
              (PR diffs, file contents)
```

---

## Features

- **Multi-agent orchestration** via Claude Agent SDK `query()` with `Task` tool delegation
- **MCP integration**: GitHub server (PR data) + ESLint server (static analysis)
- **Structured output**: Zod schema → JSON Schema → `outputFormat` for guaranteed report shape
- **Claude Skills**: `javascript-best-practices` skill used by all three subagents
- **Production utilities**:
  - `withRetry` — exponential backoff with jitter, up to 3 attempts
  - `withTimeout` — configurable per-request timeout (default 5 min)
  - `RateLimiter` — sliding-window token bucket (10 req/min, 100 tokens/min, 3 concurrent)
- **Three output formats**: JSON, Markdown, HTML per PR
- **23 passing tests** across schema validation, utilities, and orchestrator

---

## Sample Reports

Pre-generated reports for `airaamane/simple-todo-app` PRs #1–#3 are included in `reports/`:

| PR | Description | Reports |
|----|-------------|---------|
| [#1](reports/airaamane_simple-todo-app_1.json) | feat: add task filtering by status | [JSON](reports/airaamane_simple-todo-app_1.json) · [MD](reports/airaamane_simple-todo-app_1.md) · [HTML](reports/airaamane_simple-todo-app_1.html) |
| [#2](reports/airaamane_simple-todo-app_2.json) | fix: prevent duplicate todo entries | [JSON](reports/airaamane_simple-todo-app_2.json) · [MD](reports/airaamane_simple-todo-app_2.md) · [HTML](reports/airaamane_simple-todo-app_2.html) |
| [#3](reports/airaamane_simple-todo-app_3.json) | refactor: migrate to TypeScript | [JSON](reports/airaamane_simple-todo-app_3.json) · [MD](reports/airaamane_simple-todo-app_3.md) · [HTML](reports/airaamane_simple-todo-app_3.html) |

---

## Project Structure

```
project/starter/
├── src/
│   ├── agents/              # Subagent definitions (AgentDefinition)
│   │   ├── code-quality-analyzer.ts
│   │   ├── test-coverage-analyzer.ts
│   │   └── refactoring-suggester.ts
│   ├── config/
│   │   └── mcp.config.ts    # GitHub + ESLint MCP stdio configuration
│   ├── prompts/             # Prompt factories for each agent + orchestrator
│   ├── types/               # Zod schemas + JSON Schema exports
│   │   ├── analysis-results.ts
│   │   └── report-types.ts  # ReviewReportSchema
│   ├── utils/
│   │   ├── error-handler.ts # withRetry, withTimeout, ReviewError
│   │   ├── rate-limiter.ts  # Sliding-window RateLimiter
│   │   ├── report-generator.ts  # MD / HTML / JSON formatters
│   │   └── logger.ts        # Winston logger
│   ├── orchestrator.ts      # CodeReviewOrchestrator class
│   └── main.ts              # CLI entry point
├── tests/
│   ├── schemas.test.ts      # 11 Zod schema tests
│   ├── utils.test.ts        # 8 utility tests (retry, timeout, rate limiter)
│   └── orchestrator.test.ts # 5 orchestrator tests + 1 integration (skipped)
├── scripts/
│   └── generate-sample-reports.ts  # Generates the 9 sample report files
├── reports/                 # Generated PR analysis reports (9 files)
├── .claude/
│   └── skills/
│       └── javascript-best-practices/SKILL.md
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Anthropic API key — [console.anthropic.com](https://console.anthropic.com/) or use the Vocareum workspace
- GitHub Personal Access Token — [github.com/settings/tokens](https://github.com/settings/tokens) (scopes: `repo`, `read:org`)

### Installation

```bash
# From the repo root (uses npm workspaces)
npm install

# Navigate to the project
cd project/starter
cp .env.example .env
```

### Configuration

Edit `.env`:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
PROJECT_ROOT=/absolute/path/to/project/starter

# Recommended
GITHUB_TOKEN=ghp_your-token-here

# Optional
LOG_LEVEL=info
```

**In Vocareum Workspace** — `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` are pre-set:

```bash
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
PROJECT_ROOT=/voc/work/cd14715-claude-code-classroom/project/starter
GITHUB_TOKEN=ghp_your-token-here
```

### Running

```bash
# Development
npm run dev -- <owner> <repo> <pr-number>

# Example
npm run dev -- facebook react 12345

# Production build
npm run build && npm start facebook react 12345
```

Reports are written to `reports/<owner>_<repo>_<pr>.{json,md,html}`.

### Testing

```bash
npm test                              # All 24 tests (23 pass, 1 integration skipped)
npm test -- schemas.test.ts           # Schema validation only
npm test -- --watch                   # Watch mode
```

### Regenerate Sample Reports

```bash
npx tsx scripts/generate-sample-reports.ts
```

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| [@anthropic-ai/claude-agent-sdk](https://github.com/anthropics/claude-agent-sdk) | Multi-agent orchestration, `query()`, `Task` tool |
| [Model Context Protocol](https://modelcontextprotocol.io/) | GitHub + ESLint integration via stdio MCP servers |
| [Zod](https://zod.dev/) | Runtime schema validation + JSON Schema for structured outputs |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development with strict mode |
| [Vitest](https://vitest.dev/) | Fast unit testing |
| [Winston](https://github.com/winstonjs/winston) | Structured logging |

---

## Success Criteria

- [x] TypeScript compiles without errors: `npm run build`
- [x] All tests pass: `npm test` (23/24 — 1 integration test skipped without API key)
- [x] MCP configured: GitHub + ESLint servers
- [x] Three specialized subagents with distinct prompts and tools
- [x] Structured output validated against Zod `ReviewReportSchema`
- [x] Rate limiting with sliding-window token bucket
- [x] Error handling with exponential backoff retry and timeout
- [x] Generates reports in JSON, Markdown, and HTML formats
- [x] Sample reports for `airaamane/simple-todo-app` PRs #1–#3 included

---

## Resources

- [Claude Agent SDK Docs](https://docs.anthropic.com/en/agent-sdk)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Zod Documentation](https://zod.dev/)
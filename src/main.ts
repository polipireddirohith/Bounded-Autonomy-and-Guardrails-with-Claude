import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';
import { logger } from './utils/logger.js';
import { formatError } from './utils/error-handler.js';
import { validateEnv } from './config/env.js';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const args = process.argv.slice(2);
  const [owner, repo, prStr] = args;

  // 1. Validate command line arguments
  if (!owner || !repo || !prStr) {
    console.error(`
❌ Error: Missing required command-line arguments.

Usage:
  npm run dev <owner> <repo> <pr-number>
  npm start <owner> <repo> <pr-number>

Examples:
  npm run dev airaamane simple-todo-app 1
  npm run dev octocat Hello-World 1
`);
    process.exit(1);
  }

  const prNumber = parseInt(prStr, 10);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    console.error(`
❌ Error: Invalid pull request number: "${prStr}".
Pull request number must be a positive integer.
`);
    process.exit(1);
  }

  // 2. Validate required environment configuration
  const env = validateEnv();

  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    logger.info('🔐 Using AWS Bedrock authentication');
  } else {
    logger.info('🔐 Using Anthropic API authentication');
  }

  // 3. Use validated model configuration
  const model = env.ANTHROPIC_MODEL;

  console.log(`\n🚀 Initializing Code Review for ${owner}/${repo} PR #${prNumber}...`);

  try {
    const orchestrator = new CodeReviewOrchestrator({
      model,
      projectRoot: env.PROJECT_ROOT || process.cwd()
    });

    console.log(`🤖 Running multi-agent review with model: ${model}`);
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    console.log('✅ Analysis complete! Generating reports...');
    const reportGenerator = new ReportGenerator();

    const markdownReport = reportGenerator.generateMarkdownReport(report);
    const htmlReport = reportGenerator.generateHTMLReport(report);
    const jsonReport = reportGenerator.generateJSONReport(report);

    // Ensure reports directory exists
    const reportsDir = path.resolve(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const baseName = `${owner}_${repo}_${prNumber}`;
    const mdPath = path.join(reportsDir, `${baseName}.md`);
    const htmlPath = path.join(reportsDir, `${baseName}.html`);
    const jsonPath = path.join(reportsDir, `${baseName}.json`);

    fs.writeFileSync(mdPath, markdownReport, 'utf8');
    fs.writeFileSync(htmlPath, htmlReport, 'utf8');
    fs.writeFileSync(jsonPath, jsonReport, 'utf8');

    console.log(`
🎉 Review reports generated successfully!
📁 Reports saved to:
  - JSON:     ${jsonPath}
  - Markdown: ${mdPath}
  - HTML:     ${htmlPath}

Overall Quality Score: ${report.summary.overallScore}/100
Critical Issues:       ${report.summary.criticalIssues}
High Priority Tests:   ${report.summary.highPriorityTests}
Refactoring Items:     ${report.summary.refactoringOpportunities}
`);
  } catch (error) {
    console.error(`\n❌ Code review failed: ${formatError(error)}\n`);
    process.exit(1);
  }
}

main();

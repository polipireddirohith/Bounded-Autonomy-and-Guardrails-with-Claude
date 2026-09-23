import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';
import { logger } from './utils/logger.js';
import { formatError } from './utils/error-handler.js';

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

  // 2. Validate authentication (Anthropic API or AWS Bedrock)
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasAwsCreds = Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );

  if (hasAwsCreds) {
    if (!process.env.AWS_REGION) {
      console.error('❌ Error: AWS_REGION is required when using AWS Bedrock authentication.');
      process.exit(1);
    }
    logger.info('🔐 Using AWS Bedrock authentication');
  } else if (hasAnthropicKey) {
    logger.info('🔐 Using Anthropic API authentication');
  } else {
    console.error(`
❌ Error: No valid authentication credentials found.

Please configure one of the following in your environment or .env file:

Option 1 (Anthropic API):
  ANTHROPIC_API_KEY=sk-ant-your-key-here

Option 2 (AWS Bedrock):
  AWS_ACCESS_KEY_ID=your-access-key-id
  AWS_SECRET_ACCESS_KEY=your-secret-access-key
  AWS_REGION=us-east-1
`);
    process.exit(1);
  }

  // 3. Validate ANTHROPIC_MODEL environment variable
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    console.error(`
❌ Error: ANTHROPIC_MODEL environment variable is required.

Please configure ANTHROPIC_MODEL in your .env file:
  - For Anthropic API: ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
  - For AWS Bedrock:   ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0
`);
    process.exit(1);
  }

  console.log(`\n🚀 Initializing Code Review for ${owner}/${repo} PR #${prNumber}...`);

  try {
    const orchestrator = new CodeReviewOrchestrator({
      model,
      projectRoot: process.env.PROJECT_ROOT || process.cwd()
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

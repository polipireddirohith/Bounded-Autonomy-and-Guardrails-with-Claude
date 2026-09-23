import { z } from 'zod';

const EnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  ANTHROPIC_MODEL: z.string().min(1, 'ANTHROPIC_MODEL is required'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  PROJECT_ROOT: z.string().optional()
}).superRefine((env, ctx) => {
  const hasAnthropicKey = Boolean(env.ANTHROPIC_API_KEY);
  const hasAwsCreds = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);

  if (!hasAnthropicKey && !hasAwsCreds) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide ANTHROPIC_API_KEY or both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY',
      path: ['authentication']
    });
  }

  if (hasAwsCreds && !env.AWS_REGION) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'AWS_REGION is required when using AWS Bedrock authentication',
      path: ['AWS_REGION']
    });
  }
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Environment configuration error:\n');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.') || 'environment'}: ${issue.message}`);
    }
    console.error('\nPlease update your .env file and try again.\n');
    process.exit(1);
  }

  return result.data;
}

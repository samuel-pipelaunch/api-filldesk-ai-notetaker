import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const envSchema = z.object({
  STAGE: z.enum(['dev', 'staging', 'prod']),
  DATABASE_URL: z.string().url(),
  RECALL_API_KEY: z.string().min(1),
  RECALL_WEBHOOK_SECRET: z.string().min(1),
  RECALL_REGION: z.enum(['us-east-1', 'eu-central-1']),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  API_BASE_URL: z.string().url(),
  WEB_BASE_URL: z.string().url(),
  WEBHOOK_QUEUE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  INTERNAL_ADMIN_KEY: z.string().min(1),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const envPlugin: FastifyPluginAsync = async (app): Promise<void> => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  app.decorate('config', parsed.data);
};

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
  }
}

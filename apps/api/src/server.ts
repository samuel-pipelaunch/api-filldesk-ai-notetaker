import dotenv from 'dotenv';
import { z } from 'zod';

import { buildApp } from './app.js';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const runtimeConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
});

async function closeAppAndExit(
  signal: NodeJS.Signals,
  app: Awaited<ReturnType<typeof buildApp>>,
): Promise<void> {
  app.log.info({ signal }, 'Received shutdown signal');

  try {
    await app.close();
    app.log.info('API server stopped');
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'Error during API server shutdown');
    process.exit(1);
  }
}

function registerGracefulShutdown(
  app: Awaited<ReturnType<typeof buildApp>>,
): void {
  process.once('SIGINT', () => {
    void closeAppAndExit('SIGINT', app);
  });

  process.once('SIGTERM', () => {
    void closeAppAndExit('SIGTERM', app);
  });
}

export async function startServer(): Promise<void> {
  const runtimeConfig = runtimeConfigSchema.parse(process.env);
  const app = await buildApp();

  registerGracefulShutdown(app);

  try {
    await app.listen({
      port: runtimeConfig.PORT,
      host: runtimeConfig.HOST,
    });

    app.log.info(
      {
        host: runtimeConfig.HOST,
        port: runtimeConfig.PORT,
      },
      'API server listening',
    );
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start API server');
    process.exit(1);
  }
}

void startServer();
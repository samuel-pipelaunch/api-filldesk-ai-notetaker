import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { createLogger, resolveLogLevelFromEnv, resolveStageFromEnv } from './lib/logger.js';
import { adminAuthPlugin } from './plugins/admin-auth.js';
import { databasePlugin } from './plugins/database.js';
import { envPlugin } from './plugins/env.js';
import { errorsPlugin } from './plugins/errors.js';
import { userContextPlugin } from './plugins/user-context.js';
import { recallPlugin } from './plugins/recall.js';
import { adminLicensesRoute } from './routes/admin/licenses.route.js';
import { adminOrganizationsRoute } from './routes/admin/organizations.route.js';
import { adminSettingsRoute } from './routes/admin/settings.route.js';
import { adminUsersRoute } from './routes/admin/users.route.js';
import { googleOAuthRoute } from './routes/google-oauth.route.js';
import { healthRoute } from './routes/health.route.js';
import { recallWebhookRoute } from './routes/recall-webhook.route.js';
import { userCalendarRoute } from './routes/user/calendar.route.js';
import { userMeetingsRoute } from './routes/user/meetings.route.js';
import { userSettingsRoute } from './routes/user/settings.route.js';

function resolveCorsOrigin(stage: string, webBaseUrl: string): true | string[] {
  if (stage === 'dev') {
    return true;
  }

  return [webBaseUrl];
}

export async function buildApp(): Promise<FastifyInstance> {
  const stage = resolveStageFromEnv(process.env);
  const logLevel = resolveLogLevelFromEnv(process.env);

  const app = Fastify({
    logger: createLogger(stage, logLevel),
  });

  await app.register(envPlugin);
  await app.register(databasePlugin);
  await app.register(recallPlugin);

  await app.register(cors, {
    origin: resolveCorsOrigin(app.config.STAGE, app.config.WEB_BASE_URL),
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'x-admin-key'],
  });

  await app.register(errorsPlugin);

  await app.register(healthRoute);
  await app.register(recallWebhookRoute);

  await app.register(
    async (v1App): Promise<void> => {
      await v1App.register(googleOAuthRoute);

      await v1App.register(
        async (userApp): Promise<void> => {
          await userApp.register(userContextPlugin);
          await userApp.register(userSettingsRoute);
          await userApp.register(userCalendarRoute);
          await userApp.register(userMeetingsRoute);
        },
        { prefix: '/user' },
      );

      await v1App.register(
        async (adminApp): Promise<void> => {
          await adminApp.register(adminAuthPlugin);
          await adminApp.register(adminOrganizationsRoute);
          await adminApp.register(adminUsersRoute);
          await adminApp.register(adminLicensesRoute);
          await adminApp.register(adminSettingsRoute);
        },
        { prefix: '/admin' },
      );
    },
    { prefix: '/api/v1' },
  );

  return app;
}
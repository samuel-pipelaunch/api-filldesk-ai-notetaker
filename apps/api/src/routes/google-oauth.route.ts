import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { licenses } from '../db/schema/licenses.js';
import { users } from '../db/schema/users.js';
import { GoogleOAuthClient } from '../integrations/google/oauth-client.js';
import { badRequest, forbidden } from '../lib/http-error.js';
import { validateBody, validateQuery } from '../lib/validation.js';
import { GoogleCalendarConnectionService } from '../services/google-calendar-connection.service.js';
import { GooglePermissionCheckService } from '../services/google-permission-check.service.js';

const userBodySchema = z.object({
  userId: z.string().uuid(),
});

const statusQuerySchema = z.object({
  userId: z.string().uuid(),
});

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  scope: z.string().optional(),
});

interface ValidatedUser {
  id: string;
  orgId: string;
}

function buildCalendarRedirectUrl(
  webBaseUrl: string,
  status: string,
  errorCode?: string,
): string {
  const redirectUrl = new URL('/user/calendar', webBaseUrl);
  redirectUrl.searchParams.set('status', status);

  if (errorCode) {
    redirectUrl.searchParams.set('error', errorCode);
  }

  return redirectUrl.toString();
}

export const googleOAuthRoute: FastifyPluginAsync = async (app): Promise<void> => {
  const oauthClient = new GoogleOAuthClient({
    clientId: app.config.GOOGLE_CLIENT_ID,
    clientSecret: app.config.GOOGLE_CLIENT_SECRET,
    redirectUri: app.config.GOOGLE_REDIRECT_URI,
  });

  const connectionService = new GoogleCalendarConnectionService({
    db: app.db,
    oauthClient,
    recall: app.recall,
    googleClientId: app.config.GOOGLE_CLIENT_ID,
    googleClientSecret: app.config.GOOGLE_CLIENT_SECRET,
    logger: app.log,
  });

  const permissionCheckService = new GooglePermissionCheckService({
    connectionService,
  });

  async function validateUserWithActiveLicense(userId: string): Promise<ValidatedUser> {
    const [user] = await app.db
      .select({
        id: users.id,
        orgId: users.orgId,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      throw badRequest('User not found or inactive');
    }

    const [activeLicense] = await app.db
      .select({ id: licenses.id })
      .from(licenses)
      .where(
        and(
          eq(licenses.userId, user.id),
          eq(licenses.orgId, user.orgId),
          eq(licenses.status, 'active'),
        ),
      )
      .limit(1);

    if (!activeLicense) {
      throw forbidden('User does not have an active license');
    }

    return user;
  }

  app.post('/google/connect', async (request) => {
    const { userId } = validateBody(userBodySchema, request.body);
    const user = await validateUserWithActiveLicense(userId);

    app.log.info({ userId }, 'Starting Google calendar connection flow');

    return connectionService.initiateConnection(user.id, user.orgId);
  });

  app.get('/google/callback', async (request, reply) => {
    const query = validateQuery(callbackQuerySchema, request.query);

    if (query.error) {
      if (!query.state) {
        throw badRequest('Missing state parameter for OAuth error callback');
      }

      const updatedConnection = await connectionService.handleOAuthError(
        query.state,
        query.error,
        query.error_description,
      );

      app.log.warn(
        {
          userId: updatedConnection.userId,
          error: query.error,
        },
        'Google callback received OAuth error',
      );

      return reply.redirect(buildCalendarRedirectUrl(app.config.WEB_BASE_URL, 'error', query.error));
    }

    if (!query.code || !query.state) {
      throw badRequest('Missing code or state parameter in OAuth callback');
    }

    const updatedConnection = await connectionService.handleOAuthCallback(query.state, query.code);

    if (updatedConnection.status === 'insufficient_permissions') {
      return reply.redirect(
        buildCalendarRedirectUrl(app.config.WEB_BASE_URL, 'insufficient_permissions'),
      );
    }

    if (updatedConnection.status === 'connected') {
      return reply.redirect(buildCalendarRedirectUrl(app.config.WEB_BASE_URL, 'connected'));
    }

    return reply.redirect(
      buildCalendarRedirectUrl(
        app.config.WEB_BASE_URL,
        'error',
        updatedConnection.lastErrorCode ?? undefined,
      ),
    );
  });

  app.post('/google/disconnect', async (request) => {
    const { userId } = validateBody(userBodySchema, request.body);
    await validateUserWithActiveLicense(userId);

    await connectionService.disconnectCalendar(userId);
    return { success: true };
  });

  app.get('/google/status', async (request) => {
    const { userId } = validateQuery(statusQuerySchema, request.query);
    await validateUserWithActiveLicense(userId);

    const connection = await connectionService.getConnectionStatus(userId);
    if (!connection) {
      return null;
    }

    return {
      id: connection.id,
      status: connection.status,
      googleEmail: connection.googleEmail,
      hasCalendarEventsScope: connection.hasCalendarEventsScope,
      lastErrorCode: connection.lastErrorCode,
      connectedAt: connection.connectedAt,
    };
  });

  app.post('/google/health-check', async (request) => {
    const { userId } = validateBody(userBodySchema, request.body);
    await validateUserWithActiveLicense(userId);

    return connectionService.checkConnectionHealth(userId);
  });

  app.post('/google/reconnect', async (request) => {
    const { userId } = validateBody(userBodySchema, request.body);
    const user = await validateUserWithActiveLicense(userId);

    app.log.info({ userId }, 'Reconnecting Google calendar to recover permissions');

    return permissionCheckService.getReconnectUrl(user.id, user.orgId);
  });
};

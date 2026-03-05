import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { GoogleOAuthClient } from '../../integrations/google/oauth-client.js';
import { validateParams } from '../../lib/validation.js';
import { GoogleCalendarConnectionService } from '../../services/google-calendar-connection.service.js';
import { GooglePermissionCheckService } from '../../services/google-permission-check.service.js';

const userParamsSchema = z.object({
  userId: z.string().uuid(),
});

export const userCalendarRoute: FastifyPluginAsync = async (app): Promise<void> => {
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

  app.get('/:userId/calendar/status', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);

    const connection = await connectionService.getConnectionStatus(userId);
    if (!connection) {
      return {
        status: 'disconnected',
        google_email: null,
        has_calendar_events_scope: false,
        last_error_code: null,
        connected_at: null,
        last_checked_at: null,
      };
    }

    const payload: Record<string, unknown> = {
      status: connection.status,
      google_email: connection.googleEmail,
      has_calendar_events_scope: connection.hasCalendarEventsScope,
      last_error_code: connection.lastErrorCode,
      connected_at: connection.connectedAt,
      last_checked_at: connection.lastCheckedAt,
    };

    if (connection.status === 'insufficient_permissions') {
      payload.missing_scopes = permissionCheckService.getMissingScopes(connection);
    }

    return payload;
  });

  app.post('/:userId/calendar/connect', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    return connectionService.initiateConnection(userId, request.userContext.org.id);
  });

  app.post('/:userId/calendar/disconnect', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    await connectionService.disconnectCalendar(userId);
    return { success: true };
  });

  app.post('/:userId/calendar/reconnect', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    return permissionCheckService.getReconnectUrl(userId, request.userContext.org.id);
  });

  app.post('/:userId/calendar/health-check', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    return connectionService.checkConnectionHealth(userId);
  });
};

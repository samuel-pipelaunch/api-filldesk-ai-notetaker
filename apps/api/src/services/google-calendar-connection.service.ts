import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import { googleCalendarConnections } from '../db/schema/google-calendar-connections.js';
import type { Db } from '../db/client.js';
import type { GoogleOAuthClient } from '../integrations/google/oauth-client.js';
import type { RecallClient } from '../integrations/recall/client.js';
import { badRequest } from '../lib/http-error.js';

type GoogleCalendarConnection = InferSelectModel<typeof googleCalendarConnections>;

interface GoogleCalendarConnectionServiceConfig {
  db: Db;
  oauthClient: GoogleOAuthClient;
  recall: RecallClient;
  googleClientId: string;
  googleClientSecret: string;
  logger: FastifyBaseLogger;
}

function parseGrantedScopes(scopes: string): string[] {
  return scopes
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

export class GoogleCalendarConnectionService {
  private readonly db: Db;
  private readonly oauthClient: GoogleOAuthClient;
  private readonly recall: RecallClient;
  private readonly googleClientId: string;
  private readonly googleClientSecret: string;
  private readonly logger: FastifyBaseLogger;

  public constructor(config: GoogleCalendarConnectionServiceConfig) {
    this.db = config.db;
    this.oauthClient = config.oauthClient;
    this.recall = config.recall;
    this.googleClientId = config.googleClientId;
    this.googleClientSecret = config.googleClientSecret;
    this.logger = config.logger;
  }

  public async initiateConnection(
    userId: string,
    orgId: string,
  ): Promise<{ authorizationUrl: string }> {
    const existingConnection = await this.findConnectionByUserId(userId);

    if (existingConnection?.status === 'connected' && existingConnection.recallCalendarId) {
      this.logger.info({ userId }, 'Existing connected calendar found, disconnecting before reconnect');
      await this.deleteRecallCalendar(existingConnection.recallCalendarId);
    }

    const oauthState = randomUUID();
    const now = new Date();

    if (existingConnection) {
      await this.db
        .update(googleCalendarConnections)
        .set({
          orgId,
          status: 'pending',
          oauthState,
          recallCalendarId: null,
          googleEmail: null,
          scopesGranted: null,
          hasCalendarEventsScope: false,
          lastErrorCode: null,
          lastErrorMessage: null,
          connectedAt: null,
          disconnectedAt: null,
          updatedAt: now,
        })
        .where(eq(googleCalendarConnections.id, existingConnection.id));
    } else {
      await this.db.insert(googleCalendarConnections).values({
        userId,
        orgId,
        status: 'pending',
        oauthState,
      });
    }

    this.logger.info({ userId }, 'Google OAuth flow initiated');

    return {
      authorizationUrl: this.oauthClient.getAuthorizationUrl(oauthState),
    };
  }

  public async handleOAuthCallback(state: string, code: string): Promise<GoogleCalendarConnection> {
    const connection = await this.findConnectionByState(state);
    if (!connection) {
      throw badRequest('Invalid or expired OAuth state');
    }

    this.logger.info({ userId: connection.userId }, 'Handling Google OAuth callback');

    try {
      const tokens = await this.oauthClient.exchangeCodeForTokens(code);
      const scopeValidation = this.oauthClient.validateScopes(tokens.scope);
      const grantedScopes = parseGrantedScopes(tokens.scope);

      if (!scopeValidation.valid) {
        this.logger.warn(
          {
            userId: connection.userId,
            missingScopes: scopeValidation.missing,
          },
          'Google OAuth completed with insufficient permissions',
        );

        return this.updateConnectionById(connection.id, {
          status: 'insufficient_permissions',
          oauthState: null,
          scopesGranted: grantedScopes,
          hasCalendarEventsScope: false,
          lastErrorCode: 'missing_scope',
          lastErrorMessage: `Missing required scopes: ${scopeValidation.missing.join(', ')}`,
          updatedAt: new Date(),
        });
      }

      const googleEmail = await this.oauthClient.getUserEmail(tokens.access_token);

      let recallCalendarId: string;
      try {
        recallCalendarId = await this.createRecallCalendar(tokens.refresh_token);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Recall API error';

        this.logger.error(
          {
            userId: connection.userId,
            err: error,
          },
          'Failed to create Recall calendar after successful Google OAuth',
        );

        return this.updateConnectionById(connection.id, {
          status: 'error',
          oauthState: null,
          googleEmail,
          scopesGranted: grantedScopes,
          hasCalendarEventsScope: true,
          lastErrorCode: 'recall_calendar_create_failed',
          lastErrorMessage: message,
          updatedAt: new Date(),
        });
      }

      return this.updateConnectionById(connection.id, {
        status: 'connected',
        oauthState: null,
        recallCalendarId,
        googleEmail,
        scopesGranted: grantedScopes,
        hasCalendarEventsScope: true,
        connectedAt: new Date(),
        disconnectedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Google OAuth callback error';

      this.logger.error(
        {
          userId: connection.userId,
          err: error,
        },
        'Google OAuth callback failed',
      );

      return this.updateConnectionById(connection.id, {
        status: 'error',
        oauthState: null,
        lastErrorCode: 'token_exchange_failed',
        lastErrorMessage: message,
        updatedAt: new Date(),
      });
    }
  }

  public async handleOAuthError(
    state: string,
    error: string,
    errorDescription?: string,
  ): Promise<GoogleCalendarConnection> {
    const connection = await this.findConnectionByState(state);
    if (!connection) {
      throw badRequest('Invalid or expired OAuth state');
    }

    this.logger.warn(
      {
        userId: connection.userId,
        error,
      },
      'Google OAuth returned an error',
    );

    return this.updateConnectionById(connection.id, {
      status: 'error',
      oauthState: null,
      lastErrorCode: error,
      lastErrorMessage: errorDescription ?? null,
      updatedAt: new Date(),
    });
  }

  public async disconnectCalendar(userId: string): Promise<void> {
    const connection = await this.findConnectionByUserId(userId);
    if (!connection) {
      return;
    }

    if (connection.recallCalendarId) {
      await this.deleteRecallCalendar(connection.recallCalendarId);
    }

    await this.updateConnectionById(connection.id, {
      status: 'disconnected',
      oauthState: null,
      disconnectedAt: new Date(),
      updatedAt: new Date(),
    });

    this.logger.info({ userId }, 'Google calendar disconnected');
  }

  public async checkConnectionHealth(userId: string): Promise<GoogleCalendarConnection> {
    const connection = await this.findConnectionByUserId(userId);
    if (!connection) {
      throw badRequest('Google calendar connection not found for user');
    }

    const updates: Partial<typeof googleCalendarConnections.$inferInsert> = {
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    };

    if (connection.recallCalendarId) {
      try {
        const recallCalendar = await this.getRecallCalendar(connection.recallCalendarId);

        if (recallCalendar.status === 'disconnected') {
          updates.status = 'disconnected';
        } else if (recallCalendar.status && recallCalendar.status !== 'connected') {
          updates.status = 'error';
          updates.lastErrorCode = 'recall_calendar_unhealthy';
          updates.lastErrorMessage = `Recall calendar reported status: ${recallCalendar.status}`;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Recall health check error';
        updates.status = 'error';
        updates.lastErrorCode = 'health_check_failed';
        updates.lastErrorMessage = message;
      }
    }

    return this.updateConnectionById(connection.id, updates);
  }

  public async getConnectionStatus(userId: string): Promise<GoogleCalendarConnection | null> {
    return this.findConnectionByUserId(userId);
  }

  private async findConnectionByUserId(userId: string): Promise<GoogleCalendarConnection | null> {
    const [connection] = await this.db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.userId, userId))
      .limit(1);

    return connection ?? null;
  }

  private async findConnectionByState(state: string): Promise<GoogleCalendarConnection | null> {
    const [connection] = await this.db
      .select()
      .from(googleCalendarConnections)
      .where(
        and(
          eq(googleCalendarConnections.oauthState, state),
          eq(googleCalendarConnections.status, 'pending'),
        ),
      )
      .limit(1);

    return connection ?? null;
  }

  private async updateConnectionById(
    connectionId: string,
    updates: Partial<typeof googleCalendarConnections.$inferInsert>,
  ): Promise<GoogleCalendarConnection> {
    const [connection] = await this.db
      .update(googleCalendarConnections)
      .set(updates)
      .where(eq(googleCalendarConnections.id, connectionId))
      .returning();

    if (!connection) {
      throw badRequest('Google calendar connection no longer exists');
    }

    return connection;
  }

  private async createRecallCalendar(refreshToken: string): Promise<string> {
    const response = await this.recall.createCalendar({
      oauth_client_id: this.googleClientId,
      oauth_client_secret: this.googleClientSecret,
      oauth_refresh_token: refreshToken,
      platform: 'google_calendar',
    });

    if (!response.id) {
      throw new Error('Recall calendar create response missing calendar id');
    }

    return response.id;
  }

  private async getRecallCalendar(calendarId: string): Promise<{ id: string; status?: string }> {
    return this.recall.getCalendar(calendarId);
  }

  private async deleteRecallCalendar(calendarId: string): Promise<void> {
    await this.recall.deleteCalendar(calendarId);
  }
}

export type { GoogleCalendarConnection };

import { GOOGLE_REQUIRED_SCOPES } from '../integrations/google/oauth-client.js';
import type {
  GoogleCalendarConnection,
  GoogleCalendarConnectionService,
} from './google-calendar-connection.service.js';

function parseScopes(scopesGranted: string[] | null): Set<string> {
  if (!scopesGranted) {
    return new Set();
  }

  return new Set(scopesGranted);
}

interface GooglePermissionCheckServiceConfig {
  connectionService: GoogleCalendarConnectionService;
}

export class GooglePermissionCheckService {
  private readonly connectionService: GoogleCalendarConnectionService;

  public constructor(config: GooglePermissionCheckServiceConfig) {
    this.connectionService = config.connectionService;
  }

  public hasRequiredScopes(connection: GoogleCalendarConnection): boolean {
    return connection.hasCalendarEventsScope && this.getMissingScopes(connection).length === 0;
  }

  public getMissingScopes(connection: GoogleCalendarConnection): string[] {
    const grantedScopeSet = parseScopes(connection.scopesGranted);

    return GOOGLE_REQUIRED_SCOPES.filter((requiredScope) => !grantedScopeSet.has(requiredScope));
  }

  public async getReconnectUrl(
    userId: string,
    orgId: string,
  ): Promise<{ authorizationUrl: string }> {
    await this.connectionService.disconnectCalendar(userId);
    return this.connectionService.initiateConnection(userId, orgId);
  }
}

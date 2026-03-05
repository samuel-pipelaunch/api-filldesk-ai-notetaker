import type { GoogleOAuthError, GoogleTokenResponse, GoogleUserInfo } from './types.js';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

export const GOOGLE_REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
] as const;

interface GoogleOAuthClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GoogleTokenEndpointResponse {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfoResponse {
  email?: string;
  email_verified?: boolean;
  verified_email?: boolean;
}

function parseScopes(grantedScopes: string): string[] {
  return grantedScopes
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

function formatGoogleError(
  fallbackMessage: string,
  errorPayload: GoogleOAuthError | null,
  statusCode: number,
): Error {
  if (!errorPayload) {
    return new Error(`${fallbackMessage} (status ${statusCode})`);
  }

  const description = errorPayload.error_description ? `: ${errorPayload.error_description}` : '';
  return new Error(`${fallbackMessage} (${errorPayload.error}${description})`);
}

async function parseGoogleErrorResponse(response: Response): Promise<GoogleOAuthError | null> {
  try {
    const payload = (await response.json()) as GoogleOAuthError;

    if (typeof payload.error !== 'string') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export class GoogleOAuthClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  public constructor(config: GoogleOAuthClientConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
  }

  public getAuthorizationUrl(state: string): string {
    const scope = GOOGLE_REQUIRED_SCOPES.join(' ');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });

    return `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params.toString()}`;
  }

  public async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const payload = (await response.json()) as GoogleTokenEndpointResponse;
    if (!response.ok) {
      throw formatGoogleError(
        'Failed to exchange Google authorization code for tokens',
        payload.error ? { error: payload.error, error_description: payload.error_description } : null,
        response.status,
      );
    }

    if (!payload.access_token || !payload.scope || !payload.token_type || !payload.expires_in) {
      throw new Error('Google token response is missing required token fields');
    }

    if (!payload.refresh_token) {
      throw new Error('Google token response did not include a refresh token');
    }

    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      scope: payload.scope,
      token_type: payload.token_type,
      expiry_date: Date.now() + payload.expires_in * 1000,
    };
  }

  public async getUserEmail(accessToken: string): Promise<string> {
    const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorPayload = await parseGoogleErrorResponse(response);
      throw formatGoogleError(
        'Failed to fetch Google user email',
        errorPayload,
        response.status,
      );
    }

    const payload = (await response.json()) as GoogleUserInfoResponse;
    const userInfo: GoogleUserInfo = {
      email: payload.email ?? '',
      email_verified: payload.email_verified ?? payload.verified_email ?? false,
    };

    if (!userInfo.email) {
      throw new Error('Google user info response did not include an email address');
    }

    return userInfo.email;
  }

  public validateScopes(grantedScopes: string): { valid: boolean; missing: string[] } {
    const scopes = parseScopes(grantedScopes);
    const scopeSet = new Set(scopes);
    const missing = GOOGLE_REQUIRED_SCOPES.filter((requiredScope) => !scopeSet.has(requiredScope));

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  public async revokeToken(token: string): Promise<void> {
    const response = await fetch(GOOGLE_REVOKE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token }),
    });

    if (!response.ok) {
      const errorPayload = await parseGoogleErrorResponse(response);
      throw formatGoogleError('Failed to revoke Google token', errorPayload, response.status);
    }
  }
}

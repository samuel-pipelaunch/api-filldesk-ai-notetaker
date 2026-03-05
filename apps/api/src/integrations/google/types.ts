export interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface GoogleUserInfo {
  email: string;
  email_verified: boolean;
}

export interface GoogleOAuthError {
  error: string;
  error_description?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? '';

export interface ApiErrorPayload {
  statusCode?: number;
  error?: string;
  message?: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly payload: ApiErrorPayload | null;

  public constructor(status: number, message: string, payload: ApiErrorPayload | null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.payload = payload;
  }
}

export type RecallRegion = 'us-east-1' | 'eu-central-1';
export type UserRole = 'admin' | 'user';
export type TranscriptionProvider = 'recall' | 'assembly_ai' | 'deepgram' | 'aws_transcribe';
export type LicenseStatus = 'active' | 'revoked';
export type CalendarStatus =
  | 'pending'
  | 'connected'
  | 'disconnected'
  | 'insufficient_permissions'
  | 'expired'
  | 'error';
export type MeetingStatus =
  | 'scheduled'
  | 'joining'
  | 'recording'
  | 'processing'
  | 'transcribing'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface Organization {
  id: string;
  name: string;
  recallRegion: RecallRegion;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  sfUserId: string | null;
  sfOrgId: string | null;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ email: string; error: string }>;
}

export interface License {
  id: string;
  orgId: string;
  userId: string;
  status: LicenseStatus;
  grantedAt: string;
  revokedAt: string | null;
  grantedBy: string | null;
}

export interface LicenseWithUser extends License {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
  };
}

export interface LicenseSummary {
  total: number;
  active: number;
  revoked: number;
}

export interface OrganizationSettings {
  id: string;
  orgId: string;
  botName: string;
  autoRecord: boolean;
  recordExternalMeetings: boolean;
  recordInternalMeetings: boolean;
  waitingRoomTimeout: number;
  nooneJoinedTimeout: number;
  everyoneLeftTimeout: number;
  maxMeetingDuration: number;
  transcriptionProvider: TranscriptionProvider;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  orgId: string;
  botName: string | null;
  autoRecord: boolean | null;
  recordExternalMeetings: boolean | null;
  recordInternalMeetings: boolean | null;
  waitingRoomTimeout: number | null;
  nooneJoinedTimeout: number | null;
  everyoneLeftTimeout: number | null;
  maxMeetingDuration: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveSettings {
  botName: string;
  autoRecord: boolean;
  recordExternalMeetings: boolean;
  recordInternalMeetings: boolean;
  waitingRoomTimeout: number;
  nooneJoinedTimeout: number;
  everyoneLeftTimeout: number;
  maxMeetingDuration: number;
  transcriptionProvider: TranscriptionProvider;
  overrides: Record<string, 'org' | 'user'>;
}

export interface CalendarStatusResponse {
  status: CalendarStatus;
  google_email: string | null;
  has_calendar_events_scope: boolean;
  last_error_code: string | null;
  connected_at: string | null;
  last_checked_at: string | null;
  missing_scopes?: string[];
}

export interface CalendarAuthorizationResponse {
  authorizationUrl: string;
}

export interface CalendarConnectionRecord {
  id: string;
  userId: string;
  orgId: string;
  recallCalendarId: string | null;
  googleEmail: string | null;
  status: CalendarStatus;
  scopesGranted: string[] | null;
  hasCalendarEventsScope: boolean;
  oauthState: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  orgId: string;
  userId: string;
  recallBotId: string | null;
  recallCalendarEventId: string | null;
  meetingUrl: string | null;
  title: string | null;
  status: MeetingStatus;
  failureReason: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  botConfigSnapshot: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  id: string;
  meetingId: string;
  speaker: string | null;
  speakerId: number | null;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number | null;
  language: string | null;
  isFinal: boolean;
  sequenceNumber: number;
}

export interface MeetingDetail extends Meeting {
  transcriptSegments: TranscriptSegment[];
}

export interface MeetingListResponse {
  data: Meeting[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface MeetingStats {
  total: number;
  recorded: number;
  scheduled: number;
  failed: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  admin?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(path, API_BASE_URL);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value == null) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers({
    Accept: 'application/json',
  });

  if (options.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.admin && ADMIN_KEY) {
    headers.set('x-admin-key', ADMIN_KEY);
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? ((await response.json()) as unknown) : null;

  if (!response.ok) {
    const errorPayload = (payload as ApiErrorPayload | null) ?? null;
    const message =
      errorPayload?.message ??
      errorPayload?.error ??
      `API request failed with status ${response.status}`;
    throw new ApiClientError(response.status, message, errorPayload);
  }

  return payload as T;
}

export const apiClient = {
  admin: {
    createOrganization(payload: { name: string; recallRegion?: RecallRegion }) {
      return request<Organization>('/api/v1/admin/organizations', {
        method: 'POST',
        body: payload,
        admin: true,
      });
    },
    listOrganizations() {
      return request<Organization[]>('/api/v1/admin/organizations', { admin: true });
    },
    getOrganization(orgId: string) {
      return request<Organization>(`/api/v1/admin/organizations/${orgId}`, { admin: true });
    },
    updateOrganization(
      orgId: string,
      payload: Partial<Pick<Organization, 'name' | 'recallRegion' | 'isActive'>>,
    ) {
      return request<Organization>(`/api/v1/admin/organizations/${orgId}`, {
        method: 'PATCH',
        body: payload,
        admin: true,
      });
    },
    importUsers(orgId: string, users: Array<Omit<User, 'id' | 'orgId' | 'isActive' | 'createdAt' | 'updatedAt'>>) {
      return request<ImportResult>(`/api/v1/admin/organizations/${orgId}/users/import`, {
        method: 'POST',
        body: { users },
        admin: true,
      });
    },
    listUsers(orgId: string, includeInactive = false) {
      return request<User[]>(`/api/v1/admin/organizations/${orgId}/users`, {
        query: { includeInactive },
        admin: true,
      });
    },
    updateUser(
      orgId: string,
      userId: string,
      payload: Partial<Pick<User, 'name' | 'role' | 'isActive'>>,
    ) {
      return request<User>(`/api/v1/admin/organizations/${orgId}/users/${userId}`, {
        method: 'PATCH',
        body: payload,
        admin: true,
      });
    },
    grantLicense(orgId: string, userId: string) {
      return request<License>(`/api/v1/admin/organizations/${orgId}/licenses`, {
        method: 'POST',
        body: { userId },
        admin: true,
      });
    },
    revokeLicense(orgId: string, userId: string) {
      return request<License>(`/api/v1/admin/organizations/${orgId}/licenses/${userId}`, {
        method: 'DELETE',
        admin: true,
      });
    },
    listLicenses(orgId: string) {
      return request<LicenseWithUser[]>(`/api/v1/admin/organizations/${orgId}/licenses`, {
        admin: true,
      });
    },
    getLicenseSummary(orgId: string) {
      return request<LicenseSummary>(`/api/v1/admin/organizations/${orgId}/licenses/summary`, {
        admin: true,
      });
    },
    getSettings(orgId: string) {
      return request<OrganizationSettings>(`/api/v1/admin/organizations/${orgId}/settings`, {
        admin: true,
      });
    },
    updateSettings(orgId: string, payload: Partial<OrganizationSettings>) {
      return request<OrganizationSettings>(`/api/v1/admin/organizations/${orgId}/settings`, {
        method: 'PATCH',
        body: payload,
        admin: true,
      });
    },
  },
  user: {
    getSettings(userId: string) {
      return request<UserSettings | null>(`/api/v1/user/${userId}/settings`);
    },
    getEffectiveSettings(userId: string) {
      return request<EffectiveSettings>(`/api/v1/user/${userId}/settings/effective`);
    },
    updateSettings(userId: string, payload: Partial<Omit<UserSettings, 'id' | 'userId' | 'orgId' | 'createdAt' | 'updatedAt'>>) {
      return request<UserSettings>(`/api/v1/user/${userId}/settings`, {
        method: 'PATCH',
        body: payload,
      });
    },
    resetSettings(userId: string) {
      return request<{ success: boolean }>(`/api/v1/user/${userId}/settings`, {
        method: 'DELETE',
      });
    },
    getCalendarStatus(userId: string) {
      return request<CalendarStatusResponse>(`/api/v1/user/${userId}/calendar/status`);
    },
    connectCalendar(userId: string) {
      return request<CalendarAuthorizationResponse>(`/api/v1/user/${userId}/calendar/connect`, {
        method: 'POST',
      });
    },
    disconnectCalendar(userId: string) {
      return request<{ success: boolean }>(`/api/v1/user/${userId}/calendar/disconnect`, {
        method: 'POST',
      });
    },
    reconnectCalendar(userId: string) {
      return request<CalendarAuthorizationResponse>(`/api/v1/user/${userId}/calendar/reconnect`, {
        method: 'POST',
      });
    },
    healthCheckCalendar(userId: string) {
      return request<CalendarConnectionRecord>(`/api/v1/user/${userId}/calendar/health-check`, {
        method: 'POST',
      });
    },
    listMeetings(
      userId: string,
      query: {
        status?: string;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
      },
    ) {
      return request<MeetingListResponse>(`/api/v1/user/${userId}/meetings`, { query });
    },
    getMeetingStats(userId: string) {
      return request<MeetingStats>(`/api/v1/user/${userId}/meetings/stats`);
    },
    getMeeting(userId: string, meetingId: string) {
      return request<MeetingDetail>(`/api/v1/user/${userId}/meetings/${meetingId}`);
    },
  },
};
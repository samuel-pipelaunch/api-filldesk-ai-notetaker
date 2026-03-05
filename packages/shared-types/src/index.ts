export type TimestampString = string;

export interface Organization {
  id: string;
  name: string;
  recallRegion: string;
  createdAt: TimestampString;
  updatedAt: TimestampString;
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  orgId: string;
  email: string;
  sfUserId: string;
  sfOrgId: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export type LicenseStatus = 'active' | 'revoked';

export interface License {
  id: string;
  orgId: string;
  userId: string;
  status: LicenseStatus;
  grantedAt: TimestampString;
  revokedAt: TimestampString | null;
}

export type TranscriptionProvider = 'recall' | 'assembly_ai' | 'deepgram' | 'aws_transcribe';

export interface AutomaticLeaveConfig {
  enabled: boolean;
  leaveAfterMinutes: number;
}

export interface BotSettings {
  orgId: string;
  userId?: string;
  botName: string;
  autoRecord: boolean;
  recordExternal: boolean;
  recordInternal: boolean;
  automaticLeave: AutomaticLeaveConfig;
  transcriptionProvider: TranscriptionProvider;
}

export type GoogleCalendarConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'insufficient_permissions'
  | 'expired';

export interface GoogleCalendarConnection {
  id: string;
  userId: string;
  calendarId: string;
  status: GoogleCalendarConnectionStatus;
  scopes: string[];
  connectedAt: TimestampString;
  lastCheckedAt: TimestampString;
  lastErrorCode: string | null;
}

export type MeetingStatus =
  | 'scheduled'
  | 'joining'
  | 'recording'
  | 'transcribing'
  | 'done'
  | 'failed';

export interface Meeting {
  id: string;
  orgId: string;
  userId: string;
  recallBotId: string;
  meetingUrl: string;
  title: string;
  status: MeetingStatus;
  scheduledStart: TimestampString;
  scheduledEnd: TimestampString;
  actualStart: TimestampString | null;
  actualEnd: TimestampString | null;
}

export type WebhookProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface WebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signatureValid: boolean;
  processingStatus: WebhookProcessingStatus;
  receivedAt: TimestampString;
  processedAt: TimestampString | null;
}

export interface TranscriptSegment {
  id: string;
  meetingId: string;
  speaker: string;
  speakerId: string | null;
  text: string;
  startTime: number;
  endTime: number;
  language: string;
  sequenceNumber: number;
}

export interface TranscriptionConfig {
  provider: TranscriptionProvider;
  isDefault: boolean;
}
export type RecallRegion = 'us-east-1' | 'eu-central-1';

export interface TimeoutConfig {
  timeout: number;
  activate_after?: number;
}

export interface BotDetectionConfig {
  using_participant_events?: TimeoutConfig;
  using_participant_names?: TimeoutConfig & {
    matches?: string[];
  };
}

export interface AutomaticLeaveConfig {
  silence_detection?: TimeoutConfig;
  bot_detection?: BotDetectionConfig;
  everyone_left_timeout?: TimeoutConfig;
  waiting_room_timeout?: number;
  noone_joined_timeout?: number;
  in_call_not_recording_timeout?: number;
  in_call_recording_timeout?: number;
  recording_permission_denied_timeout?: number;
}

export interface CreateBotRequest {
  meeting_url: string;
  bot_name: string;
  join_at?: string;
  automatic_leave?: AutomaticLeaveConfig;
  recording_config?: Record<string, unknown>;
  transcription_options?: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface BotStatusChange {
  code: string;
  message?: string;
  created_at: string;
}

export interface Bot {
  id: string;
  meeting_url?: string;
  bot_name?: string;
  join_at?: string;
  metadata?: Record<string, string>;
  status_changes?: BotStatusChange[];
  recording_config?: Record<string, unknown>;
  transcription_options?: Record<string, unknown>;
  video_url?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CreateCalendarRequest {
  platform: 'google_calendar' | 'microsoft_outlook';
  oauth_client_id: string;
  oauth_client_secret: string;
  oauth_refresh_token: string;
}

export interface Calendar {
  id: string;
  platform: string;
  status?: string;
  connected_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CalendarEvent {
  id: string;
  calendar_id?: string;
  start_time?: string;
  end_time?: string;
  meeting_url?: string;
  title?: string;
  is_deleted?: boolean;
  raw?: Record<string, unknown>;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ScheduleBotRequest {
  deduplication_key: string;
  bot_config: CreateBotRequest;
}

export interface TranscriptWord {
  text: string;
  start_time: number;
  end_time: number;
  confidence?: number;
}

export interface TranscriptSegment {
  speaker?: string;
  speaker_id?: number;
  words: TranscriptWord[];
  is_final: boolean;
  language?: string;
}

export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ListBotsParams {
  join_at_after?: string;
  join_at_before?: string;
  metadata__tenant_id?: string;
  metadata__user_id?: string;
  limit?: number;
  offset?: number;
}

export interface ListCalendarEventsParams {
  calendar_id?: string;
  updated_at__gte?: string;
  updated_at__lte?: string;
  is_deleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

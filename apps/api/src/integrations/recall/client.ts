import type { FastifyBaseLogger } from 'fastify';

import {
  type Bot,
  type Calendar,
  type CalendarEvent,
  type CreateBotRequest,
  type CreateCalendarRequest,
  type ListBotsParams,
  type ListCalendarEventsParams,
  type PaginatedResponse,
  type RecallRegion,
  type ScheduleBotRequest,
  type TranscriptSegment,
} from './types.js';

interface RecallClientOptions {
  apiKey: string;
  region: RecallRegion;
  logger?: FastifyBaseLogger;
}

type QueryParamValue = string | number | boolean | undefined;

export class RecallApiError extends Error {
  public readonly statusCode: number;
  public readonly endpoint: string;
  public readonly details?: unknown;

  public constructor(params: {
    message: string;
    statusCode: number;
    endpoint: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'RecallApiError';
    this.statusCode = params.statusCode;
    this.endpoint = params.endpoint;
    this.details = params.details;
  }
}

function parseErrorMessage(body: unknown, statusText: string): string {
  if (typeof body === 'object' && body !== null) {
    const error = (body as Record<string, unknown>).error;
    if (typeof error === 'string') {
      return error;
    }

    const detail = (body as Record<string, unknown>).detail;
    if (typeof detail === 'string') {
      return detail;
    }

    const message = (body as Record<string, unknown>).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return statusText || 'Recall API request failed';
}

function buildQueryString<T extends object>(params?: T): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params as Record<string, QueryParamValue>)) {
    if (value === undefined) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `?${queryString}` : '';
}

export class RecallClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger?: FastifyBaseLogger;

  public constructor(options: RecallClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = `https://${options.region}.recall.ai`;
    this.logger = options.logger;
  }

  public async createBot(config: CreateBotRequest): Promise<Bot> {
    return this.request<Bot>('/api/v1/bot/', {
      method: 'POST',
      body: config,
    });
  }

  public async getBot(botId: string): Promise<Bot> {
    return this.request<Bot>(`/api/v1/bot/${encodeURIComponent(botId)}/`, {
      method: 'GET',
    });
  }

  public async listBots(params?: ListBotsParams): Promise<PaginatedResponse<Bot>> {
    return this.request<PaginatedResponse<Bot>>(`/api/v1/bot/${buildQueryString(params)}`, {
      method: 'GET',
    });
  }

  public async deleteBot(botId: string): Promise<void> {
    await this.request<void>(`/api/v1/bot/${encodeURIComponent(botId)}/`, {
      method: 'DELETE',
    });
  }

  public async leaveCall(botId: string): Promise<void> {
    await this.request<void>(`/api/v1/bot/${encodeURIComponent(botId)}/leave_call/`, {
      method: 'POST',
    });
  }

  public async getBotTranscript(botId: string): Promise<TranscriptSegment[]> {
    return this.request<TranscriptSegment[]>(`/api/v1/bot/${encodeURIComponent(botId)}/transcript/`, {
      method: 'GET',
    });
  }

  public async createCalendar(config: CreateCalendarRequest): Promise<Calendar> {
    return this.request<Calendar>('/api/v2/calendars/', {
      method: 'POST',
      body: config,
    });
  }

  public async getCalendar(calendarId: string): Promise<Calendar> {
    return this.request<Calendar>(`/api/v2/calendars/${encodeURIComponent(calendarId)}/`, {
      method: 'GET',
    });
  }

  public async deleteCalendar(calendarId: string): Promise<void> {
    await this.request<void>(`/api/v2/calendars/${encodeURIComponent(calendarId)}/`, {
      method: 'DELETE',
    });
  }

  public async listCalendarEvents(
    params?: ListCalendarEventsParams,
  ): Promise<PaginatedResponse<CalendarEvent>> {
    return this.request<PaginatedResponse<CalendarEvent>>(
      `/api/v2/calendar-events/${buildQueryString(params)}`,
      {
        method: 'GET',
      },
    );
  }

  public async scheduleBotForEvent(eventId: string, config: ScheduleBotRequest): Promise<void> {
    await this.request<void>(`/api/v2/calendar-events/${encodeURIComponent(eventId)}/bot/`, {
      method: 'POST',
      body: config,
    });
  }

  public async deleteBotFromEvent(eventId: string): Promise<void> {
    await this.request<void>(`/api/v2/calendar-events/${encodeURIComponent(eventId)}/bot/`, {
      method: 'DELETE',
    });
  }

  private async request<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'DELETE';
      body?: unknown;
    },
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const startedAt = Date.now();

    this.logger?.debug(
      {
        integration: 'recall',
        method: options.method,
        endpoint,
        hasBody: options.body !== undefined,
        auth: 'Token [REDACTED]',
      },
      'Recall API request started',
    );

    const response = await fetch(url, {
      method: options.method,
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const elapsedMs = Date.now() - startedAt;
    const text = await response.text();
    const parsed = text.length > 0 ? this.tryParseJson(text) : null;

    if (!response.ok) {
      const message = parseErrorMessage(parsed, response.statusText);

      this.logger?.error(
        {
          integration: 'recall',
          method: options.method,
          endpoint,
          statusCode: response.status,
          elapsedMs,
          errorBody: parsed,
        },
        'Recall API request failed',
      );

      throw new RecallApiError({
        message: `Recall API error (${response.status}) for ${endpoint}: ${message}`,
        statusCode: response.status,
        endpoint,
        details: parsed,
      });
    }

    this.logger?.debug(
      {
        integration: 'recall',
        method: options.method,
        endpoint,
        statusCode: response.status,
        elapsedMs,
      },
      'Recall API request completed',
    );

    if (response.status === 204 || text.length === 0) {
      return undefined as T;
    }

    return parsed as T;
  }

  private tryParseJson(body: string): unknown {
    try {
      return JSON.parse(body);
    } catch {
      return {
        raw: body,
      };
    }
  }
}

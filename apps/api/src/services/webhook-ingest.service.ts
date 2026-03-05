import { eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { z } from 'zod';

import { webhookEvents } from '../db/schema/webhook-events.js';
import { meetings } from '../db/schema/meetings.js';
import { googleCalendarConnections } from '../db/schema/google-calendar-connections.js';
import { type Db } from '../db/client.js';
import type { RecallClient } from '../integrations/recall/client.js';
import type { WebhookPayload } from '../integrations/recall/types.js';
import { internalError, notFound } from '../lib/http-error.js';
import { MeetingSyncService } from './meeting-sync.service.js';

interface WebhookIngestServiceOptions {
  db: Db;
  logger: FastifyBaseLogger;
  recall: RecallClient;
  meetingSyncService: MeetingSyncService;
}

const webhookPayloadSchema = z.object({
  event: z.string(),
  data: z.record(z.unknown()),
});

function getPayloadField(payload: WebhookPayload, key: string): unknown {
  return payload.data[key];
}

function mapBotStatusToMeetingStatus(code: string):
  | 'joining'
  | 'recording'
  | 'processing'
  | 'done'
  | 'failed'
  | 'cancelled' {
  if (code === 'joining_call' || code === 'joining') {
    return 'joining';
  }

  if (code === 'in_call_recording' || code === 'recording') {
    return 'recording';
  }

  if (code === 'done') {
    return 'done';
  }

  if (code === 'fatal' || code === 'failed' || code === 'error') {
    return 'failed';
  }

  if (code === 'left_call' || code === 'cancelled') {
    return 'cancelled';
  }

  return 'processing';
}

export class WebhookIngestService {
  private readonly db: Db;
  private readonly logger: FastifyBaseLogger;
  private readonly recall: RecallClient;
  private readonly meetingSyncService: MeetingSyncService;

  public constructor(options: WebhookIngestServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
    this.recall = options.recall;
    this.meetingSyncService = options.meetingSyncService;
  }

  public async processWebhookEvent(eventId: string): Promise<void> {
    const event = await this.db.query.webhookEvents.findFirst({
      where: (table, operators) => operators.eq(table.id, eventId),
    });

    if (!event) {
      throw notFound('Webhook event not found');
    }

    await this.db
      .update(webhookEvents)
      .set({
        processingStatus: 'processing',
        attempts: event.attempts + 1,
      })
      .where(eq(webhookEvents.id, event.id));

    try {
      const payload = webhookPayloadSchema.parse(event.payload) as WebhookPayload;

      if (event.eventType.startsWith('calendar.')) {
        if (event.eventType === 'calendar.update') {
          await this.handleCalendarUpdate(payload);
        }

        if (event.eventType === 'calendar.sync_events') {
          await this.handleCalendarSyncEvents(payload);
        }
      } else {
        await this.handleBotStatusChange(payload);
      }

      await this.db
        .update(webhookEvents)
        .set({
          processingStatus: 'completed',
          processingError: null,
          processedAt: new Date(),
        })
        .where(eq(webhookEvents.id, event.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';

      await this.db
        .update(webhookEvents)
        .set({
          processingStatus: 'failed',
          processingError: message,
          processedAt: new Date(),
        })
        .where(eq(webhookEvents.id, event.id));

      this.logger.error({ err: error, webhookEventId: eventId }, 'Webhook processing failed');
      throw internalError('Webhook event processing failed');
    }
  }

  public async handleBotStatusChange(payload: WebhookPayload): Promise<void> {
    const data = payload.data;
    const botPayload = typeof data.bot === 'object' && data.bot !== null ? data.bot : null;
    const botIdRaw =
      (botPayload as Record<string, unknown> | null)?.id ?? getPayloadField(payload, 'bot_id');
    const statusRaw =
      getPayloadField(payload, 'code') ??
      (typeof data.status === 'string' ? data.status : undefined) ??
      (typeof data.status_code === 'string' ? data.status_code : undefined);

    if (typeof botIdRaw !== 'string' || typeof statusRaw !== 'string') {
      this.logger.warn({ payload }, 'Skipping bot status webhook due to missing botId/status');
      return;
    }

    const meetingStatus = mapBotStatusToMeetingStatus(statusRaw);

    await this.db
      .update(meetings)
      .set({
        status: meetingStatus,
        failureReason: meetingStatus === 'failed' ? statusRaw : null,
        actualEnd: meetingStatus === 'done' || meetingStatus === 'cancelled' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(meetings.recallBotId, botIdRaw));
  }

  public async handleCalendarUpdate(payload: WebhookPayload): Promise<void> {
    const calendarId = getPayloadField(payload, 'calendar_id');
    if (typeof calendarId !== 'string') {
      this.logger.warn({ payload }, 'Skipping calendar.update due to missing calendar_id');
      return;
    }

    const recallCalendar = await this.recall.getCalendar(calendarId);
    const recallStatus = typeof recallCalendar.status === 'string' ? recallCalendar.status : 'error';
    const mappedStatus =
      recallStatus === 'connected' ||
      recallStatus === 'disconnected' ||
      recallStatus === 'insufficient_permissions' ||
      recallStatus === 'expired'
        ? recallStatus
        : 'error';

    await this.db
      .update(googleCalendarConnections)
      .set({
        status: mappedStatus,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.recallCalendarId, calendarId));
  }

  public async handleCalendarSyncEvents(payload: WebhookPayload): Promise<void> {
    const calendarId = getPayloadField(payload, 'calendar_id');
    const lastUpdatedTs = getPayloadField(payload, 'last_updated_ts');

    if (typeof calendarId !== 'string' || typeof lastUpdatedTs !== 'string') {
      this.logger.warn({ payload }, 'Skipping calendar.sync_events due to missing fields');
      return;
    }

    await this.meetingSyncService.syncCalendarEvents(calendarId, lastUpdatedTs);
  }
}

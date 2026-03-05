import { eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import { meetings } from '../db/schema/meetings.js';
import { type Db } from '../db/client.js';
import type { RecallClient } from '../integrations/recall/client.js';
import type { CreateBotRequest } from '../integrations/recall/types.js';
import { notFound } from '../lib/http-error.js';
import {
  UserSettingsService,
  type ResolvedBotSettings,
} from './user-settings.service.js';

interface MeetingSyncServiceOptions {
  db: Db;
  recall: RecallClient;
  logger: FastifyBaseLogger;
}

function toCreateBotConfig(settings: ResolvedBotSettings): CreateBotRequest {
  return {
    meeting_url: '',
    bot_name: settings.botName,
    automatic_leave: {
      waiting_room_timeout: settings.waitingRoomTimeout,
      noone_joined_timeout: settings.nooneJoinedTimeout,
      everyone_left_timeout: {
        timeout: settings.everyoneLeftTimeout,
        activate_after: 0,
      },
      in_call_recording_timeout: settings.maxMeetingDuration,
    },
    recording_config: settings.autoRecord
      ? {
          video_mixed_mp4: {},
        }
      : undefined,
  };
}

export class MeetingSyncService {
  private readonly db: Db;
  private readonly recall: RecallClient;
  private readonly logger: FastifyBaseLogger;
  private readonly userSettingsService: UserSettingsService;

  public constructor(options: MeetingSyncServiceOptions) {
    this.db = options.db;
    this.recall = options.recall;
    this.logger = options.logger;
    this.userSettingsService = new UserSettingsService({ db: options.db });
  }

  public async syncCalendarEvents(calendarId: string, lastUpdatedTs: string): Promise<void> {
    const connection = await this.db.query.googleCalendarConnections.findFirst({
      where: (table, operators) => operators.eq(table.recallCalendarId, calendarId),
    });

    if (!connection) {
      this.logger.warn({ calendarId }, 'No calendar connection found for Recall calendar ID');
      return;
    }

    const response = await this.recall.listCalendarEvents({
      calendar_id: calendarId,
      updated_at__gte: lastUpdatedTs,
    });

    for (const event of response.results) {
      const existingMeeting = await this.db.query.meetings.findFirst({
        where: (table, operators) => operators.eq(table.recallCalendarEventId, event.id),
      });

      const payload = {
        orgId: connection.orgId,
        userId: connection.userId,
        recallCalendarEventId: event.id,
        meetingUrl: event.meeting_url ?? null,
        title: event.title ?? null,
        scheduledStart: event.start_time ? new Date(event.start_time) : null,
        scheduledEnd: event.end_time ? new Date(event.end_time) : null,
        status: event.is_deleted ? ('cancelled' as const) : ('scheduled' as const),
        updatedAt: new Date(),
      };

      if (existingMeeting) {
        await this.db.update(meetings).set(payload).where(eq(meetings.id, existingMeeting.id));
      } else {
        await this.db.insert(meetings).values({
          ...payload,
          createdAt: new Date(),
        });
      }
    }
  }

  public async scheduleBotForMeeting(meetingId: string): Promise<void> {
    const meeting = await this.db.query.meetings.findFirst({
      where: (table, operators) => operators.eq(table.id, meetingId),
    });

    if (!meeting) {
      throw notFound('Meeting not found');
    }

    if (!meeting.recallCalendarEventId) {
      throw notFound('Meeting does not have a linked Recall calendar event');
    }

    const settings = await this.getEffectiveSettings(meeting.userId, meeting.orgId);
    const botConfig = toCreateBotConfig(settings);

    await this.recall.scheduleBotForEvent(meeting.recallCalendarEventId, {
      deduplication_key: meeting.id,
      bot_config: {
        ...botConfig,
        meeting_url: meeting.meetingUrl ?? '',
      },
    });

    await this.db
      .update(meetings)
      .set({
        botConfigSnapshot: botConfig as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meeting.id));
  }

  public async cancelBotForMeeting(meetingId: string): Promise<void> {
    const meeting = await this.db.query.meetings.findFirst({
      where: (table, operators) => operators.eq(table.id, meetingId),
    });

    if (!meeting) {
      throw notFound('Meeting not found');
    }

    if (!meeting.recallCalendarEventId) {
      return;
    }

    await this.recall.deleteBotFromEvent(meeting.recallCalendarEventId);
  }

  public async getEffectiveSettings(userId: string, orgId: string): Promise<ResolvedBotSettings> {
    return this.userSettingsService.getEffectiveSettings(userId, orgId);
  }
}

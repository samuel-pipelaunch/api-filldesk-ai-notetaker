import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { InferSelectModel, SQL } from 'drizzle-orm';

import type { Db } from '../db/client.js';
import { meetings } from '../db/schema/meetings.js';
import { transcriptSegments } from '../db/schema/transcript-segments.js';
import { notFound } from '../lib/http-error.js';

export type Meeting = InferSelectModel<typeof meetings>;
export type TranscriptSegment = InferSelectModel<typeof transcriptSegments>;

export type MeetingWithTranscript = Meeting & {
  transcriptSegments: TranscriptSegment[];
};

interface ListMeetingsParams {
  status?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

interface MeetingServiceConfig {
  db: Db;
}

function buildMeetingFilters(
  userId: string,
  orgId: string,
  params?: ListMeetingsParams,
): SQL<unknown> {
  const filters: SQL<unknown>[] = [eq(meetings.userId, userId), eq(meetings.orgId, orgId)];

  if (params?.status) {
    filters.push(eq(meetings.status, params.status as Meeting['status']));
  }

  if (params?.from) {
    filters.push(gte(meetings.scheduledStart, params.from));
  }

  if (params?.to) {
    filters.push(lte(meetings.scheduledStart, params.to));
  }

  return and(...filters) as SQL<unknown>;
}

export class MeetingService {
  private readonly db: Db;

  public constructor(config: MeetingServiceConfig) {
    this.db = config.db;
  }

  public async listMeetings(
    userId: string,
    orgId: string,
    params?: ListMeetingsParams,
  ): Promise<{ meetings: Meeting[]; total: number }> {
    const whereClause = buildMeetingFilters(userId, orgId, params);
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;

    const [meetingRows, countRows] = await Promise.all([
      this.db
        .select()
        .from(meetings)
        .where(whereClause)
        .orderBy(desc(meetings.scheduledStart), desc(meetings.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({
          total: sql<number>`count(*)`.mapWith(Number),
        })
        .from(meetings)
        .where(whereClause),
    ]);

    return {
      meetings: meetingRows,
      total: countRows[0]?.total ?? 0,
    };
  }

  public async getMeeting(meetingId: string, userId: string): Promise<MeetingWithTranscript> {
    const [meeting] = await this.db
      .select()
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)))
      .limit(1);

    if (!meeting) {
      throw notFound('Meeting not found');
    }

    const segments = await this.db
      .select()
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meeting.id))
      .orderBy(transcriptSegments.sequenceNumber);

    return {
      ...meeting,
      transcriptSegments: segments,
    };
  }

  public async getMeetingStats(
    userId: string,
    orgId: string,
  ): Promise<{ total: number; recorded: number; scheduled: number; failed: number }> {
    const [statsRow] = await this.db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        recorded: sql<number>`coalesce(sum(case when ${meetings.status} = 'done' then 1 else 0 end), 0)`.mapWith(
          Number,
        ),
        scheduled: sql<number>`coalesce(sum(case when ${meetings.status} = 'scheduled' then 1 else 0 end), 0)`.mapWith(
          Number,
        ),
        failed: sql<number>`coalesce(sum(case when ${meetings.status} = 'failed' then 1 else 0 end), 0)`.mapWith(
          Number,
        ),
      })
      .from(meetings)
      .where(and(eq(meetings.userId, userId), eq(meetings.orgId, orgId)));

    return {
      total: statsRow?.total ?? 0,
      recorded: statsRow?.recorded ?? 0,
      scheduled: statsRow?.scheduled ?? 0,
      failed: statsRow?.failed ?? 0,
    };
  }
}

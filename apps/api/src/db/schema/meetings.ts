import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { organizations } from './organizations.js';
import { users } from './users.js';

export const meetings = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    recallBotId: varchar('recall_bot_id', { length: 255 }),
    recallCalendarEventId: varchar('recall_calendar_event_id', { length: 255 }),
    meetingUrl: text('meeting_url'),
    title: varchar('title', { length: 500 }),
    status: varchar('status', {
      length: 30,
      enum: [
        'scheduled',
        'joining',
        'recording',
        'processing',
        'transcribing',
        'done',
        'failed',
        'cancelled',
      ],
    })
      .notNull()
      .default('scheduled'),
    failureReason: text('failure_reason'),
    scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
    scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
    actualStart: timestamp('actual_start', { withTimezone: true }),
    actualEnd: timestamp('actual_end', { withTimezone: true }),
    botConfigSnapshot: jsonb('bot_config_snapshot').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('meetings_org_id_user_id_idx').on(table.orgId, table.userId),
    index('meetings_recall_bot_id_idx').on(table.recallBotId),
    index('meetings_status_idx').on(table.status),
    index('meetings_scheduled_start_idx').on(table.scheduledStart),
  ],
);

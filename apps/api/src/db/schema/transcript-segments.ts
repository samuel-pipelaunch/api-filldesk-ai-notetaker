import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { meetings } from './meetings.js';

export const transcriptSegments = pgTable(
  'transcript_segments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id),
    speaker: varchar('speaker', { length: 255 }),
    speakerId: integer('speaker_id'),
    text: text('text').notNull(),
    startTime: real('start_time').notNull(),
    endTime: real('end_time').notNull(),
    confidence: real('confidence'),
    language: varchar('language', { length: 10 }),
    isFinal: boolean('is_final').notNull().default(true),
    sequenceNumber: integer('sequence_number').notNull(),
  },
  (table) => [
    index('transcript_segments_meeting_id_idx').on(table.meetingId),
    uniqueIndex('transcript_segments_meeting_id_sequence_number_unique').on(
      table.meetingId,
      table.sequenceNumber,
    ),
  ],
);

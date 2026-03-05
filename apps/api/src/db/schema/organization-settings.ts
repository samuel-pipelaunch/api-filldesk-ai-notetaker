import { sql } from 'drizzle-orm';
import { boolean, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { organizations } from './organizations.js';

export const organizationSettings = pgTable('organization_settings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id)
    .unique('organization_settings_org_id_unique'),
  botName: varchar('bot_name', { length: 100 }).notNull().default('FillDesk Notetaker'),
  autoRecord: boolean('auto_record').notNull().default(true),
  recordExternalMeetings: boolean('record_external_meetings').notNull().default(true),
  recordInternalMeetings: boolean('record_internal_meetings').notNull().default(false),
  waitingRoomTimeout: integer('waiting_room_timeout').notNull().default(1200),
  nooneJoinedTimeout: integer('noone_joined_timeout').notNull().default(1200),
  everyoneLeftTimeout: integer('everyone_left_timeout').notNull().default(2),
  maxMeetingDuration: integer('max_meeting_duration').notNull().default(14_400),
  transcriptionProvider: varchar('transcription_provider', {
    length: 50,
    enum: ['recall', 'assembly_ai', 'deepgram', 'aws_transcribe'],
  })
    .notNull()
    .default('recall'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

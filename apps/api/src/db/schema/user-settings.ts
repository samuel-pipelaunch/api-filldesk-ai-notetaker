import { sql } from 'drizzle-orm';
import { boolean, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { organizations } from './organizations.js';
import { users } from './users.js';

export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id)
    .unique('user_settings_user_id_unique'),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id),
  botName: varchar('bot_name', { length: 100 }),
  autoRecord: boolean('auto_record'),
  recordExternalMeetings: boolean('record_external_meetings'),
  recordInternalMeetings: boolean('record_internal_meetings'),
  waitingRoomTimeout: integer('waiting_room_timeout'),
  nooneJoinedTimeout: integer('noone_joined_timeout'),
  everyoneLeftTimeout: integer('everyone_left_timeout'),
  maxMeetingDuration: integer('max_meeting_duration'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

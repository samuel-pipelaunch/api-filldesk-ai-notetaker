import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { organizations } from './organizations.js';
import { users } from './users.js';

export const googleCalendarConnections = pgTable(
  'google_calendar_connections',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id)
      .unique('google_calendar_connections_user_id_unique'),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    recallCalendarId: varchar('recall_calendar_id', { length: 255 }),
    googleEmail: varchar('google_email', { length: 320 }),
    status: varchar('status', {
      length: 50,
      enum: [
        'pending',
        'connected',
        'disconnected',
        'insufficient_permissions',
        'expired',
        'error',
      ],
    })
      .notNull()
      .default('pending'),
    scopesGranted: text('scopes_granted').array(),
    hasCalendarEventsScope: boolean('has_calendar_events_scope').notNull().default(false),
    oauthState: varchar('oauth_state', { length: 255 }),
    lastErrorCode: varchar('last_error_code', { length: 100 }),
    lastErrorMessage: text('last_error_message'),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('google_calendar_connections_status_idx').on(table.status)],
);

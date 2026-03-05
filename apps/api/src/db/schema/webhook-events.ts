import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    webhookId: varchar('webhook_id', { length: 255 }).notNull().unique('webhook_events_webhook_id_unique'),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    signatureValid: boolean('signature_valid').notNull(),
    processingStatus: varchar('processing_status', {
      length: 20,
      enum: ['pending', 'processing', 'completed', 'failed'],
    })
      .notNull()
      .default('pending'),
    processingError: text('processing_error'),
    attempts: integer('attempts').notNull().default(0),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    index('webhook_events_event_type_idx').on(table.eventType),
    index('webhook_events_processing_status_idx').on(table.processingStatus),
  ],
);

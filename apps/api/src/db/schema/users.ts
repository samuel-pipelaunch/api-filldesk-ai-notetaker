import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { organizations } from './organizations.js';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    // Email remains the stable cross-environment identifier even when Salesforce IDs are cloned in sandboxes.
    email: varchar('email', { length: 320 }).notNull(),
    sfUserId: varchar('sf_user_id', { length: 18 }),
    sfOrgId: varchar('sf_org_id', { length: 18 }),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 20, enum: ['admin', 'user'] }).notNull().default('user'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_org_id_email_unique').on(table.orgId, table.email),
    index('users_sf_user_id_idx').on(table.sfUserId),
    uniqueIndex('users_org_id_sf_user_id_unique')
      .on(table.orgId, table.sfUserId)
      .where(sql`${table.sfUserId} is not null`),
  ],
);

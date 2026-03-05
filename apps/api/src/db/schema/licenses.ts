import { sql } from 'drizzle-orm';
import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { organizations } from './organizations.js';
import { users } from './users.js';

export const licenses = pgTable(
  'licenses',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    status: varchar('status', { length: 20, enum: ['active', 'revoked'] }).notNull().default('active'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    grantedBy: uuid('granted_by').references(() => users.id),
  },
  (table) => [
    uniqueIndex('licenses_org_id_user_id_active_unique')
      .on(table.orgId, table.userId)
      .where(sql`${table.status} = 'active'`),
  ],
);

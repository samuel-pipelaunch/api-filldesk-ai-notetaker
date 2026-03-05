import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { schema } from './schema/index.js';

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);
  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;

import type { FastifyPluginAsync } from 'fastify';

import { createDb, type Db } from '../db/client.js';

export const databasePlugin: FastifyPluginAsync = async (app): Promise<void> => {
  const db = createDb(app.config.DATABASE_URL);
  app.decorate('db', db);
};

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

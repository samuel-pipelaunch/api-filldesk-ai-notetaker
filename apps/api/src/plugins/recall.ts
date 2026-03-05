import type { FastifyPluginAsync } from 'fastify';

import { RecallClient } from '../integrations/recall/client.js';

export const recallPlugin: FastifyPluginAsync = async (app): Promise<void> => {
  const recallClient = new RecallClient({
    apiKey: app.config.RECALL_API_KEY,
    region: app.config.RECALL_REGION,
    logger: app.log.child({ integration: 'recall' }),
  });

  app.decorate('recall', recallClient);
};

declare module 'fastify' {
  interface FastifyInstance {
    recall: RecallClient;
  }
}

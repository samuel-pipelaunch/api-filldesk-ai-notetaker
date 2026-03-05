import type { FastifyPluginAsync } from 'fastify';

export const healthRoute: FastifyPluginAsync = async (app): Promise<void> => {
  app.get('/health', async () => {
    return {
      status: 'ok',
      stage: app.config.STAGE,
      timestamp: new Date().toISOString(),
    };
  });
};

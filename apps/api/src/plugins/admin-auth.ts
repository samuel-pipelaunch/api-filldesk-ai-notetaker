import type { FastifyPluginAsync } from 'fastify';

import { unauthorized } from '../lib/http-error.js';

function getAdminKeyHeaderValue(header: string | string[] | undefined): string | undefined {
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

export const adminAuthPlugin: FastifyPluginAsync = async (app): Promise<void> => {
  app.addHook('onRequest', async (request): Promise<void> => {
    // Temporary internal auth until proper user/session auth is implemented.
    const providedAdminKey = getAdminKeyHeaderValue(request.headers['x-admin-key']);

    if (!providedAdminKey || providedAdminKey !== app.config.INTERNAL_ADMIN_KEY) {
      throw unauthorized('Invalid admin credentials');
    }
  });
};

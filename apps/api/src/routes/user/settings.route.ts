import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { validateBody, validateParams } from '../../lib/validation.js';
import { UserSettingsService } from '../../services/user-settings.service.js';

const userParamsSchema = z.object({
  userId: z.string().uuid(),
});

const updateUserSettingsBodySchema = z
  .object({
    botName: z.string().min(1).max(100).nullable().optional(),
    autoRecord: z.boolean().nullable().optional(),
    recordExternalMeetings: z.boolean().nullable().optional(),
    recordInternalMeetings: z.boolean().nullable().optional(),
    waitingRoomTimeout: z.number().int().min(0).nullable().optional(),
    nooneJoinedTimeout: z.number().int().min(0).nullable().optional(),
    everyoneLeftTimeout: z.number().int().min(0).nullable().optional(),
    maxMeetingDuration: z.number().int().min(0).nullable().optional(),
  })
  .strict();

export const userSettingsRoute: FastifyPluginAsync = async (app): Promise<void> => {
  const userSettingsService = new UserSettingsService({ db: app.db });

  app.get('/:userId/settings', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    return userSettingsService.getUserSettings(userId);
  });

  app.get('/:userId/settings/effective', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    return userSettingsService.getEffectiveSettings(userId, request.userContext.org.id);
  });

  app.patch('/:userId/settings', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    const body = validateBody(updateUserSettingsBodySchema, request.body);

    return userSettingsService.updateUserSettings(userId, request.userContext.org.id, body);
  });

  app.delete('/:userId/settings', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    await userSettingsService.resetUserSettings(userId);

    return { success: true };
  });
};

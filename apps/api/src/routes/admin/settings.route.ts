import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { validateBody, validateParams } from '../../lib/validation.js';
import { OrganizationSettingsService } from '../../services/organization-settings.service.js';

const orgParamsSchema = z.object({
  orgId: z.string().uuid(),
});

const updateSettingsBodySchema = z
  .object({
    botName: z.string().trim().min(1).max(100).optional(),
    autoRecord: z.boolean().optional(),
    recordExternalMeetings: z.boolean().optional(),
    recordInternalMeetings: z.boolean().optional(),
    waitingRoomTimeout: z.number().int().positive().optional(),
    nooneJoinedTimeout: z.number().int().positive().optional(),
    everyoneLeftTimeout: z.number().int().positive().optional(),
    maxMeetingDuration: z.number().int().positive().optional(),
    transcriptionProvider: z
      .enum(['recall', 'assembly_ai', 'deepgram', 'aws_transcribe'])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const adminSettingsRoute: FastifyPluginAsync = async (app): Promise<void> => {
  const organizationSettingsService = new OrganizationSettingsService({
    db: app.db,
    logger: app.log,
  });

  app.get('/organizations/:orgId/settings', async (request) => {
    const { orgId } = validateParams(orgParamsSchema, request.params);
    return organizationSettingsService.getSettings(orgId);
  });

  app.patch('/organizations/:orgId/settings', async (request) => {
    const { orgId } = validateParams(orgParamsSchema, request.params);
    const body = validateBody(updateSettingsBodySchema, request.body);

    return organizationSettingsService.updateSettings(orgId, body);
  });
};

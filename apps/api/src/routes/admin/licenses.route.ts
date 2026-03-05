import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { validateBody, validateParams } from '../../lib/validation.js';
import { LicenseService } from '../../services/license.service.js';

const orgParamsSchema = z.object({
  orgId: z.string().uuid(),
});

const orgUserParamsSchema = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
});

const grantLicenseBodySchema = z.object({
  userId: z.string().uuid(),
});

export const adminLicensesRoute: FastifyPluginAsync = async (app): Promise<void> => {
  const licenseService = new LicenseService({
    db: app.db,
    logger: app.log,
  });

  app.post('/organizations/:orgId/licenses', async (request, reply) => {
    const { orgId } = validateParams(orgParamsSchema, request.params);
    const { userId } = validateBody(grantLicenseBodySchema, request.body);

    const license = await licenseService.grantLicense(orgId, userId);
    return reply.status(201).send(license);
  });

  app.delete('/organizations/:orgId/licenses/:userId', async (request) => {
    const { orgId, userId } = validateParams(orgUserParamsSchema, request.params);
    return licenseService.revokeLicense(orgId, userId);
  });

  app.get('/organizations/:orgId/licenses', async (request) => {
    const { orgId } = validateParams(orgParamsSchema, request.params);
    return licenseService.listLicenses(orgId);
  });

  app.get('/organizations/:orgId/licenses/summary', async (request) => {
    const { orgId } = validateParams(orgParamsSchema, request.params);
    return licenseService.getLicenseSummary(orgId);
  });
};

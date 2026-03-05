import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { validateBody, validateParams } from '../../lib/validation.js';
import { OrganizationService } from '../../services/organization.service.js';

const createOrganizationBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  recallRegion: z.enum(['us-east-1', 'eu-central-1']).optional(),
});

const organizationParamsSchema = z.object({
  orgId: z.string().uuid(),
});

const updateOrganizationBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    recallRegion: z.enum(['us-east-1', 'eu-central-1']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const adminOrganizationsRoute: FastifyPluginAsync = async (app): Promise<void> => {
  const organizationService = new OrganizationService({
    db: app.db,
    logger: app.log,
  });

  app.post('/organizations', async (request, reply) => {
    const body = validateBody(createOrganizationBodySchema, request.body);
    const organization = await organizationService.createOrganization(body);

    app.log.info({ orgId: organization.id }, 'Admin API created organization');
    return reply.status(201).send(organization);
  });

  app.get('/organizations', async () => {
    return organizationService.listOrganizations();
  });

  app.get('/organizations/:orgId', async (request) => {
    const { orgId } = validateParams(organizationParamsSchema, request.params);
    return organizationService.getOrganization(orgId);
  });

  app.patch('/organizations/:orgId', async (request) => {
    const { orgId } = validateParams(organizationParamsSchema, request.params);
    const body = validateBody(updateOrganizationBodySchema, request.body);

    return organizationService.updateOrganization(orgId, body);
  });
};

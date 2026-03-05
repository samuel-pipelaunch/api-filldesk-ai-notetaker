import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { validateBody, validateParams, validateQuery } from '../../lib/validation.js';
import { UserImportService } from '../../services/user-import.service.js';

const orgParamsSchema = z.object({
  orgId: z.string().uuid(),
});

const orgUserParamsSchema = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
});

const importUsersBodySchema = z.object({
  users: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().trim().min(1),
        sfUserId: z.string().trim().min(1).optional(),
        sfOrgId: z.string().trim().min(1).optional(),
        role: z.enum(['admin', 'user']).optional(),
      }),
    )
    .min(1)
    .max(100),
});

const listUsersQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).optional().default('false'),
});

const updateUserBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    role: z.enum(['admin', 'user']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const adminUsersRoute: FastifyPluginAsync = async (app): Promise<void> => {
  const userImportService = new UserImportService({
    db: app.db,
    logger: app.log,
  });

  app.post('/organizations/:orgId/users/import', async (request) => {
    const { orgId } = validateParams(orgParamsSchema, request.params);
    const { users } = validateBody(importUsersBodySchema, request.body);
    return userImportService.importUsers(orgId, users);
  });

  app.get('/organizations/:orgId/users', async (request) => {
    const { orgId } = validateParams(orgParamsSchema, request.params);
    const { includeInactive } = validateQuery(listUsersQuerySchema, request.query);

    return userImportService.listUsers(orgId, includeInactive === 'true');
  });

  app.get('/organizations/:orgId/users/:userId', async (request) => {
    const { orgId, userId } = validateParams(orgUserParamsSchema, request.params);
    return userImportService.getUser(orgId, userId);
  });

  app.patch('/organizations/:orgId/users/:userId', async (request) => {
    const { orgId, userId } = validateParams(orgUserParamsSchema, request.params);
    const body = validateBody(updateUserBodySchema, request.body);

    return userImportService.updateUser(orgId, userId, body);
  });
};

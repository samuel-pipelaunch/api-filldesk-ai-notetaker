import { and, eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { licenses } from '../db/schema/licenses.js';
import { organizations } from '../db/schema/organizations.js';
import { users } from '../db/schema/users.js';
import { forbidden, notFound } from '../lib/http-error.js';
import { validateParams } from '../lib/validation.js';

const userParamsSchema = z.object({
  userId: z.string().uuid(),
});

type UserContextUser = InferSelectModel<typeof users>;
type UserContextOrg = InferSelectModel<typeof organizations>;

export interface UserContext {
  user: UserContextUser;
  org: UserContextOrg;
}

export const userContextPlugin: FastifyPluginAsync = async (app): Promise<void> => {
  app.decorateRequest('userContext');

  app.addHook('preHandler', async (request): Promise<void> => {
    const { userId } = validateParams(userParamsSchema, request.params);

    const [user] = await app.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      throw notFound('User not found');
    }

    const [org] = await app.db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, user.orgId), eq(organizations.isActive, true)))
      .limit(1);

    if (!org) {
      throw notFound('Organization not found');
    }

    const [activeLicense] = await app.db
      .select({ id: licenses.id })
      .from(licenses)
      .where(
        and(
          eq(licenses.userId, user.id),
          eq(licenses.orgId, user.orgId),
          eq(licenses.status, 'active'),
        ),
      )
      .limit(1);

    if (!activeLicense) {
      throw forbidden('User does not have an active license');
    }

    request.userContext = {
      user,
      org,
    };
  });
};

declare module 'fastify' {
  interface FastifyRequest {
    userContext: UserContext;
  }
}

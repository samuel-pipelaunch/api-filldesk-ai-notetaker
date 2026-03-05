import { and, eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { z } from 'zod';

import type { Db } from '../db/client.js';
import { users } from '../db/schema/users.js';
import { badRequest, notFound } from '../lib/http-error.js';

export type User = typeof users.$inferSelect;

export interface ImportUserInput {
  email: string;
  name: string;
  sfUserId?: string;
  sfOrgId?: string;
  role?: 'admin' | 'user';
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ email: string; error: string }>;
}

export interface UpdateUserInput {
  name?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
}

interface UserImportServiceOptions {
  db: Db;
  logger: FastifyBaseLogger;
}

const importUserSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1),
  sfUserId: z.string().trim().min(1).optional(),
  sfOrgId: z.string().trim().min(1).optional(),
  role: z.enum(['admin', 'user']).optional(),
});

export class UserImportService {
  private readonly db: Db;
  private readonly logger: FastifyBaseLogger;

  public constructor(options: UserImportServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  public async importUsers(orgId: string, importUsersInput: ImportUserInput[]): Promise<ImportResult> {
    const result: ImportResult = {
      created: 0,
      updated: 0,
      errors: [],
    };

    const seenEmails = new Set<string>();

    for (const inputUser of importUsersInput) {
      const normalizedEmail = inputUser.email.trim().toLowerCase();

      if (seenEmails.has(normalizedEmail)) {
        result.errors.push({
          email: inputUser.email,
          error: 'Duplicate email in import payload',
        });
        continue;
      }
      seenEmails.add(normalizedEmail);

      const parsed = importUserSchema.safeParse({
        ...inputUser,
        email: normalizedEmail,
      });

      if (!parsed.success) {
        result.errors.push({
          email: inputUser.email,
          error: parsed.error.issues.map((issue) => issue.message).join('; '),
        });
        continue;
      }

      const userData = parsed.data;

      if (userData.sfUserId) {
        const [sfUserCollision] = await this.db
          .select({
            id: users.id,
            email: users.email,
          })
          .from(users)
          .where(and(eq(users.orgId, orgId), eq(users.sfUserId, userData.sfUserId)))
          .limit(1);

        if (sfUserCollision && sfUserCollision.email.toLowerCase() !== userData.email) {
          result.errors.push({
            email: userData.email,
            error: `sfUserId collision with existing user ${sfUserCollision.email}`,
          });
          continue;
        }
      }

      const [existingUser] = await this.db
        .select()
        .from(users)
        .where(and(eq(users.orgId, orgId), eq(users.email, userData.email)))
        .limit(1);

      if (existingUser) {
        await this.db
          .update(users)
          .set({
            name: userData.name,
            sfUserId: userData.sfUserId,
            sfOrgId: userData.sfOrgId,
            role: userData.role,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));

        result.updated += 1;
        continue;
      }

      await this.db.insert(users).values({
        orgId,
        email: userData.email,
        name: userData.name,
        sfUserId: userData.sfUserId,
        sfOrgId: userData.sfOrgId,
        role: userData.role ?? 'user',
      });

      result.created += 1;
    }

    this.logger.info(
      {
        orgId,
        created: result.created,
        updated: result.updated,
        errorCount: result.errors.length,
      },
      'Admin imported users',
    );

    return result;
  }

  public async listUsers(orgId: string, includeInactive: boolean): Promise<User[]> {
    if (includeInactive) {
      return this.db.select().from(users).where(eq(users.orgId, orgId));
    }

    return this.db
      .select()
      .from(users)
      .where(and(eq(users.orgId, orgId), eq(users.isActive, true)));
  }

  public async getUser(orgId: string, userId: string): Promise<User> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
      .limit(1);

    if (!user) {
      throw notFound('User not found');
    }

    return user;
  }

  public async updateUser(orgId: string, userId: string, data: UpdateUserInput): Promise<User> {
    if (Object.keys(data).length === 0) {
      throw badRequest('No user fields provided for update');
    }

    const [updatedUser] = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
      .returning();

    if (!updatedUser) {
      throw notFound('User not found');
    }

    this.logger.info({ orgId, userId }, 'Admin updated user');
    return updatedUser;
  }
}

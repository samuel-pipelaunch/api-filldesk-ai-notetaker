import { and, eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import type { Db } from '../db/client.js';
import { licenses } from '../db/schema/licenses.js';
import { users } from '../db/schema/users.js';
import { conflict, internalError, notFound } from '../lib/http-error.js';

export type License = typeof licenses.$inferSelect;

export interface LicenseWithUser extends License {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    isActive: boolean;
  };
}

interface LicenseServiceOptions {
  db: Db;
  logger: FastifyBaseLogger;
}

export class LicenseService {
  private readonly db: Db;
  private readonly logger: FastifyBaseLogger;

  public constructor(options: LicenseServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  public async grantLicense(orgId: string, userId: string, grantedBy?: string): Promise<License> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
      .limit(1);

    if (!user) {
      throw notFound('User not found in organization');
    }

    const [existingActiveLicense] = await this.db
      .select({ id: licenses.id })
      .from(licenses)
      .where(
        and(eq(licenses.orgId, orgId), eq(licenses.userId, userId), eq(licenses.status, 'active')),
      )
      .limit(1);

    if (existingActiveLicense) {
      throw conflict('User already has an active license');
    }

    const [createdLicense] = await this.db
      .insert(licenses)
      .values({
        orgId,
        userId,
        status: 'active',
        grantedBy,
      })
      .returning();

    if (!createdLicense) {
      throw internalError('Failed to grant license');
    }

    this.logger.info({ orgId, userId, licenseId: createdLicense.id }, 'Admin granted license');
    return createdLicense;
  }

  public async revokeLicense(orgId: string, userId: string): Promise<License> {
    const [activeLicense] = await this.db
      .select()
      .from(licenses)
      .where(
        and(eq(licenses.orgId, orgId), eq(licenses.userId, userId), eq(licenses.status, 'active')),
      )
      .limit(1);

    if (!activeLicense) {
      throw notFound('Active license not found for user');
    }

    const [revokedLicense] = await this.db
      .update(licenses)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
      })
      .where(eq(licenses.id, activeLicense.id))
      .returning();

    if (!revokedLicense) {
      throw internalError('Failed to revoke license');
    }

    this.logger.info({ orgId, userId, licenseId: activeLicense.id }, 'Admin revoked license');
    return revokedLicense;
  }

  public async listLicenses(orgId: string): Promise<LicenseWithUser[]> {
    const rows = await this.db
      .select({
        license: licenses,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
        },
      })
      .from(licenses)
      .innerJoin(users, eq(licenses.userId, users.id))
      .where(eq(licenses.orgId, orgId));

    return rows.map((row) => ({
      ...row.license,
      user: row.user,
    }));
  }

  public async getLicenseForUser(userId: string): Promise<License | null> {
    const [license] = await this.db
      .select()
      .from(licenses)
      .where(and(eq(licenses.userId, userId), eq(licenses.status, 'active')))
      .limit(1);

    return license ?? null;
  }

  public async getLicenseSummary(
    orgId: string,
  ): Promise<{ total: number; active: number; revoked: number }> {
    const rows = await this.db
      .select({ status: licenses.status })
      .from(licenses)
      .where(eq(licenses.orgId, orgId));

    let active = 0;
    let revoked = 0;

    for (const row of rows) {
      if (row.status === 'active') {
        active += 1;
      }

      if (row.status === 'revoked') {
        revoked += 1;
      }
    }

    return {
      total: rows.length,
      active,
      revoked,
    };
  }
}

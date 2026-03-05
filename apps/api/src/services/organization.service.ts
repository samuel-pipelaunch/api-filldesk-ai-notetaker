import { eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import type { Db } from '../db/client.js';
import { organizationSettings } from '../db/schema/organization-settings.js';
import { organizations } from '../db/schema/organizations.js';
import { internalError, notFound } from '../lib/http-error.js';

export type Organization = typeof organizations.$inferSelect;

export interface CreateOrganizationInput {
  name: string;
  recallRegion?: 'us-east-1' | 'eu-central-1';
}

export interface UpdateOrganizationInput {
  name?: string;
  recallRegion?: 'us-east-1' | 'eu-central-1';
  isActive?: boolean;
}

interface OrganizationServiceOptions {
  db: Db;
  logger: FastifyBaseLogger;
}

export class OrganizationService {
  private readonly db: Db;
  private readonly logger: FastifyBaseLogger;

  public constructor(options: OrganizationServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  public async createOrganization(data: CreateOrganizationInput): Promise<Organization> {
    const createdOrganization = await this.db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: data.name,
          recallRegion: data.recallRegion,
        })
        .returning();

      if (!organization) {
        throw internalError('Failed to create organization');
      }

      await tx.insert(organizationSettings).values({
        orgId: organization.id,
      });

      return organization;
    });

    this.logger.info({ orgId: createdOrganization.id }, 'Admin created organization');
    return createdOrganization;
  }

  public async getOrganization(orgId: string): Promise<Organization> {
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!organization) {
      throw notFound('Organization not found');
    }

    return organization;
  }

  public async listOrganizations(): Promise<Organization[]> {
    return this.db.select().from(organizations);
  }

  public async updateOrganization(
    orgId: string,
    data: UpdateOrganizationInput,
  ): Promise<Organization> {
    const updatePayload: UpdateOrganizationInput & { updatedAt: Date } = {
      updatedAt: new Date(),
      ...data,
    };

    const [updatedOrganization] = await this.db
      .update(organizations)
      .set(updatePayload)
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updatedOrganization) {
      throw notFound('Organization not found');
    }

    this.logger.info({ orgId }, 'Admin updated organization');
    return updatedOrganization;
  }
}

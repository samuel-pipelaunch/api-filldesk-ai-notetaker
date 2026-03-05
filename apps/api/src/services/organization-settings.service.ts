import { eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import type { Db } from '../db/client.js';
import { organizationSettings } from '../db/schema/organization-settings.js';
import { organizations } from '../db/schema/organizations.js';
import { internalError, notFound } from '../lib/http-error.js';

export type OrganizationSettings = typeof organizationSettings.$inferSelect;

export interface UpdateOrgSettingsInput {
  botName: string;
  autoRecord: boolean;
  recordExternalMeetings: boolean;
  recordInternalMeetings: boolean;
  waitingRoomTimeout: number;
  nooneJoinedTimeout: number;
  everyoneLeftTimeout: number;
  maxMeetingDuration: number;
  transcriptionProvider: 'recall' | 'assembly_ai' | 'deepgram' | 'aws_transcribe';
}

interface OrganizationSettingsServiceOptions {
  db: Db;
  logger: FastifyBaseLogger;
}

export class OrganizationSettingsService {
  private readonly db: Db;
  private readonly logger: FastifyBaseLogger;

  public constructor(options: OrganizationSettingsServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  public async getSettings(orgId: string): Promise<OrganizationSettings> {
    const [existingSettings] = await this.db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.orgId, orgId))
      .limit(1);

    if (existingSettings) {
      return existingSettings;
    }

    const [organization] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!organization) {
      throw notFound('Organization not found');
    }

    const [createdSettings] = await this.db
      .insert(organizationSettings)
      .values({
        orgId,
      })
      .returning();

    if (!createdSettings) {
      throw internalError('Failed to create organization settings');
    }

    this.logger.info({ orgId }, 'Created default organization settings');
    return createdSettings;
  }

  public async updateSettings(
    orgId: string,
    data: Partial<UpdateOrgSettingsInput>,
  ): Promise<OrganizationSettings> {
    await this.getSettings(orgId);

    const [updatedSettings] = await this.db
      .update(organizationSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(organizationSettings.orgId, orgId))
      .returning();

    if (!updatedSettings) {
      throw internalError('Failed to update organization settings');
    }

    this.logger.info({ orgId }, 'Admin updated organization settings');
    return updatedSettings;
  }
}

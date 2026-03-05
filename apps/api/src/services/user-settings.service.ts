import { and, eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

import type { Db } from '../db/client.js';
import { userSettings } from '../db/schema/user-settings.js';
import { notFound } from '../lib/http-error.js';

type SettingSource = 'org' | 'user';

type ResolvedOverrides = {
  botName: SettingSource;
  autoRecord: SettingSource;
  recordExternalMeetings: SettingSource;
  recordInternalMeetings: SettingSource;
  waitingRoomTimeout: SettingSource;
  nooneJoinedTimeout: SettingSource;
  everyoneLeftTimeout: SettingSource;
  maxMeetingDuration: SettingSource;
  transcriptionProvider: SettingSource;
};

export type ResolvedBotSettings = {
  botName: string;
  autoRecord: boolean;
  recordExternalMeetings: boolean;
  recordInternalMeetings: boolean;
  waitingRoomTimeout: number;
  nooneJoinedTimeout: number;
  everyoneLeftTimeout: number;
  maxMeetingDuration: number;
  transcriptionProvider: string;
  overrides: Record<string, SettingSource>;
};

export type UserSettings = InferSelectModel<typeof userSettings>;

export interface UpdateUserSettingsInput {
  botName: string | null;
  autoRecord: boolean | null;
  recordExternalMeetings: boolean | null;
  recordInternalMeetings: boolean | null;
  waitingRoomTimeout: number | null;
  nooneJoinedTimeout: number | null;
  everyoneLeftTimeout: number | null;
  maxMeetingDuration: number | null;
}

interface UserSettingsServiceConfig {
  db: Db;
}

function hasField<T extends object>(value: T, field: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function mapUpdates(
  data: Partial<UpdateUserSettingsInput>,
): Partial<typeof userSettings.$inferInsert> {
  const updates: Partial<typeof userSettings.$inferInsert> = {};

  if (hasField(data, 'botName')) {
    updates.botName = data.botName;
  }

  if (hasField(data, 'autoRecord')) {
    updates.autoRecord = data.autoRecord;
  }

  if (hasField(data, 'recordExternalMeetings')) {
    updates.recordExternalMeetings = data.recordExternalMeetings;
  }

  if (hasField(data, 'recordInternalMeetings')) {
    updates.recordInternalMeetings = data.recordInternalMeetings;
  }

  if (hasField(data, 'waitingRoomTimeout')) {
    updates.waitingRoomTimeout = data.waitingRoomTimeout;
  }

  if (hasField(data, 'nooneJoinedTimeout')) {
    updates.nooneJoinedTimeout = data.nooneJoinedTimeout;
  }

  if (hasField(data, 'everyoneLeftTimeout')) {
    updates.everyoneLeftTimeout = data.everyoneLeftTimeout;
  }

  if (hasField(data, 'maxMeetingDuration')) {
    updates.maxMeetingDuration = data.maxMeetingDuration;
  }

  return updates;
}

export class UserSettingsService {
  private readonly db: Db;

  public constructor(config: UserSettingsServiceConfig) {
    this.db = config.db;
  }

  public async getUserSettings(userId: string): Promise<UserSettings | null> {
    const [settings] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    return settings ?? null;
  }

  public async updateUserSettings(
    userId: string,
    orgId: string,
    data: Partial<UpdateUserSettingsInput>,
  ): Promise<UserSettings> {
    const now = new Date();
    const updates = mapUpdates(data);

    const existingSettings = await this.getUserSettings(userId);
    if (existingSettings) {
      const [updatedSettings] = await this.db
        .update(userSettings)
        .set({
          ...updates,
          orgId,
          updatedAt: now,
        })
        .where(eq(userSettings.id, existingSettings.id))
        .returning();

      if (!updatedSettings) {
        throw notFound('User settings not found');
      }

      return updatedSettings;
    }

    const [createdSettings] = await this.db
      .insert(userSettings)
      .values({
        userId,
        orgId,
        ...updates,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!createdSettings) {
      throw notFound('Failed to create user settings');
    }

    return createdSettings;
  }

  public async resetUserSettings(userId: string): Promise<void> {
    await this.db.delete(userSettings).where(eq(userSettings.userId, userId));
  }

  public async getEffectiveSettings(userId: string, orgId: string): Promise<ResolvedBotSettings> {
    const [orgDefaults, userOverrides] = await Promise.all([
      this.db.query.organizationSettings.findFirst({
        where: (table, operators) => operators.eq(table.orgId, orgId),
      }),
      this.db.query.userSettings.findFirst({
        where: (table, operators) =>
          and(eq(table.userId, userId), eq(table.orgId, orgId)),
      }),
    ]);

    if (!orgDefaults) {
      throw notFound('Organization settings not found');
    }

    const overrides: ResolvedOverrides = {
      botName: userOverrides?.botName != null ? 'user' : 'org',
      autoRecord: userOverrides?.autoRecord != null ? 'user' : 'org',
      recordExternalMeetings: userOverrides?.recordExternalMeetings != null ? 'user' : 'org',
      recordInternalMeetings: userOverrides?.recordInternalMeetings != null ? 'user' : 'org',
      waitingRoomTimeout: userOverrides?.waitingRoomTimeout != null ? 'user' : 'org',
      nooneJoinedTimeout: userOverrides?.nooneJoinedTimeout != null ? 'user' : 'org',
      everyoneLeftTimeout: userOverrides?.everyoneLeftTimeout != null ? 'user' : 'org',
      maxMeetingDuration: userOverrides?.maxMeetingDuration != null ? 'user' : 'org',
      transcriptionProvider: 'org',
    };

    return {
      botName: userOverrides?.botName ?? orgDefaults.botName,
      autoRecord: userOverrides?.autoRecord ?? orgDefaults.autoRecord,
      recordExternalMeetings:
        userOverrides?.recordExternalMeetings ?? orgDefaults.recordExternalMeetings,
      recordInternalMeetings:
        userOverrides?.recordInternalMeetings ?? orgDefaults.recordInternalMeetings,
      waitingRoomTimeout: userOverrides?.waitingRoomTimeout ?? orgDefaults.waitingRoomTimeout,
      nooneJoinedTimeout: userOverrides?.nooneJoinedTimeout ?? orgDefaults.nooneJoinedTimeout,
      everyoneLeftTimeout: userOverrides?.everyoneLeftTimeout ?? orgDefaults.everyoneLeftTimeout,
      maxMeetingDuration: userOverrides?.maxMeetingDuration ?? orgDefaults.maxMeetingDuration,
      transcriptionProvider: orgDefaults.transcriptionProvider,
      overrides,
    };
  }
}

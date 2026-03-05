'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Alert } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Toggle } from '../../../components/ui/toggle';
import { apiClient, type EffectiveSettings, type UserSettings } from '../../../lib/api-client';
import { getStoredUserId, setStoredUserId } from '../../../lib/utils';

type OverrideDraft = {
  botName: string | null;
  autoRecord: boolean | null;
  recordExternalMeetings: boolean | null;
  recordInternalMeetings: boolean | null;
  waitingRoomTimeout: number | null;
  nooneJoinedTimeout: number | null;
  everyoneLeftTimeout: number | null;
  maxMeetingDuration: number | null;
};

const defaultDraft: OverrideDraft = {
  botName: null,
  autoRecord: null,
  recordExternalMeetings: null,
  recordInternalMeetings: null,
  waitingRoomTimeout: null,
  nooneJoinedTimeout: null,
  everyoneLeftTimeout: null,
  maxMeetingDuration: null,
};

export default function UserSettingsPage() {
  const searchParams = useSearchParams();

  const [userIdInput, setUserIdInput] = useState('');
  const [userId, setUserId] = useState('');
  const [effective, setEffective] = useState<EffectiveSettings | null>(null);
  const [overrides, setOverrides] = useState<UserSettings | null>(null);
  const [draft, setDraft] = useState<OverrideDraft>(defaultDraft);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const queryUserId = searchParams.get('userId');
    const storedUserId = getStoredUserId();
    const nextUserId = queryUserId || storedUserId;
    setUserId(nextUserId);
    setUserIdInput(nextUserId);

    if (nextUserId) {
      void loadData(nextUserId);
    }
  }, [searchParams]);

  async function loadData(activeUserId: string): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      const [effectiveSettings, userSettings] = await Promise.all([
        apiClient.user.getEffectiveSettings(activeUserId),
        apiClient.user.getSettings(activeUserId),
      ]);

      setEffective(effectiveSettings);
      setOverrides(userSettings);
      setDraft({
        botName: userSettings?.botName ?? null,
        autoRecord: userSettings?.autoRecord ?? null,
        recordExternalMeetings: userSettings?.recordExternalMeetings ?? null,
        recordInternalMeetings: userSettings?.recordInternalMeetings ?? null,
        waitingRoomTimeout: userSettings?.waitingRoomTimeout ?? null,
        nooneJoinedTimeout: userSettings?.nooneJoinedTimeout ?? null,
        everyoneLeftTimeout: userSettings?.everyoneLeftTimeout ?? null,
        maxMeetingDuration: userSettings?.maxMeetingDuration ?? null,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  }

  function applyUserId(): void {
    if (!userIdInput.trim()) {
      setError('Enter a userId.');
      return;
    }

    const nextUserId = userIdInput.trim();
    setStoredUserId(nextUserId);
    setUserId(nextUserId);
    void loadData(nextUserId);
  }

  function clearField(field: keyof OverrideDraft): void {
    setDraft((previous) => ({ ...previous, [field]: null }));
  }

  async function saveOverrides(): Promise<void> {
    if (!userId) {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.user.updateSettings(userId, draft);
      setSuccess('Overrides saved.');
      await loadData(userId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save overrides.');
    } finally {
      setIsSaving(false);
    }
  }

  async function resetAll(): Promise<void> {
    if (!userId) {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.user.resetSettings(userId);
      setDraft(defaultDraft);
      setSuccess('All overrides reset to defaults.');
      await loadData(userId);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset settings.');
    } finally {
      setIsSaving(false);
    }
  }

  function sourceBadge(field: keyof EffectiveSettings['overrides']) {
    const source = effective?.overrides[field] ?? 'org';
    return <Badge variant={source === 'user' ? 'connected' : 'default'}>{source === 'user' ? 'Override' : 'Using default'}</Badge>;
  }

  function orgDefaultValue<T>(field: keyof OverrideDraft, effectiveValue: T): string {
    const source = effective?.overrides[field] ?? 'org';
    if (source === 'org') {
      return String(effectiveValue);
    }
    return 'Org value hidden by override';
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">User Bot Settings</h2>
        <p className="text-sm text-slate-600">Manage your personal setting overrides.</p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <Card title="User">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full max-w-xl">
            <Input
              id="settings-user-id"
              label="User ID"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
            />
          </div>
          <Button onClick={applyUserId}>Load Settings</Button>
        </div>
      </Card>

      {!userId ? (
        <Alert variant="warning">Enter a user ID to continue.</Alert>
      ) : isLoading || !effective ? (
        <Card>
          <p className="text-sm text-slate-600">Loading settings...</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Organization Defaults" description="Read-only effective defaults.">
            <ul className="space-y-2 text-sm text-slate-700">
              <li>Bot name: {orgDefaultValue('botName', effective.botName)}</li>
              <li>Auto record: {orgDefaultValue('autoRecord', effective.autoRecord)}</li>
              <li>
                Record external meetings: {orgDefaultValue('recordExternalMeetings', effective.recordExternalMeetings)}
              </li>
              <li>
                Record internal meetings: {orgDefaultValue('recordInternalMeetings', effective.recordInternalMeetings)}
              </li>
              <li>
                Waiting room timeout: {orgDefaultValue('waitingRoomTimeout', effective.waitingRoomTimeout)}
              </li>
              <li>
                No-one joined timeout: {orgDefaultValue('nooneJoinedTimeout', effective.nooneJoinedTimeout)}
              </li>
              <li>
                Everyone left timeout: {orgDefaultValue('everyoneLeftTimeout', effective.everyoneLeftTimeout)}
              </li>
              <li>
                Max meeting duration: {orgDefaultValue('maxMeetingDuration', effective.maxMeetingDuration)}
              </li>
              <li>Transcription provider: {effective.transcriptionProvider}</li>
            </ul>
          </Card>

          <Card title="Your Overrides" description="Set values or clear to use defaults.">
            <div className="space-y-3">
              <div className="rounded border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Bot name</p>
                  {sourceBadge('botName')}
                </div>
                <Input
                  id="override-bot-name"
                  value={draft.botName ?? ''}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, botName: event.target.value || null }))
                  }
                />
                <Button className="mt-2" variant="outline" onClick={() => clearField('botName')}>
                  Clear
                </Button>
              </div>

              <div className="rounded border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Auto record</p>
                  {sourceBadge('autoRecord')}
                </div>
                <Toggle
                  label="Enable"
                  checked={draft.autoRecord ?? effective.autoRecord}
                  onChange={(checked) => setDraft((previous) => ({ ...previous, autoRecord: checked }))}
                />
                <Button variant="outline" onClick={() => clearField('autoRecord')}>
                  Clear
                </Button>
              </div>

              <div className="rounded border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Record external meetings</p>
                  {sourceBadge('recordExternalMeetings')}
                </div>
                <Toggle
                  label="Enable"
                  checked={draft.recordExternalMeetings ?? effective.recordExternalMeetings}
                  onChange={(checked) =>
                    setDraft((previous) => ({ ...previous, recordExternalMeetings: checked }))
                  }
                />
                <Button variant="outline" onClick={() => clearField('recordExternalMeetings')}>
                  Clear
                </Button>
              </div>

              <div className="rounded border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Record internal meetings</p>
                  {sourceBadge('recordInternalMeetings')}
                </div>
                <Toggle
                  label="Enable"
                  checked={draft.recordInternalMeetings ?? effective.recordInternalMeetings}
                  onChange={(checked) =>
                    setDraft((previous) => ({ ...previous, recordInternalMeetings: checked }))
                  }
                />
                <Button variant="outline" onClick={() => clearField('recordInternalMeetings')}>
                  Clear
                </Button>
              </div>

              {(
                [
                  ['waitingRoomTimeout', 'Waiting room timeout'],
                  ['nooneJoinedTimeout', 'No-one joined timeout'],
                  ['everyoneLeftTimeout', 'Everyone left timeout'],
                  ['maxMeetingDuration', 'Max meeting duration'],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="rounded border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{label}</p>
                    {sourceBadge(field)}
                  </div>
                  <Input
                    id={`override-${field}`}
                    type="number"
                    value={String(draft[field] ?? (effective[field] as number))}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        [field]: event.target.value ? Number(event.target.value) : null,
                      }))
                    }
                  />
                  <Button className="mt-2" variant="outline" onClick={() => clearField(field)}>
                    Clear
                  </Button>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={saveOverrides} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Overrides'}
                </Button>
                <Button variant="danger" onClick={resetAll} disabled={isSaving}>
                  Reset All to Defaults
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Toggle } from '../../../components/ui/toggle';
import { apiClient, type OrganizationSettings, type TranscriptionProvider } from '../../../lib/api-client';

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('orgId') ?? '';

  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canLoad = useMemo(() => orgId.length > 0, [orgId]);

  useEffect(() => {
    if (!canLoad) {
      setIsLoading(false);
      return;
    }

    void loadSettings();
  }, [canLoad, orgId]);

  async function loadSettings(): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.admin.getSettings(orgId);
      setSettings(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings(): Promise<void> {
    if (!settings) {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await apiClient.admin.updateSettings(orgId, {
        botName: settings.botName,
        autoRecord: settings.autoRecord,
        recordExternalMeetings: settings.recordExternalMeetings,
        recordInternalMeetings: settings.recordInternalMeetings,
        waitingRoomTimeout: settings.waitingRoomTimeout,
        nooneJoinedTimeout: settings.nooneJoinedTimeout,
        everyoneLeftTimeout: settings.everyoneLeftTimeout,
        maxMeetingDuration: settings.maxMeetingDuration,
        transcriptionProvider: settings.transcriptionProvider,
      });

      setSettings(updated);
      setSuccess('Settings saved successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!canLoad) {
    return <Alert variant="warning">Missing orgId query parameter.</Alert>;
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Global Bot Settings</h2>
        <p className="text-sm text-slate-600">Configure organization-wide bot behavior.</p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      {isLoading || !settings ? (
        <Card>
          <p className="text-sm text-slate-600">Loading settings...</p>
        </Card>
      ) : (
        <Card title="Bot Configuration">
          <div className="space-y-3">
            <Input
              id="bot-name"
              label="Bot name"
              value={settings.botName}
              onChange={(event) => setSettings((previous) => previous ? { ...previous, botName: event.target.value } : previous)}
            />

            <Toggle
              id="auto-record"
              label="Auto record"
              checked={settings.autoRecord}
              onChange={(checked) => setSettings((previous) => previous ? { ...previous, autoRecord: checked } : previous)}
            />
            <Toggle
              id="record-external"
              label="Record external meetings"
              checked={settings.recordExternalMeetings}
              onChange={(checked) =>
                setSettings((previous) =>
                  previous ? { ...previous, recordExternalMeetings: checked } : previous,
                )
              }
            />
            <Toggle
              id="record-internal"
              label="Record internal meetings"
              checked={settings.recordInternalMeetings}
              onChange={(checked) =>
                setSettings((previous) =>
                  previous ? { ...previous, recordInternalMeetings: checked } : previous,
                )
              }
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                id="waiting-room-timeout"
                label="Waiting room timeout (seconds)"
                type="number"
                value={String(settings.waitingRoomTimeout)}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, waitingRoomTimeout: Number(event.target.value) || 0 }
                      : previous,
                  )
                }
              />
              <Input
                id="noone-joined-timeout"
                label="No-one joined timeout (seconds)"
                type="number"
                value={String(settings.nooneJoinedTimeout)}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, nooneJoinedTimeout: Number(event.target.value) || 0 }
                      : previous,
                  )
                }
              />
              <Input
                id="everyone-left-timeout"
                label="Everyone left timeout (seconds)"
                type="number"
                value={String(settings.everyoneLeftTimeout)}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, everyoneLeftTimeout: Number(event.target.value) || 0 }
                      : previous,
                  )
                }
              />
              <Input
                id="max-duration"
                label="Max meeting duration (seconds)"
                type="number"
                value={String(settings.maxMeetingDuration)}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, maxMeetingDuration: Number(event.target.value) || 0 }
                      : previous,
                  )
                }
              />
            </div>

            <Select
              id="transcription-provider"
              label="Transcription provider"
              value={settings.transcriptionProvider}
              onChange={(event) =>
                setSettings((previous) =>
                  previous
                    ? {
                        ...previous,
                        transcriptionProvider: event.target.value as TranscriptionProvider,
                      }
                    : previous,
                )
              }
              options={[
                { value: 'recall', label: 'recall' },
                { value: 'assembly_ai', label: 'assembly_ai' },
                { value: 'deepgram', label: 'deepgram' },
                { value: 'aws_transcribe', label: 'aws_transcribe' },
              ]}
            />

            <Button onClick={saveSettings} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
}
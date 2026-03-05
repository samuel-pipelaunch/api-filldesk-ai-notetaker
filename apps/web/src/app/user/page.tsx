'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Alert } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { apiClient, type CalendarStatusResponse, type EffectiveSettings, type MeetingStats } from '../../lib/api-client';
import { getStoredUserId, setStoredUserId } from '../../lib/utils';

export default function UserPage() {
  const searchParams = useSearchParams();
  const [userIdInput, setUserIdInput] = useState('');
  const [activeUserId, setActiveUserId] = useState('');
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatusResponse | null>(null);
  const [effectiveSettings, setEffectiveSettings] = useState<EffectiveSettings | null>(null);
  const [stats, setStats] = useState<MeetingStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const queryUserId = searchParams.get('userId');
    const storedUserId = getStoredUserId();
    const nextUserId = queryUserId || storedUserId;
    setActiveUserId(nextUserId);
    setUserIdInput(nextUserId);

    if (nextUserId) {
      void loadDashboard(nextUserId);
    }
  }, [searchParams]);

  async function loadDashboard(userId: string): Promise<void> {
    setError('');

    try {
      const [statusResponse, effectiveResponse, statsResponse] = await Promise.all([
        apiClient.user.getCalendarStatus(userId),
        apiClient.user.getEffectiveSettings(userId),
        apiClient.user.getMeetingStats(userId),
      ]);

      setCalendarStatus(statusResponse);
      setEffectiveSettings(effectiveResponse);
      setStats(statsResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load user dashboard.');
    }
  }

  function handleUseUserId(): void {
    if (!userIdInput.trim()) {
      setError('Enter a userId to continue.');
      return;
    }

    setStoredUserId(userIdInput.trim());
    setActiveUserId(userIdInput.trim());
    void loadDashboard(userIdInput.trim());
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">User Dashboard</h2>
        <p className="text-sm text-slate-600">View your calendar status, settings, and meetings.</p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card title="User Context">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full max-w-xl">
            <Input
              id="user-id"
              label="User ID"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="Enter user UUID"
            />
          </div>
          <Button onClick={handleUseUserId}>Load Dashboard</Button>
        </div>
      </Card>

      {activeUserId ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Calendar Connection">
              <Badge
                variant={
                  calendarStatus?.status === 'connected'
                    ? 'connected'
                    : calendarStatus?.status === 'pending'
                      ? 'pending'
                      : calendarStatus?.status === 'error' ||
                          calendarStatus?.status === 'disconnected'
                        ? 'revoked'
                        : 'default'
                }
              >
                {calendarStatus?.status ?? 'unknown'}
              </Badge>
            </Card>
            <Card title="Bot Settings Overrides">
              <p className="text-sm text-slate-600">
                Active overrides:{' '}
                <span className="font-semibold text-slate-900">
                  {effectiveSettings
                    ? Object.values(effectiveSettings.overrides).filter((source) => source === 'user')
                        .length
                    : 0}
                </span>
              </p>
            </Card>
            <Card title="Recent Meetings Summary">
              <p className="text-sm text-slate-600">Total: {stats?.total ?? 0}</p>
              <p className="text-sm text-slate-600">Recorded: {stats?.recorded ?? 0}</p>
            </Card>
          </div>

          <Card title="Quick Actions">
            <div className="flex flex-wrap gap-3">
              <Link href={`/user/calendar?userId=${activeUserId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                Calendar Connection
              </Link>
              <Link href={`/user/settings?userId=${activeUserId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                Bot Settings
              </Link>
              <Link href={`/user/meetings?userId=${activeUserId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                Meetings
              </Link>
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
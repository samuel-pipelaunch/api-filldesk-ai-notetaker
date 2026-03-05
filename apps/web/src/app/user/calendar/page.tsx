'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Alert } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { apiClient, type CalendarStatusResponse } from '../../../lib/api-client';
import { getStoredUserId, setStoredUserId } from '../../../lib/utils';

export default function UserCalendarPage() {
  const searchParams = useSearchParams();
  const callbackStatus = searchParams.get('status');
  const callbackError = searchParams.get('error');

  const [userIdInput, setUserIdInput] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<CalendarStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const queryUserId = searchParams.get('userId');
    const storedUserId = getStoredUserId();
    const nextUserId = queryUserId || storedUserId;

    setUserId(nextUserId);
    setUserIdInput(nextUserId);

    if (nextUserId) {
      void loadStatus(nextUserId);
    }
  }, [searchParams]);

  async function loadStatus(activeUserId: string): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.user.getCalendarStatus(activeUserId);
      setStatus(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load calendar status.');
    } finally {
      setIsLoading(false);
    }
  }

  async function startConnect(): Promise<void> {
    if (!userId) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiClient.user.connectCalendar(userId);
      window.location.href = response.authorizationUrl;
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Failed to start connect flow.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reconnect(): Promise<void> {
    if (!userId) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiClient.user.reconnectCalendar(userId);
      window.location.href = response.authorizationUrl;
    } catch (reconnectError) {
      setError(reconnectError instanceof Error ? reconnectError.message : 'Reconnect failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function disconnect(): Promise<void> {
    if (!userId) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await apiClient.user.disconnectCalendar(userId);
      await loadStatus(userId);
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Disconnect failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runHealthCheck(): Promise<void> {
    if (!userId) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await apiClient.user.healthCheckCalendar(userId);
      await loadStatus(userId);
    } catch (healthError) {
      setError(healthError instanceof Error ? healthError.message : 'Health check failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyUserId(): void {
    if (!userIdInput.trim()) {
      setError('Enter a userId.');
      return;
    }

    setStoredUserId(userIdInput.trim());
    setUserId(userIdInput.trim());
    void loadStatus(userIdInput.trim());
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Calendar Connection</h2>
        <p className="text-sm text-slate-600">Connect your Google Calendar for meeting ingestion.</p>
      </header>

      {callbackStatus ? (
        <Alert variant={callbackStatus === 'connected' ? 'success' : callbackStatus === 'error' ? 'error' : 'warning'}>
          OAuth callback status: <span className="font-medium">{callbackStatus}</span>
          {callbackError ? ` (${callbackError})` : ''}
        </Alert>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card title="User">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full max-w-xl">
            <Input
              id="calendar-user-id"
              label="User ID"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
            />
          </div>
          <Button onClick={applyUserId}>Load Status</Button>
        </div>
      </Card>

      <Card title="Connection Status">
        {!userId ? (
          <p className="text-sm text-slate-600">Enter a user ID to load status.</p>
        ) : isLoading ? (
          <p className="text-sm text-slate-600">Loading status...</p>
        ) : !status ? (
          <Alert variant="warning">No status available.</Alert>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  status.status === 'connected'
                    ? 'connected'
                    : status.status === 'pending'
                      ? 'pending'
                      : status.status === 'disconnected' || status.status === 'error'
                        ? 'revoked'
                        : 'default'
                }
              >
                {status.status}
              </Badge>
              {status.google_email ? (
                <span className="text-sm text-slate-600">{status.google_email}</span>
              ) : null}
            </div>

            {status.status === 'disconnected' ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-700">Connect your Google Calendar to continue.</p>
                <Button onClick={startConnect} disabled={isSubmitting}>
                  Connect your Google Calendar
                </Button>
              </div>
            ) : null}

            {status.status === 'connected' ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={runHealthCheck} disabled={isSubmitting}>
                  Health Check
                </Button>
                <Button variant="danger" onClick={disconnect} disabled={isSubmitting}>
                  Disconnect
                </Button>
              </div>
            ) : null}

            {status.status === 'insufficient_permissions' ? (
              <Alert variant="warning" title="Insufficient permissions">
                Check the Google Calendar permission box and reconnect.
                <div className="mt-2">
                  <Button onClick={reconnect} disabled={isSubmitting}>
                    Reconnect
                  </Button>
                </div>
              </Alert>
            ) : null}

            {status.status === 'expired' ? (
              <Alert variant="warning" title="Connection expired">
                Your authorization expired. Reconnect to continue.
                <div className="mt-2">
                  <Button onClick={reconnect} disabled={isSubmitting}>
                    Reconnect
                  </Button>
                </div>
              </Alert>
            ) : null}

            {status.status === 'error' ? (
              <Alert variant="error" title="Connection error">
                {status.last_error_code ?? 'Unknown error'}
                <div className="mt-2">
                  <Button onClick={reconnect} disabled={isSubmitting}>
                    Reconnect
                  </Button>
                </div>
              </Alert>
            ) : null}

            {status.status === 'pending' ? (
              <Alert variant="info">Waiting for Google authorization...</Alert>
            ) : null}
          </div>
        )}
      </Card>
    </section>
  );
}
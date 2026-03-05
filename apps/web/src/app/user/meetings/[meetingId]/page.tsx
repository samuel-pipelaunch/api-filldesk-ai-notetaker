'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { Alert } from '../../../../components/ui/alert';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { apiClient, type MeetingDetail } from '../../../../lib/api-client';
import { formatDateTime, formatSeconds, getStoredUserId, setStoredUserId } from '../../../../lib/utils';

function toTimestamp(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function statusVariant(status: string): 'active' | 'revoked' | 'pending' | 'connected' | 'default' {
  if (status === 'done') {
    return 'active';
  }
  if (status === 'failed' || status === 'cancelled') {
    return 'revoked';
  }
  if (status === 'scheduled' || status === 'joining') {
    return 'pending';
  }
  if (status === 'recording' || status === 'processing' || status === 'transcribing') {
    return 'connected';
  }
  return 'default';
}

export default function MeetingDetailPage() {
  const params = useParams<{ meetingId: string }>();
  const searchParams = useSearchParams();
  const meetingId = params.meetingId;

  const [userIdInput, setUserIdInput] = useState('');
  const [userId, setUserId] = useState('');
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const durationSeconds = useMemo(() => {
    if (!meeting?.actualStart || !meeting.actualEnd) {
      return null;
    }

    const start = new Date(meeting.actualStart).getTime();
    const end = new Date(meeting.actualEnd).getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return null;
    }

    return Math.floor((end - start) / 1000);
  }, [meeting]);

  useEffect(() => {
    const queryUserId = searchParams.get('userId');
    const storedUserId = getStoredUserId();
    const nextUserId = queryUserId || storedUserId;

    setUserId(nextUserId);
    setUserIdInput(nextUserId);

    if (nextUserId && meetingId) {
      void loadMeeting(nextUserId, meetingId);
    }
  }, [meetingId, searchParams]);

  async function loadMeeting(activeUserId: string, activeMeetingId: string): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.user.getMeeting(activeUserId, activeMeetingId);
      setMeeting(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load meeting detail.');
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
    void loadMeeting(nextUserId, meetingId);
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Meeting Detail</h2>
        <p className="text-sm text-slate-600">Meeting metadata and transcript.</p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card title="User">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full max-w-xl">
            <Input
              id="detail-user-id"
              label="User ID"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
            />
          </div>
          <Button onClick={applyUserId}>Load Meeting</Button>
        </div>
      </Card>

      {isLoading || !meeting ? (
        <Card>
          <p className="text-sm text-slate-600">Loading meeting...</p>
        </Card>
      ) : (
        <>
          <Card title={meeting.title ?? 'Untitled meeting'}>
            <div className="grid gap-3 md:grid-cols-2">
              <p className="text-sm text-slate-700">Date: {formatDateTime(meeting.scheduledStart)}</p>
              <p className="text-sm text-slate-700">Duration: {formatSeconds(durationSeconds)}</p>
              <div className="text-sm text-slate-700">
                Status: <Badge variant={statusVariant(meeting.status)}>{meeting.status}</Badge>
              </div>
              <p className="text-sm text-slate-700">Meeting ID: {meeting.id}</p>
            </div>
          </Card>

          {(meeting.status === 'scheduled' ||
            meeting.status === 'joining' ||
            meeting.status === 'recording' ||
            meeting.status === 'processing' ||
            meeting.status === 'transcribing') ? (
            <Card title="Status Timeline">
              <ol className="space-y-2 text-sm text-slate-700">
                {['scheduled', 'joining', 'recording', 'processing', 'transcribing', 'done'].map((step) => (
                  <li key={step} className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        step === meeting.status ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          <Card title="Transcript">
            {meeting.transcriptSegments.length === 0 ? (
              <p className="text-sm text-slate-600">No transcript segments available yet.</p>
            ) : (
              <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-md border border-slate-200 p-3">
                {meeting.transcriptSegments.map((segment) => (
                  <article key={segment.id} className="rounded bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      {segment.speaker ?? 'Unknown speaker'} · {toTimestamp(segment.startTime)}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">{segment.text}</p>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
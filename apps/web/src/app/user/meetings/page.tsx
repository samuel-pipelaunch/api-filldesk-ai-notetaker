'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Alert } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Table, TablePagination } from '../../../components/ui/table';
import { apiClient, type Meeting, type MeetingListResponse } from '../../../lib/api-client';
import { formatDateTime, formatSeconds, getStoredUserId, setStoredUserId } from '../../../lib/utils';

const PAGE_SIZE = 20;

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

function meetingDuration(meeting: Meeting): number | null {
  if (!meeting.actualStart || !meeting.actualEnd) {
    return null;
  }

  const start = new Date(meeting.actualStart).getTime();
  const end = new Date(meeting.actualEnd).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  return Math.floor((end - start) / 1000);
}

export default function UserMeetingsPage() {
  const searchParams = useSearchParams();

  const [userIdInput, setUserIdInput] = useState('');
  const [userId, setUserId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [offset, setOffset] = useState(0);
  const [response, setResponse] = useState<MeetingListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const queryUserId = searchParams.get('userId');
    const storedUserId = getStoredUserId();
    const nextUserId = queryUserId || storedUserId;

    setUserId(nextUserId);
    setUserIdInput(nextUserId);
    if (nextUserId) {
      void loadMeetings(nextUserId, 0);
    }
  }, [searchParams]);

  async function loadMeetings(activeUserId: string, nextOffset: number): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      const meetings = await apiClient.user.listMeetings(activeUserId, {
        status: statusFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      setResponse(meetings);
      setOffset(nextOffset);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load meetings.');
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
    void loadMeetings(nextUserId, 0);
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Meetings</h2>
        <p className="text-sm text-slate-600">Browse your recorded and scheduled meetings.</p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card title="User">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full max-w-xl">
            <Input
              id="meetings-user-id"
              label="User ID"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
            />
          </div>
          <Button onClick={applyUserId}>Load Meetings</Button>
        </div>
      </Card>

      <Card title="Filters">
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            id="status-filter"
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: '', label: 'All' },
              { value: 'scheduled', label: 'scheduled' },
              { value: 'joining', label: 'joining' },
              { value: 'recording', label: 'recording' },
              { value: 'processing', label: 'processing' },
              { value: 'transcribing', label: 'transcribing' },
              { value: 'done', label: 'done' },
              { value: 'failed', label: 'failed' },
              { value: 'cancelled', label: 'cancelled' },
            ]}
          />
          <Input
            id="from-date"
            label="From"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
          <Input
            id="to-date"
            label="To"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
        <div className="mt-3">
          <Button onClick={() => userId && loadMeetings(userId, 0)} disabled={!userId || isLoading}>
            Apply Filters
          </Button>
        </div>
      </Card>

      <Card title="Meeting List">
        <Table
          columns={[
            { key: 'title', header: 'Title' },
            { key: 'date', header: 'Date' },
            { key: 'status', header: 'Status' },
            { key: 'duration', header: 'Duration' },
            { key: 'actions', header: 'Actions' },
          ]}
          isEmpty={!isLoading && (response?.data.length ?? 0) === 0}
          emptyMessage="No meetings found."
        >
          {(response?.data ?? []).map((meeting) => (
            <tr key={meeting.id} className="text-sm text-slate-700">
              <td className="px-4 py-3">{meeting.title ?? 'Untitled meeting'}</td>
              <td className="px-4 py-3">{formatDateTime(meeting.scheduledStart)}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(meeting.status)}>{meeting.status}</Badge>
              </td>
              <td className="px-4 py-3">{formatSeconds(meetingDuration(meeting))}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/user/meetings/${meeting.id}?userId=${userId}`}
                  className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </Table>

        {response ? (
          <TablePagination
            total={response.pagination.total}
            limit={response.pagination.limit}
            offset={response.pagination.offset}
            onPrevious={() => userId && loadMeetings(userId, Math.max(offset - PAGE_SIZE, 0))}
            onNext={() => userId && loadMeetings(userId, offset + PAGE_SIZE)}
          />
        ) : null}
      </Card>
    </section>
  );
}
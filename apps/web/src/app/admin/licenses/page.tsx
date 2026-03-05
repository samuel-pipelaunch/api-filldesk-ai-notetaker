'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Alert } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Select } from '../../../components/ui/select';
import { Table } from '../../../components/ui/table';
import { apiClient, type LicenseSummary, type LicenseWithUser, type User } from '../../../lib/api-client';
import { formatDateTime } from '../../../lib/utils';

export default function AdminLicensesPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('orgId') ?? '';

  const [licenses, setLicenses] = useState<LicenseWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<LicenseSummary | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canLoad = useMemo(() => orgId.length > 0, [orgId]);

  useEffect(() => {
    if (!canLoad) {
      setIsLoading(false);
      return;
    }

    void loadData();
  }, [canLoad, orgId]);

  async function loadData(): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      const [licenseRows, licenseSummary, userRows] = await Promise.all([
        apiClient.admin.listLicenses(orgId),
        apiClient.admin.getLicenseSummary(orgId),
        apiClient.admin.listUsers(orgId, false),
      ]);

      setLicenses(licenseRows);
      setSummary(licenseSummary);
      setUsers(userRows);
      if (!selectedUserId && userRows.length > 0) {
        const firstUser = userRows[0];
        if (firstUser) {
          setSelectedUserId(firstUser.id);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load licenses.');
    } finally {
      setIsLoading(false);
    }
  }

  async function grantLicense(): Promise<void> {
    if (!selectedUserId) {
      setError('Select a user first.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await apiClient.admin.grantLicense(orgId, selectedUserId);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to grant license.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function revokeLicense(userId: string): Promise<void> {
    setIsSubmitting(true);
    setError('');

    try {
      await apiClient.admin.revokeLicense(orgId, userId);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to revoke license.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canLoad) {
    return <Alert variant="warning">Missing orgId query parameter.</Alert>;
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">License Management</h2>
        <p className="text-sm text-slate-600">Grant and revoke user licenses.</p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Total">
          <p className="text-2xl font-semibold">{summary?.total ?? 0}</p>
        </Card>
        <Card title="Active">
          <p className="text-2xl font-semibold text-emerald-700">{summary?.active ?? 0}</p>
        </Card>
        <Card title="Revoked">
          <p className="text-2xl font-semibold text-red-700">{summary?.revoked ?? 0}</p>
        </Card>
      </div>

      <Card title="Grant License">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full max-w-md">
            <Select
              id="grant-user"
              label="User"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              options={users.map((user) => ({
                value: user.id,
                label: `${user.name} (${user.email})`,
              }))}
            />
          </div>
          <Button onClick={grantLicense} disabled={isSubmitting || users.length === 0}>
            Grant
          </Button>
        </div>
      </Card>

      <Card title="Licenses">
        <Table
          columns={[
            { key: 'name', header: 'User' },
            { key: 'email', header: 'Email' },
            { key: 'status', header: 'Status' },
            { key: 'granted', header: 'Granted' },
            { key: 'actions', header: 'Actions' },
          ]}
          isEmpty={!isLoading && licenses.length === 0}
          emptyMessage="No licenses found."
        >
          {licenses.map((license) => (
            <tr key={license.id} className="text-sm text-slate-700">
              <td className="px-4 py-3">{license.user.name}</td>
              <td className="px-4 py-3">{license.user.email}</td>
              <td className="px-4 py-3">
                <Badge variant={license.status === 'active' ? 'active' : 'revoked'}>
                  {license.status}
                </Badge>
              </td>
              <td className="px-4 py-3">{formatDateTime(license.grantedAt)}</td>
              <td className="px-4 py-3">
                <Button
                  variant="danger"
                  onClick={() => revokeLicense(license.userId)}
                  disabled={license.status !== 'active' || isSubmitting}
                >
                  Revoke
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </section>
  );
}
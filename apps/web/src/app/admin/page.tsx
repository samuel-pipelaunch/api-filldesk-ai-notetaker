'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { apiClient, type LicenseSummary, type Organization, type RecallRegion } from '../../lib/api-client';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { LoadingSpinner, Skeleton } from '../../components/ui/loading';
import { Select } from '../../components/ui/select';

export default function AdminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [summary, setSummary] = useState<LicenseSummary | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgRegion, setNewOrgRegion] = useState<RecallRegion>('us-east-1');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const selectedOrg = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId],
  );

  useEffect(() => {
    void loadOrganizations();
  }, []);

  useEffect(() => {
    if (!selectedOrgId) {
      setSummary(null);
      return;
    }

    void (async () => {
      try {
        const licenseSummary = await apiClient.admin.getLicenseSummary(selectedOrgId);
        setSummary(licenseSummary);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load summary.');
      }
    })();
  }, [selectedOrgId]);

  async function loadOrganizations(): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      const items = await apiClient.admin.listOrganizations();
      setOrganizations(items);
      if (items.length > 0 && !selectedOrgId) {
        const firstOrganization = items[0];
        if (firstOrganization) {
          setSelectedOrgId(firstOrganization.id);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load organizations.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateOrganization(): Promise<void> {
    if (!newOrgName.trim()) {
      setError('Organization name is required.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const created = await apiClient.admin.createOrganization({
        name: newOrgName,
        recallRegion: newOrgRegion,
      });

      const nextOrganizations = [...organizations, created];
      setOrganizations(nextOrganizations);
      setSelectedOrgId(created.id);
      setNewOrgName('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create organization.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Admin Dashboard</h2>
        <p className="text-sm text-slate-600">Manage organizations, licenses, users, and bot settings.</p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card title="Organization">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-48" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">No organizations found. Create your first organization.</p>
            <Input
              id="org-name"
              label="Organization name"
              value={newOrgName}
              onChange={(event) => setNewOrgName(event.target.value)}
            />
            <Select
              id="org-region"
              label="Recall region"
              value={newOrgRegion}
              onChange={(event) => setNewOrgRegion(event.target.value as RecallRegion)}
              options={[
                { value: 'us-east-1', label: 'us-east-1' },
                { value: 'eu-central-1', label: 'eu-central-1' },
              ]}
            />
            <Button onClick={handleCreateOrganization} disabled={isCreating}>
              {isCreating ? <LoadingSpinner /> : 'Create Organization'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Select
              id="org-selector"
              label="Select organization"
              value={selectedOrgId}
              onChange={(event) => setSelectedOrgId(event.target.value)}
              options={organizations.map((organization) => ({
                value: organization.id,
                label: organization.name,
              }))}
            />
            {selectedOrg ? (
              <p className="text-sm text-slate-600">
                Region: <span className="font-medium">{selectedOrg.recallRegion}</span>
              </p>
            ) : null}
          </div>
        )}
      </Card>

      {selectedOrgId ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Total Licenses">
              <p className="text-2xl font-semibold text-slate-900">{summary?.total ?? 0}</p>
            </Card>
            <Card title="Active Licenses">
              <p className="text-2xl font-semibold text-emerald-700">{summary?.active ?? 0}</p>
            </Card>
            <Card title="Revoked Licenses">
              <p className="text-2xl font-semibold text-red-700">{summary?.revoked ?? 0}</p>
            </Card>
          </div>

          <Card title="Quick Actions">
            <div className="flex flex-wrap gap-3">
              <Link href={`/admin/users?orgId=${selectedOrgId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                Manage Users
              </Link>
              <Link href={`/admin/licenses?orgId=${selectedOrgId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                Manage Licenses
              </Link>
              <Link href={`/admin/settings?orgId=${selectedOrgId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                Global Settings
              </Link>
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
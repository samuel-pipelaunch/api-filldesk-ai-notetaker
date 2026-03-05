'use client';

import { useMemo, useState } from 'react';

import { apiClient, type ImportResult } from '../../lib/api-client';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

interface DraftUser {
  email: string;
  name: string;
  sfUserId: string;
  sfOrgId: string;
  role: 'admin' | 'user';
}

interface UserImportFormProps {
  orgId: string;
  onImported: () => void;
}

const emptyUser: DraftUser = {
  email: '',
  name: '',
  sfUserId: '',
  sfOrgId: '',
  role: 'user',
};

export function UserImportForm({ orgId, onImported }: UserImportFormProps) {
  const [jsonText, setJsonText] = useState('');
  const [draftUser, setDraftUser] = useState<DraftUser>(emptyUser);
  const [manualUsers, setManualUsers] = useState<DraftUser[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasUsersToImport = useMemo(() => {
    return jsonText.trim().length > 0 || manualUsers.length > 0;
  }, [jsonText, manualUsers.length]);

  function addManualUser(): void {
    if (!draftUser.email.trim() || !draftUser.name.trim()) {
      setError('Name and email are required to add a user.');
      return;
    }

    setManualUsers((previous) => [...previous, draftUser]);
    setDraftUser(emptyUser);
    setError('');
  }

  function removeManualUser(index: number): void {
    setManualUsers((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleImport(): Promise<void> {
    setError('');
    setResult(null);
    setIsSubmitting(true);

    try {
      let usersPayload: Array<{
        email: string;
        name: string;
        sfUserId?: string;
        sfOrgId?: string;
        role?: 'admin' | 'user';
      }> = [];

      if (jsonText.trim()) {
        const parsed = JSON.parse(jsonText) as Array<Record<string, unknown>>;
        if (!Array.isArray(parsed)) {
          throw new Error('JSON input must be an array of users.');
        }

        usersPayload = parsed.map((item) => ({
          email: String(item.email ?? ''),
          name: String(item.name ?? ''),
          sfUserId: item.sfUserId ? String(item.sfUserId) : undefined,
          sfOrgId: item.sfOrgId ? String(item.sfOrgId) : undefined,
          role: item.role === 'admin' ? 'admin' : 'user',
        }));
      } else {
        usersPayload = manualUsers.map((user) => ({
          email: user.email,
          name: user.name,
          sfUserId: user.sfUserId || undefined,
          sfOrgId: user.sfOrgId || undefined,
          role: user.role,
        }));
      }

      const importResult = await apiClient.admin.importUsers(orgId, usersPayload as never);
      setResult(importResult);
      onImported();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Failed to import users.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card title="Import Users" description="Paste JSON array or add users one-by-one.">
      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="users-json" className="text-sm font-medium text-slate-700">
            JSON users array
          </label>
          <textarea
            id="users-json"
            rows={6}
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            placeholder='[{"email":"user@acme.com","name":"User Name","role":"user"}]'
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <p className="mb-3 text-sm font-medium text-slate-700">Add users manually</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id="draft-name"
              label="Name"
              value={draftUser.name}
              onChange={(event) => setDraftUser((previous) => ({ ...previous, name: event.target.value }))}
            />
            <Input
              id="draft-email"
              label="Email"
              value={draftUser.email}
              onChange={(event) => setDraftUser((previous) => ({ ...previous, email: event.target.value }))}
            />
            <Input
              id="draft-sf-user-id"
              label="SF User ID"
              value={draftUser.sfUserId}
              onChange={(event) =>
                setDraftUser((previous) => ({ ...previous, sfUserId: event.target.value }))
              }
            />
            <Input
              id="draft-sf-org-id"
              label="SF Org ID"
              value={draftUser.sfOrgId}
              onChange={(event) =>
                setDraftUser((previous) => ({ ...previous, sfOrgId: event.target.value }))
              }
            />
            <Select
              id="draft-role"
              label="Role"
              value={draftUser.role}
              onChange={(event) =>
                setDraftUser((previous) => ({ ...previous, role: event.target.value as 'admin' | 'user' }))
              }
              options={[
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          </div>
          <div className="mt-3">
            <Button variant="outline" onClick={addManualUser}>
              Add User
            </Button>
          </div>

          {manualUsers.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {manualUsers.map((user, index) => (
                <li key={`${user.email}-${index}`} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                  <span>
                    {user.name} ({user.email})
                  </span>
                  <Button variant="danger" onClick={() => removeManualUser(index)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}
        {result ? (
          <Alert variant="success" title="Import finished">
            <p>
              Created: {result.created} · Updated: {result.updated} · Errors: {result.errors.length}
            </p>
          </Alert>
        ) : null}

        <Button onClick={handleImport} disabled={!hasUsersToImport || isSubmitting}>
          {isSubmitting ? 'Importing...' : 'Import Users'}
        </Button>
      </div>
    </Card>
  );
}
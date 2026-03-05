'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { UserImportForm } from '../../../components/admin/user-import-form';
import { Alert } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Table } from '../../../components/ui/table';
import { apiClient, type User } from '../../../lib/api-client';

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('orgId') ?? '';

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const canLoad = useMemo(() => orgId.length > 0, [orgId]);

  useEffect(() => {
    if (!canLoad) {
      setIsLoading(false);
      return;
    }

    void loadUsers();
  }, [canLoad, orgId]);

  async function loadUsers(): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.admin.listUsers(orgId, true);
      setUsers(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }

  async function saveUser(): Promise<void> {
    if (!selectedUser) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updatedUser = await apiClient.admin.updateUser(orgId, selectedUser.id, {
        name: selectedUser.name,
        role: selectedUser.role,
        isActive: selectedUser.isActive,
      });

      setUsers((previous) =>
        previous.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );
      setSelectedUser(updatedUser);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update user.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!canLoad) {
    return <Alert variant="warning">Missing orgId query parameter.</Alert>;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-600">Manage organization users and roles.</p>
        </div>
        <Button variant="outline" onClick={() => setShowImport((previous) => !previous)}>
          {showImport ? 'Hide Import' : 'Import Users'}
        </Button>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {showImport ? <UserImportForm orgId={orgId} onImported={loadUsers} /> : null}

      <Card title="Users">
        <Table
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'sfUserId', header: 'SF User ID' },
            { key: 'sfOrgId', header: 'SF Org ID' },
            { key: 'role', header: 'Role' },
            { key: 'active', header: 'Status' },
            { key: 'actions', header: 'Actions' },
          ]}
          isEmpty={!isLoading && users.length === 0}
          emptyMessage="No users found."
        >
          {users.map((user) => (
            <tr key={user.id} className="text-sm text-slate-700">
              <td className="px-4 py-3">{user.name}</td>
              <td className="px-4 py-3">{user.email}</td>
              <td className="px-4 py-3">{user.sfUserId ?? '—'}</td>
              <td className="px-4 py-3">{user.sfOrgId ?? '—'}</td>
              <td className="px-4 py-3">{user.role}</td>
              <td className="px-4 py-3">
                <Badge variant={user.isActive ? 'active' : 'revoked'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Button variant="outline" onClick={() => setSelectedUser(user)}>
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {selectedUser ? (
        <Card title="Edit User" description={selectedUser.email}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id="edit-user-name"
              label="Name"
              value={selectedUser.name}
              onChange={(event) =>
                setSelectedUser((previous) =>
                  previous ? { ...previous, name: event.target.value } : previous,
                )
              }
            />
            <Select
              id="edit-user-role"
              label="Role"
              value={selectedUser.role}
              onChange={(event) =>
                setSelectedUser((previous) =>
                  previous
                    ? { ...previous, role: event.target.value as 'admin' | 'user' }
                    : previous,
                )
              }
              options={[
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            <Select
              id="edit-user-active"
              label="Active"
              value={selectedUser.isActive ? 'true' : 'false'}
              onChange={(event) =>
                setSelectedUser((previous) =>
                  previous ? { ...previous, isActive: event.target.value === 'true' } : previous,
                )
              }
              options={[
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={saveUser} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
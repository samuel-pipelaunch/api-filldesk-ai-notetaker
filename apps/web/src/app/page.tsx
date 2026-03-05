import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Welcome to FillDesk AI Notetaker</h1>
      <p className="text-sm text-slate-600">
        Use the dashboards below to manage organizations, users, licenses, and meeting settings.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
        >
          <h2 className="font-medium text-slate-900">Admin Dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">Manage orgs, licenses, and global settings.</p>
        </Link>
        <Link
          href="/user"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
        >
          <h2 className="font-medium text-slate-900">User Dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">View meetings and control personal bot settings.</p>
        </Link>
      </div>
    </section>
  );
}
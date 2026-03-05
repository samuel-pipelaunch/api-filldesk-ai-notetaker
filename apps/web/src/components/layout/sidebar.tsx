'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '../../lib/utils';

const links = [
  { href: '/admin', label: 'Admin Dashboard' },
  { href: '/user', label: 'User Dashboard' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-white p-4 md:block">
      <nav className="space-y-1" aria-label="Main navigation">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
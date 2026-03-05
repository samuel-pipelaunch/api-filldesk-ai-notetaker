import type { ReactNode } from 'react';

import { Button } from './button';

export interface TableColumn {
  key: string;
  header: string;
  className?: string;
}

export interface TableProps {
  columns: TableColumn[];
  children: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function Table({ columns, children, isEmpty = false, emptyMessage = 'No data found.' }: TableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 bg-white">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 ${column.className ?? ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{isEmpty ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">{emptyMessage}</td></tr> : children}</tbody>
        </table>
      </div>
    </div>
  );
}

export interface TablePaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function TablePagination({ total, limit, offset, onPrevious, onNext }: TablePaginationProps) {
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);

  return (
    <div className="mt-3 flex items-center justify-between">
      <p className="text-sm text-slate-600">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onPrevious} disabled={offset <= 0}>
          Previous
        </Button>
        <Button variant="outline" onClick={onNext} disabled={offset + limit >= total}>
          Next
        </Button>
      </div>
    </div>
  );
}
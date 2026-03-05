import { cn } from '../../lib/utils';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-label="Loading"
      className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600', className)}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} aria-hidden="true" />;
}
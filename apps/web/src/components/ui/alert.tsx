import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

type AlertVariant = 'error' | 'warning' | 'success' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  return (
    <div className={cn('rounded-md border px-3 py-2 text-sm', variantClasses[variant], className)} role="alert">
      {title ? <p className="font-medium">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}
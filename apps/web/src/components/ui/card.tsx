import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function Card({ title, description, actions, className, children, ...props }: CardProps) {
  return (
    <section className={cn('rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)} {...props}>
      {title || description || actions ? (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}
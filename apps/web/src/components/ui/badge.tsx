import { cn } from '../../lib/utils';

type BadgeVariant = 'active' | 'revoked' | 'pending' | 'connected' | 'default';

export interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  revoked: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-800',
  connected: 'bg-blue-100 text-blue-700',
  default: 'bg-slate-100 text-slate-700',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  );
}
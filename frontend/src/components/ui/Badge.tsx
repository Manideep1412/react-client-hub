import { clsx } from 'clsx';

type Variant = 'open' | 'pending' | 'resolved' | 'closed' | 'default';

const variants: Record<Variant, string> = {
  open:     'bg-blue-50 text-blue-700 border border-blue-100',
  pending:  'bg-amber-50 text-amber-700 border border-amber-100',
  resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  closed:   'bg-gray-100 text-gray-500 border border-gray-200',
  default:  'bg-gray-100 text-gray-600 border border-gray-200',
};

interface BadgeProps {
  label: string;
  variant?: Variant;
  className?: string;
}

export default function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span className={clsx('badge', variants[variant], className)}>
      {label}
    </span>
  );
}

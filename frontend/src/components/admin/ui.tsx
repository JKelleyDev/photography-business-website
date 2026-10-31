/* shadcn/ui-style primitives for the admin dashboard.
   Tokens: white surfaces, `line` borders, `wash` fills, ink text, fixer secondary,
   safelight for destructive actions and "needs attention" dots. */
import {
  ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode,
  SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, useEffect, useId, useRef,
} from 'react';
import { X } from 'lucide-react';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 focus-visible:ring-offset-1';

/* ---------- Button ---------- */
type Variant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'default' | 'lg' | 'icon';

export function buttonClass(variant: Variant = 'default', size: Size = 'default', className = '') {
  const variants: Record<Variant, string> = {
    default: 'bg-ink text-white hover:bg-ink/90',
    outline: 'border border-line bg-white hover:bg-wash',
    secondary: 'bg-wash text-ink hover:bg-line',
    ghost: 'hover:bg-wash',
    destructive: 'bg-safelight text-white hover:bg-safelight/90',
  };
  const sizes: Record<Size, string> = {
    sm: 'h-9 px-3 text-[13px]',
    default: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
    icon: 'h-10 w-10',
  };
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    ring, variants[variant], sizes[size], className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />
  ),
);

/* ---------- Form controls ---------- */
const field = cn(
  'w-full rounded-md border border-line bg-white px-3 text-base sm:text-sm placeholder:text-fixer/70',
  'disabled:cursor-not-allowed disabled:bg-wash disabled:text-fixer',
  'focus-visible:outline-none focus-visible:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink/10',
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(field, 'h-10', className)} {...p} />,
);
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, 'resize-none py-2', className)} {...p} />,
);
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => (
    <select ref={ref} className={cn(field, 'h-10 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%235F6D67%27 stroke-width=%272%27 viewBox=%270 0 24 24%27><path d=%27m6 9 6 6 6-6%27/></svg>")] bg-[position:right_0.6rem_center] bg-no-repeat pr-9', className)} {...p} />
  ),
);

export function Label({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-medium leading-none', className)} {...p} />;
}

/** Label + control + optional hint, with the label wired to the control by id. */
export function Field({ label, hint, children, className }: {
  label: string; hint?: ReactNode; className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {hint && <p className="text-[13px] text-fixer">{hint}</p>}
    </div>
  );
}

export function Switch({ checked, onChange, label, id }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; id?: string;
}) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', ring,
        checked ? 'bg-ink' : 'bg-line')}>
      <span className={cn('inline-block size-5 rounded-full bg-white shadow-sm transition-transform',
        checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function Checkbox({ checked, onChange, children }: {
  checked: boolean; onChange: (v: boolean) => void; children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-line accent-ink" />
      <span>{children}</span>
    </label>
  );
}

/* ---------- Display ---------- */
export type Tone = 'neutral' | 'info' | 'success' | 'warn' | 'danger' | 'outline';
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const tones: Record<Tone, string> = {
    neutral: 'bg-wash text-ink border-line',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-safelight border-red-200',
    outline: 'bg-white text-fixer border-line',
  };
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone], className)}>
      {children}
    </span>
  );
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const STATUS_TONE: Record<string, Tone> = {
  new: 'info', contacted: 'warn', booked: 'success', closed: 'outline',
  active: 'info', delivered: 'success', archived: 'outline',
  draft: 'outline', sent: 'info', paid: 'success', void: 'neutral',
  overdue: 'danger', 'due soon': 'warn', pending: 'warn', approved: 'success',
};

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-lg border border-line bg-white', className)}>{children}</div>;
}
export function CardHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 sm:px-5">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-fixer">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-wash', className)} />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="divide-y divide-line" >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </Card>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-fixer">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-6 py-14 text-center">
      {icon && <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-wash text-fixer [&_svg]:size-5">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-fixer">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Segmented filter (shadcn Tabs look). Scrolls sideways on small screens. */
export function Segmented<T extends string>({ value, onChange, options, label, counts }: {
  value: T; onChange: (v: T) => void; options: readonly T[]; label: string; counts?: Partial<Record<T, number>>;
}) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex h-10 items-center gap-1 rounded-md bg-wash p-1">
        {options.map((o) => (
          <button key={o} role="tab" aria-selected={value === o} onClick={() => onChange(o)}
            className={cn('inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 text-[13px] font-medium capitalize transition-colors', ring,
              value === o ? 'bg-white text-ink shadow-sm' : 'text-fixer hover:text-ink')}>
            {o}
            {counts?.[o] ? <span className="tabular-nums text-fixer">{counts[o]}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">{children}</div>;
}

/* ---------- Dialog: bottom sheet on phones, centred dialog from sm up ---------- */
export function Dialog({ open, onClose, title, description, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; description?: ReactNode;
  children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])');
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={cn('develop relative flex max-h-[92dvh] w-full flex-col rounded-t-xl border border-line bg-white shadow-xl sm:rounded-lg',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4 sm:pt-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-fixer">{description}</p>}
          </div>
          <button data-close onClick={onClose} aria-label="Close" className={cn('-mr-2 -mt-1 rounded-md p-2 text-fixer hover:bg-wash hover:text-ink', ring)}>
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pt-2">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Row-based list that reads as a table on desktop and stacked cards on phones. */
export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cn('divide-y divide-line overflow-hidden', className)}>{children}</Card>;
}

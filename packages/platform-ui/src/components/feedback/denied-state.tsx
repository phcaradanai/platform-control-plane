import { ShieldAlert } from 'lucide-react';
import { useId } from 'react';
import type { ReactNode } from 'react';

export interface DeniedStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Canonical insufficient-access state; permission policy and recovery stay product-owned. */
export function DeniedState({ title, description, action }: DeniedStateProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-warning/40 bg-card p-10 text-center"
    >
      <ShieldAlert className="size-8 text-warning" aria-hidden="true" />
      <h2 id={headingId} className="text-sm font-semibold">
        {title}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  );
}

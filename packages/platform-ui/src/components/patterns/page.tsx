import { useId } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

export interface ApplicationPageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** The route-level content frame. It sets measure and vertical rhythm only. */
export function ApplicationPage({
  children,
  className,
  ...props
}: ApplicationPageProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PageHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backLink?: ReactNode;
  status?: ReactNode;
}

/** A consistent h1-and-actions row without prescribing product information architecture. */
export function PageHeader({
  title,
  description,
  actions,
  backLink,
  status,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-2">
        {backLink ? <div className="mb-3">{backLink}</div> : null}
        <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
        {status ? <div className="pt-1">{status}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export interface PageSectionProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** A semantic section with an optional heading, description, and action slot. */
export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: PageSectionProps) {
  const generatedHeadingId = useId();
  const hasHeading = Boolean(title);

  return (
    <section
      aria-labelledby={hasHeading ? generatedHeadingId : undefined}
      className={cn('min-w-0 space-y-4', className)}
      {...props}
    >
      {hasHeading || description || actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            {hasHeading ? (
              <h2
                id={generatedHeadingId}
                className="break-words text-lg font-semibold tracking-tight"
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

export interface SettingsNavItem {
  href: string;
  label: string;
  description?: string;
  current?: boolean;
  disabled?: boolean;
}

export interface SettingsLayoutProps extends HTMLAttributes<HTMLDivElement> {
  navigation: readonly SettingsNavItem[];
  children: ReactNode;
  navLabel?: string;
}

/** Responsive settings navigation: horizontal overflow on mobile, rail on desktop. */
export function SettingsLayout({
  navigation,
  children,
  navLabel = 'Settings navigation',
  className,
  ...props
}: SettingsLayoutProps) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-8 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]',
        className,
      )}
      {...props}
    >
      <nav
        aria-label={navLabel}
        className="min-w-0 max-w-full overflow-hidden border-b border-border pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6"
      >
        <ul className="flex min-w-0 max-w-full gap-1 overflow-x-auto lg:grid lg:min-w-0 lg:overflow-visible">
          {navigation.map(item => {
            const disabled = item.disabled === true;

            return (
              <li key={item.href} className="min-w-0 shrink-0 lg:shrink">
                <a
                  href={item.href}
                  aria-current={item.current ? 'page' : undefined}
                  aria-disabled={disabled || undefined}
                  tabIndex={disabled ? -1 : undefined}
                  onClick={event => {
                    if (disabled) event.preventDefault();
                  }}
                  className={cn(
                    'flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:items-start lg:gap-1 lg:flex-col',
                    item.current
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    disabled && 'pointer-events-none opacity-50',
                  )}
                >
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.description ? (
                    <span className="hidden max-w-[12rem] text-xs font-normal leading-5 lg:block">
                      {item.description}
                    </span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

import { Menu } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';
import { Button } from '../ui/button.js';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet.js';

export interface ApplicationNavItem {
  /** Route-owned destination. The shell deliberately does not depend on a router. */
  href: string;
  label: string;
  icon?: ReactNode;
  current?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
}

export interface ApplicationShellProps {
  /** Brand or product mark supplied by the consuming application. */
  brand: ReactNode;
  /** Short title shown in the mobile header. */
  mobileTitle: string;
  navigation: readonly ApplicationNavItem[];
  children: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  navLabel?: string;
  mobileNavLabel?: string;
  mobileMenuLabel?: string;
  closeMobileNavLabel?: string;
  mobileNavDescription?: string;
  skipLinkLabel?: string;
  mainId?: string;
  className?: string;
  mainClassName?: string;
}

interface ApplicationNavigationProps {
  items: readonly ApplicationNavItem[];
  onNavigate?: () => void;
}

function ApplicationNavigation({
  items,
  onNavigate,
}: ApplicationNavigationProps) {
  return (
    <ul className="grid gap-1">
      {items.map(item => {
        const disabled = item.disabled === true;

        return (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? -1 : undefined}
              onClick={event => {
                if (disabled) {
                  event.preventDefault();
                  return;
                }
                onNavigate?.();
              }}
              className={cn(
                'group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                item.current
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              {item.icon ? (
                <span
                  className="flex size-4 shrink-0 items-center justify-center"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="shrink-0 text-xs font-normal">
                  {item.badge}
                </span>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Application chrome that stays neutral about routing and product content.
 * Desktop uses a persistent navigation rail; narrow viewports move the same
 * navigation into an accessible focus-trapped sheet.
 */
export function ApplicationShell({
  brand,
  mobileTitle,
  navigation,
  children,
  headerActions,
  footer,
  navLabel = 'Application navigation',
  mobileNavLabel = 'Mobile application navigation',
  mobileMenuLabel = 'Open navigation',
  closeMobileNavLabel = 'Close navigation',
  mobileNavDescription = 'Choose a destination.',
  skipLinkLabel = 'Skip to main content',
  mainId = 'main-content',
  className,
  mainClassName,
}: ApplicationShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className={cn('min-h-screen bg-background text-foreground', className)}
    >
      <a className="skip-link" href={`#${mainId}`}>
        {skipLinkLabel}
      </a>
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-muted/20 lg:flex">
          <div className="flex min-h-16 items-center border-b border-border px-5">
            {brand}
          </div>
          <nav aria-label={navLabel} className="flex-1 overflow-y-auto p-3">
            <ApplicationNavigation items={navigation} />
          </nav>
          {footer ? (
            <div className="border-t border-border p-3">{footer}</div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 lg:hidden"
                  aria-label={mobileMenuLabel}
                >
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                closeLabel={closeMobileNavLabel}
                className="gap-6"
              >
                <div className="pr-8">
                  <SheetTitle>{mobileTitle}</SheetTitle>
                  <SheetDescription>{mobileNavDescription}</SheetDescription>
                </div>
                <nav aria-label={mobileNavLabel}>
                  <ApplicationNavigation
                    items={navigation}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </nav>
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1 truncate text-sm font-semibold lg:hidden">
              {mobileTitle}
            </div>
            {headerActions ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {headerActions}
              </div>
            ) : null}
          </header>
          <main
            id={mainId}
            tabIndex={-1}
            className={cn('min-w-0 flex-1', mainClassName)}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

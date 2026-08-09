import { Link } from '@tanstack/react-router';

import { appInfo } from '../../lib/app-info';
import { ThemeToggle } from '@platform/ui';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight hover:opacity-80"
        >
          {appInfo.title}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink to="/" label="Home" />
          <NavLink to="/components" label="Components" />
          <NavLink to="/table" label="Table" />
          <NavLink to="/form" label="Form" />
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, label }: { to: '/' | '/components' | '/table' | '/form'; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{ 'aria-current': 'page' }}
      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&[aria-current='page']]:bg-muted [&[aria-current='page']]:text-foreground"
    >
      {label}
    </Link>
  );
}

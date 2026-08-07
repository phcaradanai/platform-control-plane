import type { ReactNode } from 'react';

import { Header } from './header';
import { Footer } from './footer';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}

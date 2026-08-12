import type { ReactNode } from 'react';

import { Link, useRouterState } from '@tanstack/react-router';

import { ApplicationShell, ThemeToggle } from '@platform/ui';
import { appInfo } from '../../lib/app-info';
import { featurePacks } from '../../feature-packs/registry';

{% if 'notifications' in values.capabilities %}
import { NotificationsCenter } from '../../capabilities/notifications/notifications-center';
{% endif %}
{% if 'i18n' in values.capabilities %}
import { LanguageSwitcher } from '../../capabilities/i18n/language-switcher';
{% endif %}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: state => state.location.pathname,
  });

  const navigation = [
    {
      href: '/',
      label: 'Home',
      current: pathname === '/',
    },
    {
      href: '/components',
      label: 'Components',
      current: pathname === '/components',
    },
    {
      href: '/table',
      label: 'Table',
      current: pathname === '/table',
    },
    {
      href: '/form',
      label: 'Form',
      current: pathname === '/form',
    },
    ...featurePacks.map(pack => ({
      href: pack.route,
      label: pack.navigation.label,
      current: pathname === pack.route,
      icon: pack.navigation.icon ? (
        <pack.navigation.icon className="size-4" aria-hidden="true" />
      ) : undefined,
    })),
  ];

  return (
    <ApplicationShell
      brand={
        <Link to="/" className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {appInfo.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            Platform application
          </span>
        </Link>
      }
      mobileTitle={appInfo.title}
      navigation={navigation}
      headerActions={
        <>
          {% if 'i18n' in values.capabilities %}
          <LanguageSwitcher />
          {% endif %}
          {% if 'notifications' in values.capabilities %}
          <NotificationsCenter />
          {% endif %}
          <ThemeToggle />
        </>
      }
      footer={
        <p className="px-3 text-xs text-muted-foreground">
          {appInfo.title} · mode: {appInfo.mode}
        </p>
      }
      mainClassName="bg-muted/10"
    >
      {children}
    </ApplicationShell>
  );
}

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
import { useI18n } from '../../capabilities/i18n/i18n-provider';
{% endif %}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: state => state.location.pathname,
  });

{% if 'i18n' in values.capabilities %}
  const { t } = useI18n();
  const translate = (key: string, fallback: string) => {
    const message = t(key);
    return message === key ? fallback : message;
  };
{% endif %}

  // Components, Table, and Form remain direct developer verification routes,
  // but are intentionally not application-facing shell defaults.
  const navigation = [
    {
      href: '/',
      label: {% if 'i18n' in values.capabilities %}translate('navigation.home', 'Home'){% else %}'Home'{% endif %},
      current: pathname === '/',
    },
    ...featurePacks.map(pack => ({
      href: pack.route,
      label: {% if 'i18n' in values.capabilities %}translate(`navigation.${pack.id}`, pack.navigation.label){% else %}pack.navigation.label{% endif %},
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

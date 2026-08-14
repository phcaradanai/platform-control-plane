import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

/**
 * The `i18n` capability's composed effect: a small, dependency-free
 * translation context (no new npm package - see docs/capabilities.md's
 * no-new-dependencies rule) with two locales. Real apps with heavier i18n
 * needs can replace this with a library later; this proves the extension
 * point (provider mounted in app.tsx, consumed via `useI18n()`) without
 * committing every generated app to one.
 */
export type Locale = 'en' | 'es';

const MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    'language.label': 'Language',
    'language.en': 'English',
    'language.es': 'Spanish',
    'navigation.home': 'Home',
    'navigation.authentication': 'Authentication',
    'navigation.profile': 'Profile',
    'navigation.rbac': 'Permissions',
    'navigation.dashboard': 'Dashboard',
    'navigation.settings': 'Settings',
    'navigation.reports': 'Reports',
    'navigation.history': 'History',
    'navigation.audit-log': 'Audit log',
  },
  es: {
    'language.label': 'Idioma',
    'language.en': 'Inglés',
    'language.es': 'Español',
    'navigation.home': 'Inicio',
    'navigation.authentication': 'Autenticación',
    'navigation.profile': 'Perfil',
    'navigation.rbac': 'Permisos',
    'navigation.dashboard': 'Panel',
    'navigation.settings': 'Configuración',
    'navigation.reports': 'Informes',
    'navigation.history': 'Historial',
    'navigation.audit-log': 'Registro de auditoría',
  },
};

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'es'];

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  defaultLocale = 'en',
}: {
  children: ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  const t = useCallback(
    (key: string) => MESSAGES[locale][key] ?? key,
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n() must be used within an <I18nProvider>.');
  }
  return context;
}

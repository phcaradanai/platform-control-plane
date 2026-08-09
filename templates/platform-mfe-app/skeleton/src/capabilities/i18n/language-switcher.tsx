import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/ui';

import { SUPPORTED_LOCALES, useI18n } from './i18n-provider';
import type { Locale } from './i18n-provider';

/** Composed alongside `I18nProvider`; renders in the header when `i18n` is selected. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="language-switcher" className="sr-only">
        {t('language.label')}
      </Label>
      <Select value={locale} onValueChange={value => setLocale(value as Locale)}>
        <SelectTrigger id="language-switcher" aria-label={t('language.label')} className="h-9 w-auto gap-2 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LOCALES.map(supported => (
            <SelectItem key={supported} value={supported}>
              {t(`language.${supported}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

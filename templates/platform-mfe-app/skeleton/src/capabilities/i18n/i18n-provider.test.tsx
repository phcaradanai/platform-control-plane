import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { I18nProvider, useI18n } from './i18n-provider';
import { LanguageSwitcher } from './language-switcher';

describe('I18nProvider / useI18n', () => {
  it('defaults to English and falls back to the key when a message is missing', () => {
    function Probe() {
      const { locale, t } = useI18n();
      return (
        <div>
          <span data-testid="locale">{locale}</span>
          <span data-testid="known">{t('language.label')}</span>
          <span data-testid="unknown">{t('does.not.exist')}</span>
        </div>
      );
    }

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('known')).toHaveTextContent('Language');
    expect(screen.getByTestId('unknown')).toHaveTextContent('does.not.exist');
  });

  it('throws when useI18n is used outside the provider', () => {
    function Probe() {
      useI18n();
      return null;
    }
    expect(() => render(<Probe />)).toThrow(
      'useI18n() must be used within an <I18nProvider>.',
    );
  });
});

describe('LanguageSwitcher', () => {
  it('switches the active locale and re-renders translated labels', async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>,
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('English');

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Spanish' }));

    expect(screen.getByRole('combobox')).toHaveTextContent('Español');
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SettingsScreen } from './index';

describe('settings feature pack', () => {
  it('renders accessible preference sections and controls', () => {
    render(<SettingsScreen />);

    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Profile preferences' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Display name' }),
    ).toHaveAccessibleDescription('A name shown in this application only.');
    expect(
      screen.getByRole('switch', { name: 'Product updates' }),
    ).toBeChecked();
  });

  it('communicates a pending save and completion state', async () => {
    const user = userEvent.setup();
    render(<SettingsScreen />);

    await user.click(screen.getByRole('button', { name: 'Save preferences' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Saving local preferences',
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Preferences saved locally',
      );
    });
  });
});

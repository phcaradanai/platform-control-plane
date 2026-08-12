import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ToastProvider } from '@platform/ui';
import { NotificationsCenter } from './notifications-center';

function renderCenter() {
  return render(
    <ToastProvider dismissLabel="Dismiss notification">
      <NotificationsCenter />
    </ToastProvider>,
  );
}

describe('NotificationsCenter', () => {
  it('shows an unread badge until the menu is opened', async () => {
    const user = userEvent.setup();
    renderCenter();

    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    expect(await screen.findByText('Welcome')).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('lists the demo notifications when opened', async () => {
    const user = userEvent.setup();
    renderCenter();

    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Welcome')).toBeInTheDocument();
    expect(
      within(menu).getByText(/Toasts are shared infrastructure/),
    ).toBeInTheDocument();
  });

  it('sends a toast through the shared ToastProvider', async () => {
    const user = userEvent.setup();
    renderCenter();

    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Send test notification' }),
    );

    expect(await screen.findByText('Test notification')).toBeInTheDocument();
  });
});

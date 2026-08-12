import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ToastProvider } from '@platform/ui';
import { DashboardScreen } from './index';

function renderDashboard() {
  return render(
    <ToastProvider dismissLabel="Dismiss notification">
      <DashboardScreen />
    </ToastProvider>,
  );
}

describe('dashboard feature pack', () => {
  it('renders neutral summary and tabular sample data', () => {
    renderDashboard();

    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Application platform')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Recent activity' }),
    ).toBeInTheDocument();
  });

  it('supports a range change and pending refresh interaction', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('combobox', { name: 'Time range' }));
    await user.click(
      await screen.findByRole('option', { name: 'Last 30 days' }),
    );
    expect(
      screen.getByText('Showing the last 30 days of sample activity.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refresh data' }));
    expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
  });
});

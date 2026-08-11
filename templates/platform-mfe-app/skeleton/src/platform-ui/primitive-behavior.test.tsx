import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  Avatar,
  ConfirmDialog,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@platform/ui';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('shared Phase 5.5A primitives', () => {
  it('opens Sheet from the keyboard and closes with Escape while restoring focus', async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button type="button">Open panel</button>
        </SheetTrigger>
        <SheetContent side="right" closeLabel="Close panel">
          <SheetTitle>Panel title</SheetTitle>
          <SheetDescription>Panel description</SheetDescription>
        </SheetContent>
      </Sheet>,
    );

    const trigger = screen.getByRole('button', { name: 'Open panel' });
    trigger.focus();
    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog', { name: 'Panel title' });
    expect(dialog).toHaveClass('right-0');
    expect(screen.getByText('Panel description')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close panel' }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Panel title' }),
      ).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it('uses caller-provided action labels and disables dismissal while pending', async () => {
    const user = userEvent.setup();
    const action = deferred<void>();
    const onConfirm = vi.fn(() => action.promise);

    render(
      <ConfirmDialog
        trigger={<button type="button">Remove item</button>}
        title="Remove item?"
        description="This action cannot be undone."
        confirmLabel="Remove"
        cancelLabel="Keep item"
        pendingLabel="Removing…"
        closeLabel="Close confirmation"
        onConfirm={onConfirm}
        onConfirmError={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Remove item' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Remove item?' });
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Removing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Keep item' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Close confirmation' }),
    ).toBeDisabled();

    await user.keyboard('{Escape}');
    expect(
      screen.getByRole('dialog', { name: 'Remove item?' }),
    ).toBeInTheDocument();

    action.resolve();
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Remove item?' }),
      ).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps a failed confirmation open and delegates error messaging to the caller', async () => {
    const user = userEvent.setup();
    const action = deferred<void>();
    const failure = new Error('request failed');
    const onConfirmError = vi.fn();

    render(
      <ConfirmDialog
        trigger={<button type="button">Delete record</button>}
        title="Delete record?"
        description="The record will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        pendingLabel="Deleting…"
        closeLabel="Close confirmation"
        onConfirm={() => action.promise}
        onConfirmError={onConfirmError}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete record' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Delete record?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    action.reject(failure);
    await waitFor(() => {
      expect(onConfirmError).toHaveBeenCalledWith(failure);
      expect(screen.getByRole('button', { name: 'Delete' })).not.toBeDisabled();
    });
    expect(
      screen.getByRole('dialog', { name: 'Delete record?' }),
    ).toBeInTheDocument();
  });

  it('announces avatar identity for both initials fallback and image failure', () => {
    const { rerender } = render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent(
      'AL',
    );

    rerender(<Avatar name="Grace Hopper" src="/avatar.png" />);
    const image = screen.getByRole('img', { name: 'Grace Hopper' });
    expect(image.tagName).toBe('IMG');

    fireEvent.error(image);
    const fallback = screen.getByRole('img', { name: 'Grace Hopper' });
    expect(fallback.tagName).toBe('SPAN');
    expect(fallback).toHaveTextContent('GH');
  });
});

import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from './button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog.js';

export interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Localized label shown while the confirmation action is pending. */
  pendingLabel: string;
  /** Localized label for the dialog's built-in dismiss button. */
  closeLabel: string;
  /** Renders the confirm action as the `destructive` button variant. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  /**
   * Receives a rejected confirmation action. The dialog stays open and the
   * caller owns user-facing error reporting (usually an i18n-aware toast).
   */
  onConfirmError: (error: unknown) => void;
}

/**
 * Confirm/cancel wrapper over `Dialog` for anything that needs an
 * "are you sure?" step before running - especially destructive actions
 * (delete, remove, revoke). Manages its own open state and a pending
 * state around `onConfirm` so callers don't each re-implement the same
 * "disable actions while the operation is in flight, then close on
 * success" sequence. Labels are caller-provided so applications can use
 * their own i18n source; rejected actions stay open and are handed to
 * onConfirmError for product-level recovery messaging.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  closeLabel,
  destructive = false,
  onConfirm,
  onConfirmError,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      onConfirmError(error);
    } finally {
      setPending(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (pending && !nextOpen) {
      return;
    }
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-w-sm"
        closeLabel={closeLabel}
        closeDisabled={pending}
        onEscapeKeyDown={event => {
          if (pending) event.preventDefault();
        }}
        onInteractOutside={event => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => void handleConfirm()}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

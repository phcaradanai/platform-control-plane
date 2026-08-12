import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';

import { cn } from '../../lib/cn.js';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export type SheetSide = 'left' | 'right' | 'top' | 'bottom';

const sideClasses: Record<SheetSide, string> = {
  left: 'inset-y-0 left-0 h-dvh w-full max-w-xs border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  right:
    'inset-y-0 right-0 h-dvh w-full max-w-xs border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
  top: 'inset-x-0 top-0 w-full max-h-[80vh] border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top',
  bottom:
    'inset-x-0 bottom-0 w-full max-h-[80vh] border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
};

export interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Which edge of the viewport the panel slides in from. Default `left`. */
  side?: SheetSide;
  /** Accessible label for the built-in dismiss button. Localize at the app boundary. */
  closeLabel: string;
}

/**
 * Off-canvas panel (nav drawers, filter/detail panels, mobile menus) -
 * `@platform/ui`'s `Dialog` is a centered modal, which is the wrong shape
 * for anything anchored to a viewport edge. Built directly on
 * `@radix-ui/react-dialog` like `Dialog` is, so it gets the same focus
 * trap, scroll lock, and Escape-to-close behaviour for free.
 *
 * Content is app-supplied - this has no opinion on what goes inside
 * (navigation, filters, details, ...), only how the panel is placed,
 * closed, and made accessible.
 */
export const SheetContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, side = 'left', children, closeLabel, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col gap-4 border-border bg-background p-6 text-foreground shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        sideClasses[side],
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        type="button"
        aria-label={closeLabel}
        className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden="true" />
        <span className="sr-only">{closeLabel}</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = 'SheetContent';

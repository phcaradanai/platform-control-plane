import * as ToastPrimitive from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type ToastVariant = 'default' | 'success' | 'destructive';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends Required<ToastOptions> {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const variantClasses: Record<ToastVariant, string> = {
  default: 'border-border',
  success: 'border-success',
  destructive: 'border-destructive',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts(current => [
        ...current,
        {
          id,
          title: options.title,
          description: options.description ?? '',
          variant: options.variant ?? 'default',
        },
      ]);
    },
    [],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map(item => (
          <ToastPrimitive.Root
            key={item.id}
            open
            onOpenChange={open => {
              if (!open) dismiss(item.id);
            }}
            duration={5000}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-card p-4 text-card-foreground shadow-lg data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
              variantClasses[item.variant],
            )}
          >
            <div className="flex-1">
              <ToastPrimitive.Title className="text-sm font-semibold">
                {item.title}
              </ToastPrimitive.Title>
              {item.description ? (
                <ToastPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss notification"
              className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden="true">&times;</span>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

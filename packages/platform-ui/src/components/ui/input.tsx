import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '../../lib/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'input',
        invalid &&
          'border-destructive focus-visible:ring-destructive/40',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

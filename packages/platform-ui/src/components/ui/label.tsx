import { forwardRef } from 'react';
import type { LabelHTMLAttributes } from 'react';

import { cn } from '../../lib/cn.js';

// The label is associated with its control via the consumer's `htmlFor`
// prop (the Radix pattern); the a11y rule cannot see the association
// statically here, so the check is disabled for this primitive.
export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control
  <label
    ref={ref}
    className={cn('label', className)}
    {...props}
  />
));
Label.displayName = 'Label';

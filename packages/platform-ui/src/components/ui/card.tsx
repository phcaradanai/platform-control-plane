import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/cn.js';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('card', className)} {...props} />
  ),
);
Card.displayName = 'Card';

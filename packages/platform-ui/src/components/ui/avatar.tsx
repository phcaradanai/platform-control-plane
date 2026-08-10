import { useState } from 'react';

import { cn } from '../../lib/cn.js';

const PALETTE = [
  'bg-primary text-primary-foreground',
  'bg-secondary text-secondary-foreground',
  'bg-success text-success-foreground',
  'bg-warning text-warning-foreground',
  'bg-accent text-accent-foreground',
] as const;

function colorForName(name: string): string {
  const sum = name.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length] ?? PALETTE[0];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

const sizeClasses = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
} as const;

export interface AvatarProps {
  /** Person or entity this avatar represents. Required: it drives both
   * the initials fallback and the default accessible name. */
  name: string;
  /** Optional image URL. Falls back to initials on missing src or load error. */
  src?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

/**
 * Person/entity avatar: renders `src` when it loads, otherwise a
 * deterministic initials-and-colour fallback derived from `name` so the
 * same person always gets the same fallback colour. Announced to screen
 * readers as `name` either way (an image `alt` or the fallback's
 * `aria-label`) - never `aria-hidden`, since in lists (member rows,
 * assignee pickers, activity feeds) the avatar is often the only visual
 * indicator of *who*, so it must not be invisible to assistive tech.
 */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src) && !imageFailed;

  if (showImage) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('shrink-0 rounded-full object-cover', sizeClasses[size], className)}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizeClasses[size],
        colorForName(name),
        className,
      )}
    >
      {initialsFor(name)}
    </span>
  );
}

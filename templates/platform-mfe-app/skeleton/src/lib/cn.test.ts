import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 0, 'b')).toBe('a b');
  });

  it('handles nested arrays/objects via clsx', () => {
    expect(cn(['a', ['b']], { c: true, d: false })).toBe('a b c');
  });

  it('returns an empty string for no classes', () => {
    expect(cn()).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import { demoFormSchema } from './schema';

describe('demoFormSchema', () => {
  it('accepts a valid submission', () => {
    const result = demoFormSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'editor',
      notify: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a short name', () => {
    const result = demoFormSchema.safeParse({
      name: 'A',
      email: 'ada@example.com',
      role: 'viewer',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['name']);
    }
  });

  it('rejects an invalid email', () => {
    const result = demoFormSchema.safeParse({
      name: 'Ada',
      email: 'nope',
      role: 'viewer',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['email']);
    }
  });

  it('rejects an unknown role', () => {
    const result = demoFormSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      role: 'superuser',
    });
    expect(result.success).toBe(false);
  });

  it('enforces the notes length cap', () => {
    const result = demoFormSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      role: 'admin',
      notify: true,
      notes: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['notes']);
    }
  });
});

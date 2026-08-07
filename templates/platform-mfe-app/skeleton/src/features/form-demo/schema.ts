import { z } from 'zod';

export const demoFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Enter a valid email address'),
  role: z.enum(['admin', 'editor', 'viewer'], {
    error: 'Choose a role',
  }),
  notify: z.boolean(),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

export type DemoFormValues = z.infer<typeof demoFormSchema>;

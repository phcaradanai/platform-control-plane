import { createFileRoute } from '@tanstack/react-router';

import { DemoForm } from '../features/form-demo/demo-form';

export const Route = createFileRoute('/form')({
  component: FormDemoPage,
});

function FormDemoPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Form demo</h1>
        <p className="text-muted-foreground">
          React Hook Form + Zod validation with accessible Radix inputs.
        </p>
      </section>
      <DemoForm />
    </div>
  );
}

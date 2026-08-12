import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckCircle2 } from 'lucide-react';

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  NotFoundState,
  ToastProvider,
  useToast,
} from '@platform/ui';

const meta = {
  title: 'Foundations / Feedback states',
  parameters: {
    docs: {
      description: {
        component:
          'Canonical loading, empty, error, not-found, and notification states for application data flows.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      <LoadingState label="Loading workspace data…" />
      <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex size-3 animate-pulse rounded-full bg-primary" />
          Inline loading indicator
        </div>
      </div>
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <EmptyState
      title="No environments yet"
      description="Create an environment to start reviewing application configuration."
      action={<Button>Create environment</Button>}
    />
  ),
};

export const Error: Story = {
  render: () => (
    <ErrorState
      title="The environment could not be loaded"
      message="The request timed out. Retry when the service is available again."
      retryLabel="Try again"
      onRetry={() => undefined}
    />
  ),
};

export const NotFound: Story = {
  render: () => (
    <NotFoundState
      title="Environment not found"
      description="The environment you are looking for does not exist or has moved."
      action={<Button variant="outline">Return to environments</Button>}
    />
  ),
};

function ToastStory() {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="max-w-xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Toast content remains application-owned while the shared provider
          handles placement, timing, and dismissal behavior.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() =>
            toast({
              title: 'Environment saved',
              description: 'The new configuration is ready for review.',
              variant: 'success',
            })
          }
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Show success
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            toast({
              title: 'Save failed',
              description: 'Try again after checking the service status.',
              variant: 'destructive',
            })
          }
        >
          Show error
        </Button>
      </div>
    </div>
  );
}

export const Notifications: Story = {
  render: () => (
    <ToastProvider dismissLabel="Dismiss notification">
      <ToastStory />
    </ToastProvider>
  ),
};

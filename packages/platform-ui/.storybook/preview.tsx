import type { Preview } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@platform/ui';
import '@unocss/reset/tailwind.css';
import 'virtual:uno.css';
import '@platform/ui/theme.css';

function PortalCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground sm:p-10">
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}

const preview: Preview = {
  decorators: [
    Story => (
      <ThemeProvider>
        <PortalCanvas>
          <Story />
        </PortalCanvas>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    a11y: {
      test: 'todo',
    },
    controls: {
      expanded: true,
    },
  },
};

export default preview;

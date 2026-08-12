import type { Meta, StoryObj } from '@storybook/react-vite';
import { Monitor, Moon, Sun } from 'lucide-react';

import { ThemeToggle, useTheme } from '@platform/ui';

const meta = {
  title: 'Foundations / Tokens and themes',
  parameters: {
    docs: {
      description: {
        component:
          'The semantic color, type, spacing, and theme contracts shared by generated applications.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const colorTokens = [
  {
    name: 'Background',
    token: '--color-background',
    foreground: '--color-foreground',
  },
  {
    name: 'Card',
    token: '--color-card',
    foreground: '--color-card-foreground',
  },
  {
    name: 'Primary',
    token: '--color-primary',
    foreground: '--color-primary-foreground',
  },
  {
    name: 'Secondary',
    token: '--color-secondary',
    foreground: '--color-secondary-foreground',
  },
  {
    name: 'Muted',
    token: '--color-muted',
    foreground: '--color-muted-foreground',
  },
  {
    name: 'Accent',
    token: '--color-accent',
    foreground: '--color-accent-foreground',
  },
  {
    name: 'Success',
    token: '--color-success',
    foreground: '--color-success-foreground',
  },
  {
    name: 'Warning',
    token: '--color-warning',
    foreground: '--color-warning-foreground',
  },
  {
    name: 'Destructive',
    token: '--color-destructive',
    foreground: '--color-destructive-foreground',
  },
];

export const SemanticColors: Story = {
  render: () => (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Semantic colors
        </h1>
        <p className="text-sm text-muted-foreground">
          The same roles stay readable as the theme changes. These swatches use
          the package CSS variables directly.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {colorTokens.map(color => (
          <div
            key={color.name}
            className="rounded-lg border border-border p-4 shadow-sm"
            style={{
              backgroundColor: `rgb(var(${color.token}))`,
              color: `rgb(var(${color.foreground}))`,
            }}
          >
            <div className="font-medium">{color.name}</div>
            <code className="mt-1 block text-xs font-mono">{color.token}</code>
          </div>
        ))}
      </div>
    </section>
  ),
};

export const Typography: Story = {
  render: () => (
    <section className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">
          Platform typography
        </h1>
        <p className="text-lg text-muted-foreground">
          A calm, readable hierarchy for application work rather than a product
          brand imposed on every generated app.
        </p>
      </div>
      <div className="space-y-5">
        <h2 className="text-2xl font-semibold">Section heading</h2>
        <h3 className="text-xl font-semibold">Subsection heading</h3>
        <p className="max-w-2xl leading-7">
          Body copy keeps a comfortable measure and uses semantic foreground
          colors. Long-form application content should remain legible in both
          themes and at narrow widths.
        </p>
        <p className="text-sm text-muted-foreground">
          Supporting text clarifies state without competing with the primary
          task.
        </p>
        <code className="block rounded-md bg-muted p-3 text-sm">
          npm run build:portal
        </code>
      </div>
    </section>
  ),
};

export const SpacingAndSizing: Story = {
  render: () => (
    <section className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Spacing and sizing
        </h1>
        <p className="text-sm text-muted-foreground">
          Use the shared utility scale and let layout rhythm communicate
          grouping, hierarchy, and responsive intent.
        </p>
      </div>
      <div className="space-y-4">
        {[2, 4, 6, 8, 12, 16].map(value => (
          <div key={value} className="flex items-center gap-4">
            <div
              className="shrink-0 rounded-sm bg-primary"
              style={{ width: value * 4, height: value * 4 }}
            />
            <code className="text-sm text-muted-foreground">p-{value}</code>
            <span className="text-sm">{value * 4}px reference step</span>
          </div>
        ))}
      </div>
    </section>
  ),
};

function ThemeStory() {
  const { preference, theme } = useTheme();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Theme behavior
          </h1>
          <p className="text-sm text-muted-foreground">
            Change the real ThemeProvider preference and inspect the same
            surface in light, dark, and system modes.
          </p>
        </div>
        <ThemeToggle />
      </div>
      <div className="grid gap-4 sm:grid-cols-3" aria-live="polite">
        <div className="card p-4">
          <Sun className="size-5 text-warning" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">Preference</p>
          <p className="text-sm text-muted-foreground">{preference}</p>
        </div>
        <div className="card p-4">
          <Moon className="size-5 text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">Resolved theme</p>
          <p className="text-sm text-muted-foreground">{theme}</p>
        </div>
        <div className="card p-4">
          <Monitor
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium">Persistence</p>
          <p className="text-sm text-muted-foreground">localStorage</p>
        </div>
      </div>
    </section>
  );
}

export const Themes: Story = {
  render: () => <ThemeStory />,
};

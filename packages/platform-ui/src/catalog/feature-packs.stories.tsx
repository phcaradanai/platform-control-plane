import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ApplicationShell, Button, ThemeToggle } from '@platform/ui';
import {
  DashboardScreen,
  dashboardFeaturePack,
} from '@platform/feature-packs/dashboard';
import {
  SettingsScreen,
  settingsFeaturePack,
} from '@platform/feature-packs/settings';

const meta = {
  title: 'Feature packs',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The portal renders the feature-pack implementations copied into generated applications. A pack owns its route identity, navigation contribution, screen, neutral sample interactions, tests, and replaceable boundary notes; the application owns route registration and domain data.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DashboardPack: Story = {
  render: () => <DashboardScreen />,
  parameters: {
    docs: {
      description: {
        story: `Route ${dashboardFeaturePack.route} · navigation: ${dashboardFeaturePack.navigation.label}. Includes a responsive summary, data table, range selector, and pending refresh behavior over explicitly illustrative data.`,
      },
    },
  },
};

export const SettingsPack: Story = {
  render: () => <SettingsScreen />,
  parameters: {
    docs: {
      description: {
        story: `Route ${settingsFeaturePack.route} · navigation: ${settingsFeaturePack.navigation.label}. Includes responsive settings navigation, accessible form sections, switches, local-save pending state, and a replaceable API boundary.`,
      },
    },
  },
};

function CombinedFeaturePacks() {
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const selectedPack =
    currentPath === dashboardFeaturePack.route
      ? dashboardFeaturePack
      : settingsFeaturePack;
  const Screen = selectedPack.screen;

  return (
    <ApplicationShell
      brand={
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Generated app</p>
          <p className="truncate text-xs text-muted-foreground">
            Feature pack composition
          </p>
        </div>
      }
      mobileTitle="Generated app"
      navigation={[dashboardFeaturePack, settingsFeaturePack].map(pack => ({
        href: pack.route,
        label: pack.navigation.label,
        current: currentPath === pack.route,
        icon: pack.navigation.icon ? (
          <pack.navigation.icon className="size-4" aria-hidden="true" />
        ) : undefined,
      }))}
      headerActions={
        <>
          <ThemeToggle />
          <Button type="button" variant="outline" size="sm">
            Shared action
          </Button>
        </>
      }
      mainClassName="bg-muted/10"
    >
      <div data-feature-pack-path={currentPath}>
        <div
          className="mb-6 flex flex-wrap gap-2"
          role="group"
          aria-label="Feature pack preview"
        >
          <Button
            type="button"
            variant={currentPath === '/dashboard' ? 'default' : 'outline'}
            onClick={() => setCurrentPath('/dashboard')}
          >
            Preview dashboard
          </Button>
          <Button
            type="button"
            variant={currentPath === '/settings' ? 'default' : 'outline'}
            onClick={() => setCurrentPath('/settings')}
          >
            Preview settings
          </Button>
        </div>
        <Screen />
      </div>
    </ApplicationShell>
  );
}

export const DashboardAndSettingsComposition: Story = {
  render: () => <CombinedFeaturePacks />,
  parameters: {
    docs: {
      description: {
        story:
          'Both packs contribute independent navigation entries and screens to one shared application shell. The story uses the same pack registry objects and screens that the template composes; it does not recreate feature UI for the portal.',
      },
    },
  },
};

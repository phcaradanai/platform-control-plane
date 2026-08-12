import { Settings2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import {
  ApplicationPage,
  Badge,
  Button,
  FormField,
  FormPage,
  FormSection,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SettingsLayout,
  Switch,
} from '@platform/ui';

import type { FeaturePack } from '../contract.js';

const settingsNavigation = [
  {
    href: '#profile-preferences',
    label: 'Profile preferences',
    description: 'Personal details and locale.',
    current: true,
  },
  {
    href: '#notifications',
    label: 'Notifications',
    description: 'Choose what to receive.',
  },
  {
    href: '#appearance',
    label: 'Appearance',
    description: 'Adjust the working view.',
  },
] as const;

type SaveState = 'idle' | 'pending' | 'saved';

export function SettingsScreen() {
  const [displayName, setDisplayName] = useState('Platform workspace');
  const [timeZone, setTimeZone] = useState('utc');
  const [productUpdates, setProductUpdates] = useState(true);
  const [compactDensity, setCompactDensity] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (saveTimer.current !== undefined) {
        window.clearTimeout(saveTimer.current);
      }
    },
    [],
  );

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveState('pending');
    saveTimer.current = window.setTimeout(() => {
      setSaveState('saved');
    }, 650);
  };

  return (
    <ApplicationPage>
      <PageHeader
        title="Settings"
        description="A neutral preference layout for application-level choices. Values are stored in local component state until a product supplies its own API contract."
        status={<Badge variant="outline">Local preferences</Badge>}
      />

      <SettingsLayout navigation={settingsNavigation}>
        <FormPage
          onSubmit={save}
          actions={
            <Button
              type="submit"
              disabled={saveState === 'pending'}
              aria-busy={saveState === 'pending'}
            >
              {saveState === 'pending' ? 'Saving…' : 'Save preferences'}
            </Button>
          }
          status={
            saveState === 'saved' ? (
              <p role="status" className="text-success">
                Preferences saved locally. Connect this action to a product API
                when one is available.
              </p>
            ) : saveState === 'pending' ? (
              <p role="status" className="text-muted-foreground">
                Saving local preferences…
              </p>
            ) : null
          }
        >
          <FormSection
            id="profile-preferences"
            title="Profile preferences"
            description="Keep the first-run defaults understandable and easy to replace with product-owned fields."
          >
            <FormField
              id="settings-display-name"
              label="Display name"
              description="A name shown in this application only."
              control={
                <Input
                  value={displayName}
                  onChange={event => setDisplayName(event.target.value)}
                />
              }
              required
            />

            <div className="grid gap-2">
              <Label htmlFor="settings-time-zone">Time zone</Label>
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger id="settings-time-zone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="local">Browser local time</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm leading-5 text-muted-foreground">
                Used for dates and times shown by the application.
              </p>
            </div>
          </FormSection>

          <FormSection
            id="notifications"
            title="Notifications"
            description="Each preference is intentionally neutral; products can map these controls to their own notification contract."
          >
            <div className="flex items-start justify-between gap-6 rounded-lg border border-border bg-card p-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="settings-product-updates">
                  Product updates
                </Label>
                <p className="text-sm leading-5 text-muted-foreground">
                  Receive occasional updates about this application.
                </p>
              </div>
              <Switch
                id="settings-product-updates"
                checked={productUpdates}
                onCheckedChange={setProductUpdates}
              />
            </div>
          </FormSection>

          <FormSection
            id="appearance"
            title="Appearance"
            description="Small presentation choices belong beside other application preferences, while theme tokens remain platform-owned."
          >
            <div className="flex items-start justify-between gap-6 rounded-lg border border-border bg-card p-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="settings-compact-density">
                  Compact density
                </Label>
                <p className="text-sm leading-5 text-muted-foreground">
                  Reduce vertical spacing in dense data surfaces.
                </p>
              </div>
              <Switch
                id="settings-compact-density"
                checked={compactDensity}
                onCheckedChange={setCompactDensity}
              />
            </div>
          </FormSection>
        </FormPage>
      </SettingsLayout>
    </ApplicationPage>
  );
}

export const settingsFeaturePack = {
  id: 'settings',
  route: '/settings',
  navigation: {
    label: 'Settings',
    description: 'Application preferences and presentation.',
    icon: Settings2,
  },
  screen: SettingsScreen,
  dependencies: ['@platform/ui'],
} satisfies FeaturePack;

import { UserRound } from 'lucide-react';

import { useAuth, useNavigation } from '@platform/sdk';
import type { PlatformUser } from '@platform/sdk';
import {
  ApplicationPage,
  Avatar,
  Badge,
  Card,
  DetailLayout,
  DetailList,
  PageHeader,
  PageSection,
} from '@platform/ui';

import {
  AuthGate,
  SignOutButton,
} from '../authentication';
import type { FeaturePack } from '../contract.js';

function ProfileDetails({ user }: { user: PlatformUser }) {
  const displayName = user.displayName ?? user.id;

  return (
    <DetailLayout
      aside={
        <Card className="grid gap-3 p-5">
          <h2 className="font-semibold">Account actions</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Actions stay limited to provider-neutral account behavior until a
            product supplies its own profile contract.
          </p>
          <SignOutButton />
        </Card>
      }
    >
      <Card className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <Avatar name={displayName} src={user.avatarUrl} size="lg" />
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-semibold break-words">{displayName}</h2>
          <p className="break-words text-sm text-muted-foreground">
            Current application identity
          </p>
        </div>
      </Card>

      <PageSection
        title="Identity summary"
        description="Only generic identity fields supplied by the configured authentication provider are shown here."
      >
        <Card className="p-6">
          <DetailList
            columns={2}
            items={[
              { id: 'display-name', label: 'Display name', value: displayName },
              {
                id: 'email',
                label: 'Email',
                value: user.email ?? 'Not provided by the identity provider',
              },
              {
                id: 'identity-id',
                label: 'Identity ID',
                value: <span className="break-all">{user.id}</span>,
              },
            ]}
          />
        </Card>
      </PageSection>

      <PageSection title="Provider boundary">
        <p className="max-w-3xl rounded-lg border border-border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
          Profile data is read from the current user in the platform auth
          contract. Product-specific fields, editing, and persistence belong
          to a domain API and should be added outside this pack.
        </p>
      </PageSection>
    </DetailLayout>
  );
}

export function ProfileScreen() {
  const auth = useAuth();
  const navigation = useNavigation();

  return (
    <ApplicationPage>
      <PageHeader
        title="Profile"
        description="A neutral current-user view for identity summary and account actions. Product-specific profile fields remain outside the platform pack."
        status={
          <Badge variant={auth.status === 'ready' ? 'outline' : 'secondary'}>
            {auth.status === 'ready'
              ? auth.phase === 'pending'
                ? 'Loading identity'
                : auth.phase === 'error'
                  ? 'Identity error'
                  : 'Current user'
              : 'Provider unavailable'}
          </Badge>
        }
      />

      <AuthGate returnPath={navigation.currentPath}>
        {auth.user ? <ProfileDetails user={auth.user} /> : null}
      </AuthGate>
    </ApplicationPage>
  );
}

export const profileFeaturePack = {
  id: 'profile',
  route: '/profile',
  navigation: {
    label: 'Profile',
    description: 'Current identity and account actions.',
    icon: UserRound,
  },
  screen: ProfileScreen,
  dependencies: {
    platform: ['@platform/ui', '@platform/sdk'],
    featurePacks: ['authentication'],
  },
} satisfies FeaturePack;

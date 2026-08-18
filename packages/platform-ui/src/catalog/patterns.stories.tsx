import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ArrowLeft,
  Check,
  FolderKanban,
  LayoutGrid,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import {
  ApplicationPage,
  ApplicationShell,
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  DataTableSkeleton,
  DeniedState,
  DetailLayout,
  DetailList,
  EmptyState,
  ErrorState,
  FormField,
  FormPage,
  FormSection,
  Input,
  Label,
  LoadingState,
  PageHeader,
  PageSection,
  SearchFilterToolbar,
  SettingsLayout as SettingsLayoutComponent,
  ThemeToggle,
  ConfirmDialog,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui';
import type { DataTableColumn } from '@platform/ui';

const meta = {
  title: 'Reusable UX patterns',
  parameters: {
    docs: {
      description: {
        component:
          'Application-level structure and interaction contracts. Ownership: shell, page rhythm, data surfaces, form grouping, detail layout, settings navigation, and canonical states are platform patterns; routes, copy, data, policy, and domain actions stay product-specific.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const navigation = [
  {
    href: '#overview',
    label: 'Overview',
    icon: <LayoutGrid className="size-4" />,
    current: true,
  },
  {
    href: '#workspaces',
    label: 'Workspaces',
    icon: <FolderKanban className="size-4" />,
  },
  {
    href: '#members',
    label: 'Members',
    icon: <Users className="size-4" />,
    badge: <Badge variant="secondary">12</Badge>,
  },
  {
    href: '#settings',
    label: 'Settings',
    icon: <Settings2 className="size-4" />,
  },
] as const;

export const ApplicationShellAndNavigation: Story = {
  render: () => (
    <ApplicationShell
      brand={
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Northstar</p>
          <p className="truncate text-xs text-muted-foreground">Workspace</p>
        </div>
      }
      mobileTitle="Northstar Workspace"
      navigation={navigation}
      headerActions={
        <>
          <ThemeToggle />
          <Button type="button" size="sm">
            New request
          </Button>
        </>
      }
      footer={<p className="px-3 text-xs text-muted-foreground">Platform UI</p>}
      mainClassName="bg-muted/10"
    >
      <ApplicationPage>
        <PageHeader
          title="Workspace overview"
          description="A route owns its information architecture while the shell provides dependable landmarks, navigation, responsive collapse, and focus behavior."
          actions={<Button variant="outline">Review activity</Button>}
        />
        <PageSection
          title="Recent workspaces"
          description="Product-specific content can use the same page rhythm without inheriting a fixed dashboard composition."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Application platform', 'Updated 12 minutes ago', 'Active'],
              ['Identity migration', 'Updated yesterday', 'Review'],
              ['Design system portal', 'Updated 3 days ago', 'Active'],
            ].map(([name, updated, status]) => (
              <Card key={name} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-medium">{name}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {updated}
                    </p>
                  </div>
                  <Badge
                    variant={status === 'Active' ? 'success' : 'secondary'}
                  >
                    {status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </PageSection>
      </ApplicationPage>
    </ApplicationShell>
  ),
};

const members = [
  {
    id: 'ada',
    name: 'Ada Lovelace',
    team: 'Platform',
    status: 'Active',
    lastSeen: '2 minutes ago',
  },
  {
    id: 'grace',
    name: 'Grace Hopper',
    team: 'Product',
    status: 'Review',
    lastSeen: 'Yesterday',
  },
  {
    id: 'katherine',
    name: 'Katherine Johnson',
    team: 'Data',
    status: 'Active',
    lastSeen: 'Monday',
  },
] as const;

type Member = (typeof members)[number];

const memberColumns: readonly DataTableColumn<Member>[] = [
  {
    id: 'member',
    header: 'Member',
    cell: member => (
      <div className="flex min-w-48 items-center gap-3">
        <Avatar name={member.name} size="sm" />
        <span className="font-medium">{member.name}</span>
      </div>
    ),
  },
  {
    id: 'team',
    header: 'Team',
    cell: member => (
      <span className="text-muted-foreground">{member.team}</span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: member => (
      <Badge variant={member.status === 'Active' ? 'success' : 'secondary'}>
        {member.status}
      </Badge>
    ),
  },
  {
    id: 'last-seen',
    header: 'Last seen',
    cell: member => (
      <span className="text-muted-foreground">{member.lastSeen}</span>
    ),
  },
  {
    id: 'actions',
    header: 'Action',
    align: 'right',
    cell: () => (
      <Button type="button" size="sm" variant="ghost">
        View
      </Button>
    ),
  },
];

function MemberListStory() {
  const [query, setQuery] = useState('');
  const [team, setTeam] = useState('all');
  const normalizedQuery = query.trim().toLowerCase();
  const visibleMembers = members.filter(member => {
    const matchesQuery =
      !normalizedQuery || member.name.toLowerCase().includes(normalizedQuery);
    const matchesTeam = team === 'all' || member.team.toLowerCase() === team;
    return matchesQuery && matchesTeam;
  });

  return (
    <ApplicationPage>
      <PageHeader
        title="Members"
        description="Search, filter, and act on a data set without forcing a product to use a particular domain model."
        actions={<Button type="button">Invite member</Button>}
      />
      <PageSection>
        <SearchFilterToolbar
          search={
            <div className="grid gap-2">
              <Label htmlFor="member-search">Search members</Label>
              <Input
                id="member-search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search by name"
              />
            </div>
          }
          filters={
            <div className="grid min-w-44 gap-2">
              <Label htmlFor="member-team">Team</Label>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger id="member-team" aria-label="Team filter">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          actions={
            <Button type="button" variant="outline">
              Export
            </Button>
          }
          resultSummary={`${visibleMembers.length} of ${members.length} members`}
          onClear={() => {
            setQuery('');
            setTeam('all');
          }}
          clearDisabled={!query && team === 'all'}
        />
      </PageSection>
      <PageSection>
        <DataTable
          items={visibleMembers}
          columns={memberColumns}
          getRowId={member => member.id}
          caption="Workspace members"
          empty={
            <EmptyState
              title="No members match those filters"
              description="Try a different name or clear the team filter."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuery('');
                    setTeam('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          }
        />
      </PageSection>
    </ApplicationPage>
  );
}

export const SearchFilterAndDataPage: Story = {
  render: () => <MemberListStory />,
};

export const DataPageStates: Story = {
  render: () => (
    <ApplicationPage>
      <PageHeader
        title="Data states"
        description="The same page family has explicit loading, empty, error, and denied recovery paths."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <PageSection title="Loading">
          <DataTableSkeleton label="Loading members" />
        </PageSection>
        <PageSection title="Inline loading">
          <LoadingState label="Loading member details…" />
        </PageSection>
        <PageSection title="Empty">
          <EmptyState
            title="No workspaces yet"
            description="Create a workspace to give your team a place to start."
            action={<Button type="button">Create workspace</Button>}
          />
        </PageSection>
        <PageSection title="Error">
          <ErrorState
            title="Members could not be loaded"
            message="The request timed out. Retry when the service is available again."
            retryLabel="Try again"
            onRetry={() => undefined}
          />
        </PageSection>
        <PageSection title="Denied">
          <DeniedState
            title="You cannot view members"
            description="Ask a workspace administrator for the Member Viewer permission."
            action={
              <Button type="button" variant="outline">
                Request access
              </Button>
            }
          />
        </PageSection>
        <PageSection title="Disabled and pending">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-6">
            <Button type="button" disabled>
              <span
                className="size-2 animate-pulse rounded-full bg-current"
                aria-hidden="true"
              />
              Saving…
            </Button>
            <Button type="button" variant="outline" disabled>
              Disabled action
            </Button>
          </div>
        </PageSection>
      </div>
    </ApplicationPage>
  ),
};

function FormStory() {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <ApplicationPage>
      <PageHeader
        title="Workspace settings"
        description="Forms provide consistent grouping and field semantics while applications keep their own validation and business rules."
      />
      <FormPage
        onSubmit={event => {
          event.preventDefault();
          setPending(true);
          setSaved(false);
          window.setTimeout(() => {
            setPending(false);
            setSaved(true);
          }, 900);
        }}
        status={
          saved ? (
            <span className="text-success">Changes saved.</span>
          ) : undefined
        }
        actions={
          <>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      >
        <FormSection
          title="Workspace identity"
          description="Use a clear name and a stable identifier for links and integrations."
        >
          <FormField
            id="workspace-name"
            label="Workspace name"
            description="Shown in navigation and notifications."
            required
            control={<Input defaultValue="Application platform" />}
          />
          <FormField
            id="workspace-slug"
            label="Workspace slug"
            description="Lowercase letters and hyphens only."
            required
            control={<Input defaultValue="application-platform" />}
          />
        </FormSection>
        <FormSection
          title="Notifications"
          description="Choose what this workspace sends to its members."
        >
          <FormField
            id="notification-email"
            label="Notification email"
            control={<Input type="email" defaultValue="platform@example.com" />}
          />
          <FormField
            id="notification-frequency"
            label="Digest frequency"
            control={
              <select
                id="notification-frequency"
                className="input"
                defaultValue="daily"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="never">Never</option>
              </select>
            }
          />
        </FormSection>
      </FormPage>
    </ApplicationPage>
  );
}

export const FormPageAndSections: Story = {
  render: () => <FormStory />,
};

export const DetailViewWithLongContent: Story = {
  render: () => (
    <ApplicationPage>
      <PageHeader
        backLink={
          <a
            href="#requests"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to requests
          </a>
        }
        title="Request with a deliberately long title that must wrap instead of pushing actions off-screen"
        description="Detail pages expose a stable reading order and let products decide whether the supporting content belongs beside or below the primary view."
        actions={
          <>
            <Button type="button" variant="outline">
              Edit
            </Button>
            <Button type="button">Approve</Button>
          </>
        }
      />
      <DetailLayout
        aside={
          <>
            <Card className="p-5">
              <h2 className="font-semibold">Owner</h2>
              <div className="mt-4 flex items-center gap-3">
                <Avatar name="Ada Lovelace" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Ada Lovelace</p>
                  <p className="truncate text-sm text-muted-foreground">
                    Platform
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-semibold">Access</h2>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <LockKeyhole className="size-4" aria-hidden="true" />
                Workspace members
              </div>
            </Card>
          </>
        }
      >
        <PageSection
          title="Request details"
          description="Definition lists keep labels scannable and let unbounded values wrap safely."
        >
          <Card className="p-6">
            <DetailList
              columns={2}
              items={[
                { id: 'request-id', label: 'Request ID', value: 'REQ-1048' },
                {
                  id: 'status',
                  label: 'Status',
                  value: <Badge variant="success">Approved</Badge>,
                },
                {
                  id: 'created',
                  label: 'Created',
                  value: '12 August 2026, 09:42 ICT',
                },
                {
                  id: 'description',
                  label: 'Description',
                  value:
                    'This intentionally long value demonstrates how a detail view handles an unbroken integration identifier: platform-control-plane-application-platform-workspace-configuration-review-v2026-08-12.',
                },
              ]}
            />
          </Card>
        </PageSection>
        <PageSection title="Review history">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">Approved by Ada Lovelace</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The workspace policy checks passed and the request was
                  approved.
                </p>
              </div>
            </div>
          </Card>
        </PageSection>
      </DetailLayout>
    </ApplicationPage>
  ),
};

const settingsNavigation = [
  {
    href: '#profile',
    label: 'Profile',
    description: 'Your identity',
    current: true,
  },
  { href: '#members', label: 'Members', description: 'Access and roles' },
  {
    href: '#notifications',
    label: 'Notifications',
    description: 'Delivery choices',
  },
  { href: '#security', label: 'Security', description: 'Sessions and keys' },
] as const;

export const SettingsPageLayout: Story = {
  render: () => (
    <ApplicationPage>
      <PageHeader
        title="Settings"
        description="A settings-style layout adapts its navigation without dictating the sections or controls a product needs."
      />
      <SettingsLayoutComponent navigation={settingsNavigation}>
        <PageSection
          title="Profile"
          description="Update the identity shown to people you work with."
          actions={<Button type="button">Save profile</Button>}
        >
          <Card className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar name="Ada Lovelace" size="lg" />
              <div className="min-w-0">
                <p className="font-medium">Ada Lovelace</p>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  ada.lovelace@example.com
                </p>
              </div>
            </div>
          </Card>
        </PageSection>
      </SettingsLayoutComponent>
    </ApplicationPage>
  ),
};

function ConsequentialActionStory() {
  const [completed, setCompleted] = useState(false);

  return (
    <ApplicationPage>
      <PageHeader
        title="Consequential actions"
        description="The confirmation pattern protects destructive work, disables competing exits while pending, and keeps error recovery at the product boundary."
      />
      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold">Remove a workspace member</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Removal changes access immediately and should be explicit,
            reversible where the product allows it, and understandable before
            confirmation.
          </p>
        </div>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive">
              Remove access
            </Button>
          }
          title="Remove access?"
          description="Ada will no longer be able to use this workspace."
          confirmLabel="Remove access"
          cancelLabel="Keep access"
          pendingLabel="Removing access…"
          closeLabel="Close confirmation"
          destructive
          onConfirm={() =>
            new Promise<void>(resolve => {
              window.setTimeout(() => {
                setCompleted(true);
                resolve();
              }, 900);
            })
          }
          onConfirmError={() => setCompleted(false)}
        />
      </Card>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {completed
          ? 'Access removed successfully.'
          : 'No access change completed yet.'}
      </p>
    </ApplicationPage>
  );
}

export const DestructiveAndPendingAction: Story = {
  render: () => <ConsequentialActionStory />,
};

export const NarrowViewportContent: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story:
          'Review with the Storybook viewport control or a browser width below 1024px to inspect the shell drawer, wrapping headers, horizontal data overflow, and settings navigation.',
      },
    },
  },
  render: () => (
    <div className="mx-auto w-full max-w-sm space-y-5 rounded-lg border border-border bg-background p-4">
      <PageHeader
        title="Narrow content preview"
        description="Long titles wrap, actions move below the heading, and the page keeps a readable measure."
        actions={
          <Button type="button" size="sm">
            Primary action
          </Button>
        }
      />
      <SearchFilterToolbar
        search={
          <div className="grid gap-2">
            <Label htmlFor="narrow-search">Search</Label>
            <Input id="narrow-search" placeholder="Search" />
          </div>
        }
        resultSummary="3 results"
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <DataTable
            items={members}
            columns={memberColumns}
            getRowId={member => member.id}
            caption="Narrow member table"
          />
        </div>
      </div>
    </div>
  ),
};

export const OwnershipBoundaries: Story = {
  render: () => (
    <ApplicationPage>
      <PageHeader
        title="Ownership boundaries"
        description="The platform standardizes behavior and structure where unrelated applications benefit from consistency; products keep their domain meaning and information architecture."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <Badge variant="outline">Platform primitive</Badge>
          <h2 className="mt-4 font-semibold">Interaction building blocks</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Button, Input, Sheet, Dialog, Badge, focus treatment, theme tokens,
            and the shared feedback primitives.
          </p>
        </Card>
        <Card className="p-5">
          <Badge variant="success">Reusable application pattern</Badge>
          <h2 className="mt-4 font-semibold">Composable structure</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            ApplicationShell, PageHeader, DataTable, SearchFilterToolbar,
            FormSection, DetailLayout, SettingsLayout, and canonical states.
          </p>
        </Card>
        <Card className="p-5">
          <Badge variant="secondary">Product/domain-specific UI</Badge>
          <h2 className="mt-4 font-semibold">Meaning and policy</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Routes, domain entities, field rules, permissions policy, business
            actions, copy, and the product&apos;s information architecture.
          </p>
        </Card>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-5 text-sm">
        <ShieldCheck
          className="mt-0.5 size-5 shrink-0 text-success"
          aria-hidden="true"
        />
        <p className="leading-6 text-muted-foreground">
          Future feature packs should compose the second category from the
          first, without moving the third category into the platform package.
        </p>
      </div>
    </ApplicationPage>
  ),
};

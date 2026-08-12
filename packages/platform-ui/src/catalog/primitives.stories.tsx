import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Check,
  LoaderCircle,
  MoreHorizontal,
  Search,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@platform/ui';

const meta = {
  title: 'Foundations / Primitives',
  parameters: {
    docs: {
      description: {
        component:
          'The real @platform/ui exports, composed only for inspection. Stories are not replacement implementations.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Buttons: Story = {
  render: () => (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Buttons</h1>
        <p className="text-sm text-muted-foreground">
          Variants, sizes, focus treatment, disabled state, and a meaningful
          pending state.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button>Continue</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </Button>
        <Button disabled>Disabled</Button>
        <Button disabled>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Saving…
        </Button>
        <Button size="icon" aria-label="More actions">
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  ),
};

export const FieldsAndSelection: Story = {
  render: () => (
    <section className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Fields</h1>
          <p className="text-sm text-muted-foreground">
            Labels, placeholders, focus rings, and disabled controls remain
            visible at narrow widths.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="portal-search">Search members</Label>
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="portal-search"
              className="pl-9"
              placeholder="Search by name or team"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="portal-disabled">Disabled field</Label>
          <Input
            id="portal-disabled"
            disabled
            value="Provisioned by platform"
            readOnly
          />
        </div>
      </div>
      <div className="space-y-5 rounded-lg border border-border bg-card p-5">
        <div className="grid gap-2">
          <Label htmlFor="portal-select">Team</Label>
          <Select defaultValue="platform">
            <SelectTrigger
              id="portal-select"
              aria-label="Team"
              className="max-w-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="platform">Platform team</SelectItem>
              <SelectItem value="product">Product team</SelectItem>
              <SelectItem value="data">Data team</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id="portal-terms" />
          <Label htmlFor="portal-terms">Require approval</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="portal-notifications" />
          <Label htmlFor="portal-notifications">Send notifications</Label>
        </div>
      </div>
    </section>
  ),
};

export const SurfacesAndIdentity: Story = {
  render: () => (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Surfaces and identity
        </h1>
        <p className="text-sm text-muted-foreground">
          Cards, badges, and deterministic Avatar fallbacks in realistic rows.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar name="Ada Lovelace" size="lg" />
              <div>
                <h2 className="font-medium">Ada Lovelace</h2>
                <p className="text-sm text-muted-foreground">
                  Platform engineer
                </p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>Owner</Badge>
            <Badge variant="secondary">Platform</Badge>
            <Badge variant="outline">Verified</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Avatar
              name="Grace Hopper"
              src="/catalog-missing-avatar.png"
              size="lg"
            />
            <div>
              <h2 className="font-medium">Grace Hopper</h2>
              <p className="text-sm text-muted-foreground">
                Image fallback is intentional
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Trigger the failed image path to inspect the accessible initials
            fallback rather than a broken image icon.
          </p>
        </Card>
      </div>
    </section>
  ),
};

function ConfirmationStory() {
  const [completed, setCompleted] = useState(false);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Dialogs, sheets, and confirmation
        </h1>
        <p className="text-sm text-muted-foreground">
          Open each interaction, then test keyboard focus, Escape, disabled
          pending actions, and localized labels.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent closeLabel="Close dialog">
            <DialogTitle>Review changes</DialogTitle>
            <DialogDescription>
              The centered modal owns focus until it is dismissed.
            </DialogDescription>
            <div className="mt-6 flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Keep reviewing</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Open sheet</Button>
          </SheetTrigger>
          <SheetContent side="right" closeLabel="Close detail panel">
            <SheetTitle>Detail panel</SheetTitle>
            <SheetDescription>
              The edge-anchored surface is the shared building block for
              navigation, filters, and details.
            </SheetDescription>
            <div className="mt-6 rounded-md bg-muted p-4 text-sm">
              Resize the viewport and press Escape to inspect the behavior.
            </div>
          </SheetContent>
        </Sheet>
        <ConfirmDialog
          trigger={
            <Button variant="destructive">
              <Trash2 className="size-4" aria-hidden="true" />
              Remove access
            </Button>
          }
          title="Remove access?"
          description="The member will no longer be able to use this application."
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
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {completed
          ? 'Access removed successfully.'
          : 'No confirmation action completed yet.'}
      </p>
    </section>
  );
}

export const DialogsSheetsAndConfirmation: Story = {
  render: () => <ConfirmationStory />,
};

function MenusStory() {
  const [tab, setTab] = useState('overview');

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Menus, tabs, and tooltips
        </h1>
        <p className="text-sm text-muted-foreground">
          Inspect roving focus and keyboard navigation in the primitives most
          often composed into application chrome.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Check className="mr-2 size-4" aria-hidden="true" />
              Mark reviewed
            </DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Search help">
                <Search className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search help</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="max-w-xl">
        <TabsList>
          <TabsTrigger
            value="overview"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="text-sm text-muted-foreground">
          Overview content remains mounted in a stable tab contract.
        </TabsContent>
        <TabsContent value="history" className="text-sm text-muted-foreground">
          History content follows the same focus and selected-state rules.
        </TabsContent>
      </Tabs>
    </section>
  );
}

export const MenusTabsAndTooltips: Story = {
  render: () => <MenusStory />,
};

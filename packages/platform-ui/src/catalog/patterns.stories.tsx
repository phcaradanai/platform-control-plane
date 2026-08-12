import type { Meta, StoryObj } from '@storybook/react-vite';
import { Filter, Search, SlidersHorizontal } from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Card,
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
} from '@platform/ui';

const meta = {
  title: 'Reusable UX patterns',
  parameters: {
    docs: {
      description: {
        component:
          'Small, evidence-backed compositions that applications can adapt without introducing a second component library.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const members = [
  { name: 'Ada Lovelace', team: 'Platform', status: 'Active' },
  { name: 'Grace Hopper', team: 'Product', status: 'Review' },
  { name: 'Katherine Johnson', team: 'Data', status: 'Active' },
];

export const SearchAndFilter: Story = {
  render: () => (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Search and filter
        </h1>
        <p className="text-sm text-muted-foreground">
          A reusable data-view pattern: query input, explicit filters, result
          count, and a stable empty-state path.
        </p>
      </div>
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="pattern-search">Search</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="pattern-search"
                className="pl-9"
                placeholder="Search members"
              />
            </div>
          </div>
          <div className="grid gap-2 lg:w-52">
            <Label htmlFor="pattern-team">Team</Label>
            <Select defaultValue="all">
              <SelectTrigger id="pattern-team" aria-label="Team filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline">
            <Filter className="size-4" aria-hidden="true" />
            Apply filters
          </Button>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">3 members</span>
          <Button variant="ghost" size="sm">
            Clear all
          </Button>
        </div>
      </Card>
    </section>
  ),
};

export const DataPresentation: Story = {
  render: () => (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Data presentation
          </h1>
          <p className="text-sm text-muted-foreground">
            Row density, identity, status, and a clear next action remain
            readable on narrow screens.
          </p>
        </div>
        <Button variant="outline">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Customize view
        </Button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Team</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr
                  key={member.name}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} size="sm" />
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {member.team}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        member.status === 'Active' ? 'success' : 'secondary'
                      }
                    >
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button size="sm" variant="ghost">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  ),
};

export const ResponsiveNavigation: Story = {
  render: () => (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Responsive navigation
        </h1>
        <p className="text-sm text-muted-foreground">
          The application owns its route content; the platform supplies the
          accessible edge-anchored behavior for a narrow viewport.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <nav
          aria-label="Desktop navigation"
          className="hidden rounded-lg border border-border bg-card p-3 lg:block"
        >
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <div className="grid gap-1">
            <Button className="justify-start">Overview</Button>
            <Button variant="ghost" className="justify-start">
              Members
            </Button>
            <Button variant="ghost" className="justify-start">
              Settings
            </Button>
          </div>
        </nav>
        <Card className="min-h-56 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current page</p>
              <h2 className="text-xl font-semibold">Overview</h2>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  Open navigation
                </Button>
              </SheetTrigger>
              <SheetContent side="left" closeLabel="Close navigation">
                <SheetTitle>Workspace navigation</SheetTitle>
                <SheetDescription>Select a destination.</SheetDescription>
                <nav aria-label="Mobile navigation" className="mt-6 grid gap-2">
                  <Button className="justify-start">Overview</Button>
                  <Button variant="ghost" className="justify-start">
                    Members
                  </Button>
                  <Button variant="ghost" className="justify-start">
                    Settings
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </Card>
      </div>
    </section>
  ),
};

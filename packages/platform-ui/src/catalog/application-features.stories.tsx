import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge, Card } from '@platform/ui';

const meta = {
  title: 'Application features / Reserved future packs',
  parameters: {
    docs: {
      description: {
        component:
          'A review boundary for future standardized application features. Identity and access packs are reviewed in the real Feature packs catalog; only unimplemented future packs remain here.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const futureFeatures = [
  ['Saved views', 'A later tranche may standardize reusable saved filters'],
  ['Workflow queue', 'A later tranche may standardize queue and assignment UX'],
  ['Import review', 'A later tranche may standardize staged import feedback'],
] as const;

export const Reserved: Story = {
  render: () => (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Future feature packs
        </h1>
        <p className="text-sm text-muted-foreground">
          These catalog slots make the future contract visible without
          pretending the feature UX is ready to select from App Factory.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {futureFeatures.map(([name, description]) => (
          <Card key={name} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium">{name}</h2>
              <Badge variant="outline">Reserved</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          </Card>
        ))}
      </div>
      <p className="rounded-md border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        Contract: a standardized application feature becomes selectable only
        after its important UX states can be inspected here.
      </p>
    </section>
  ),
};

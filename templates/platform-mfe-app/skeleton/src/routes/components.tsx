import { createFileRoute } from '@tanstack/react-router';
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
  Skeleton,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from '@platform/ui';

export const Route = createFileRoute('/components')({
  component: ComponentsPage,
});

/**
 * Platform UI catalog - a visual verification page for every primitive in
 * the shared @platform/ui package. It renders the full set of components
 * in both light and dark theme so a human (or a screenshot diff) can
 * confirm the shared foundation is intact after an upgrade.
 */
function ComponentsPage() {
  const { toast } = useToast();

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Platform UI catalog</h1>
        <p className="text-muted-foreground">
          Every primitive exported by <code>@platform/ui</code>. Switch the
          theme to verify both token sets.
        </p>
      </section>

      <PrimitiveSection title="Button" description="Variants and sizes">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Icon button">★</Button>
        </div>
      </PrimitiveSection>

      <PrimitiveSection title="Badge" description="Status badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </PrimitiveSection>

      <PrimitiveSection title="Card" description="Surface container">
        <Card className="p-6">
          <h3 className="text-lg font-medium">Card title</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cards group related content into a single surface.
          </p>
        </Card>
      </PrimitiveSection>

      <PrimitiveSection title="Input + Label" description="Form fields">
        <div className="grid max-w-sm gap-4">
          <div className="grid gap-2">
            <Label htmlFor="catalog-input">Display name</Label>
            <Input id="catalog-input" placeholder="Type something…" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="catalog-input-disabled">Disabled</Label>
            <Input id="catalog-input-disabled" disabled value="Read only" />
          </div>
        </div>
      </PrimitiveSection>

      <PrimitiveSection title="Checkbox + Switch" description="Selection controls">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-2">
            <Checkbox id="catalog-check" />
            <Label htmlFor="catalog-check">Accept terms</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="catalog-switch" />
            <Label htmlFor="catalog-switch">Enable notifications</Label>
          </div>
        </div>
      </PrimitiveSection>

      <PrimitiveSection title="Select" description="Menu selection">
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pick a framework" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="vue">Vue</SelectItem>
            <SelectItem value="svelte">Svelte</SelectItem>
          </SelectContent>
        </Select>
      </PrimitiveSection>

      <PrimitiveSection title="Tabs" description="Tabbed content">
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Alpha</TabsTrigger>
            <TabsTrigger value="b">Beta</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="pt-4 text-sm text-muted-foreground">
            Alpha content.
          </TabsContent>
          <TabsContent value="b" className="pt-4 text-sm text-muted-foreground">
            Beta content.
          </TabsContent>
        </Tabs>
      </PrimitiveSection>

      <PrimitiveSection title="Dialog" description="Modal overlay">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>
              A Radix-based accessible modal with focus trap.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </PrimitiveSection>

      <PrimitiveSection title="Avatar" description="Person/entity identity, with initials fallback">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Ada Lovelace" size="sm" />
          <Avatar name="Grace Hopper" />
          <Avatar name="Katherine Johnson" size="lg" />
        </div>
      </PrimitiveSection>

      <PrimitiveSection title="ConfirmDialog" description="Confirm/cancel wrapper for destructive or consequential actions">
        <ConfirmDialog
          trigger={<Button variant="destructive">Delete item</Button>}
          title="Delete this item?"
          description="This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={() => {}}
        />
      </PrimitiveSection>

      <PrimitiveSection title="Sheet" description="Off-canvas panel anchored to a viewport edge">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Open sheet</Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>
              An off-canvas panel for navigation, filters, or detail views -
              unlike Dialog, it anchors to an edge instead of centering.
            </SheetDescription>
          </SheetContent>
        </Sheet>
      </PrimitiveSection>

      <PrimitiveSection title="DropdownMenu" description="Action menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PrimitiveSection>

      <PrimitiveSection title="Tooltip" description="Hover hint">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PrimitiveSection>

      <PrimitiveSection title="Skeleton + Spinner" description="Loading states">
        <div className="flex flex-wrap items-center gap-8">
          <div className="w-48 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Spinner className="size-6" aria-label="Loading" />
        </div>
      </PrimitiveSection>

      <PrimitiveSection title="Toast" description="Transient feedback">
        <Button
          variant="outline"
          onClick={() =>
            toast({
              title: 'Catalog toast',
              description: 'Toast emitted from the component catalog.',
            })
          }
        >
          Show toast
        </Button>
      </PrimitiveSection>
    </div>
  );
}

function PrimitiveSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">{children}</div>
    </section>
  );
}

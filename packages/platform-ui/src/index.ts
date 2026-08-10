// Public API of the shared platform UI package.
//
// Consumers (generated Platform MFE applications) import primitives,
// theme, and feedback components from here, and the UnoCSS theme/shortcuts
// from './uno-preset'. Keep this barrel intentionally small - it IS the
// platform contract. Product-specific components stay in the application.

// Design tokens are consumed explicitly via `@platform/ui/theme.css`
// (see the "./theme.css" export) so the package never imports CSS
// internally - that keeps every entry module plain ESM that Node and
// bundlers can load without CSS handling.

// Utilities
export { cn } from './lib/cn.js';

// Theme (light/dark/system)
export { ThemeProvider, useTheme } from './components/theme/theme-provider.js';
export type { Theme, ThemePreference } from './components/theme/theme-provider.js';
export { ThemeToggle } from './components/theme/theme-toggle.js';

// Feedback states + query boundary
export { LoadingState } from './components/feedback/loading-state.js';
export { ErrorState } from './components/feedback/error-state.js';
export { EmptyState } from './components/feedback/empty-state.js';
export { NotFoundState } from './components/feedback/not-found-state.js';
export { QueryBoundary } from './components/feedback/query-boundary.js';
export type { QueryBoundaryProps } from './components/feedback/query-boundary.js';

// UI primitives (Radix-based)
export { Avatar } from './components/ui/avatar.js';
export type { AvatarProps } from './components/ui/avatar.js';
export { Badge } from './components/ui/badge.js';
export { Button } from './components/ui/button.js';
export type { ButtonProps } from './components/ui/button.js';
export { Card } from './components/ui/card.js';
export { Checkbox } from './components/ui/checkbox.js';
export { ConfirmDialog } from './components/ui/confirm-dialog.js';
export type { ConfirmDialogProps } from './components/ui/confirm-dialog.js';
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './components/ui/dialog.js';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './components/ui/dropdown-menu.js';
export { Input } from './components/ui/input.js';
export type { InputProps } from './components/ui/input.js';
export { Label } from './components/ui/label.js';
export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from './components/ui/select.js';
export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from './components/ui/sheet.js';
export type { SheetContentProps, SheetSide } from './components/ui/sheet.js';
export { Skeleton } from './components/ui/skeleton.js';
export { Spinner } from './components/ui/spinner.js';
export { Switch } from './components/ui/switch.js';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs.js';
export { ToastProvider, useToast } from './components/ui/toast.js';
export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './components/ui/tooltip.js';

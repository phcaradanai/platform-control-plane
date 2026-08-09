import { Bell } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '@platform/ui';

interface NotificationItem {
  id: number;
  title: string;
  description: string;
}

const DEMO_NOTIFICATIONS: readonly NotificationItem[] = [
  {
    id: 1,
    title: 'Welcome',
    description: 'The notifications capability is composed into this app.',
  },
  {
    id: 2,
    title: 'Toasts are shared infrastructure',
    description: 'This panel reuses @platform/ui\'s ToastProvider, already mounted in app.tsx.',
  },
];

/**
 * The `notifications` capability's composed effect: a bell menu in the
 * header listing in-memory demo notifications, plus a button that fires a
 * toast through the platform's existing `useToast()` - proving the
 * capability integrates with shared infrastructure instead of shipping a
 * parallel toast system.
 */
export function NotificationsCenter() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(DEMO_NOTIFICATIONS.length);

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      setUnread(0);
    }
  }, []);

  const sendTestNotification = useCallback(() => {
    toast({
      title: 'Test notification',
      description: 'Sent from the notifications capability.',
      variant: 'success',
    });
  }, [toast]);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        >
          <span className="relative inline-flex">
            <Bell className="size-4" aria-hidden="true" />
            {unread > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -right-2 -top-2 h-4 min-w-4 px-1 text-[10px] leading-4"
              >
                {unread}
              </Badge>
            ) : null}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {DEMO_NOTIFICATIONS.map(item => (
          <DropdownMenuItem key={item.id} className="flex-col items-start gap-0.5">
            <span className="text-sm font-medium">{item.title}</span>
            <span className="text-xs text-muted-foreground">{item.description}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={sendTestNotification}>
          Send test notification
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

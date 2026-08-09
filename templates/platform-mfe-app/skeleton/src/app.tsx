import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

import { PlatformProvider } from '@platform/sdk';
import { ThemeProvider } from '@platform/ui';
import { ToastProvider } from '@platform/ui';
import { appInfo } from './lib/app-info';
import { createRouterNavigationAdapter } from './lib/platform-navigation-adapter';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

const navigationAdapter = createRouterNavigationAdapter();

export function App() {
  return (
    <PlatformProvider config={{ app: appInfo, adapters: { navigation: navigationAdapter } }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
          {import.meta.env.DEV ? (
            <>
              <ReactQueryDevtools initialIsOpen={false} />
              <TanStackRouterDevtools router={router} />
            </>
          ) : null}
        </QueryClientProvider>
      </ThemeProvider>
    </PlatformProvider>
  );
}

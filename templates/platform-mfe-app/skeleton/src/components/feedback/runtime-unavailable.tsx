export interface RuntimeUnavailableProps {
  message: string;
}

/**
 * Rendered instead of the app when `platform-app.json`'s `mode` requires a
 * platform host (`"platform-mfe"`) and `main.tsx` caught a
 * `PlatformRuntimeUnavailableError` resolving it. Deliberately
 * dependency-free (no `@platform/ui`, no `PlatformProvider`, no router) so
 * it still renders correctly precisely because the rest of the app's
 * providers never mounted.
 */
export function RuntimeUnavailable({ message }: RuntimeUnavailableProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Platform host required</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}

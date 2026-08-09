import { useQuery } from '@tanstack/react-query';

import { getHealth } from '../../api/health';
import { QueryBoundary } from '@platform/ui';
import { Badge } from '@platform/ui';
import { Card } from '@platform/ui';

export function HealthStatus() {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
  });

  return (
    <Card className="p-6">
      <h2 className="text-lg font-medium">API health</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Fetched through the typed API boundary (src/api) with TanStack Query.
        No backend is running in a fresh scaffold, so this card demonstrates
        the loading, error, and retry states.
      </p>
      <div className="mt-4">
        <QueryBoundary
          query={query}
          empty={{ title: 'No health data' }}
          errorTitle="Health check failed"
        >
          {health => (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{health.service}</span>
              <Badge variant={health.status === 'ok' ? 'success' : 'destructive'}>
                {health.status}
              </Badge>
            </div>
          )}
        </QueryBoundary>
      </div>
    </Card>
  );
}

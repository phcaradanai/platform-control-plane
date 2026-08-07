import { useQuery } from '@tanstack/react-query';

import { generateRows } from './data';

/** Local-only "query" that yields the demo fixture. Kept behind TanStack
 *  Query so swapping it for a real API call later is a one-line change. */
export function useDemoRows() {
  return useQuery({
    queryKey: ['demo-rows'],
    queryFn: () => Promise.resolve(generateRows(500)),
    staleTime: Infinity,
  });
}

export interface DemoRow {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'archived';
  amount: number;
  updatedAt: string;
}

const FIRST_NAMES = [
  'Ava', 'Liam', 'Noah', 'Mia', 'Emma', 'Lucas', 'Sofia', 'Ethan',
  'Isla', 'Oliver', 'Amelia', 'Leo', 'Maya', 'Felix', 'Nora', 'Hugo',
];

const STATUSES: DemoRow['status'][] = ['active', 'pending', 'archived'];

/**
 * Deterministic fixture so tests and screenshots are stable across runs.
 * In a real application this data would come from the API boundary instead.
 */
export function generateRows(count = 500): DemoRow[] {
  const base = Date.UTC(2026, 0, 1);
  return Array.from({ length: count }, (_, index) => {
    const name = `${FIRST_NAMES[index % FIRST_NAMES.length]!} ${Math.floor(index / FIRST_NAMES.length) + 1}`;
    const status = STATUSES[(index * 7) % STATUSES.length]!;
    const amount = ((index * 37) % 9000) + 100 + (index % 100) / 100;
    const updatedAt = new Date(base + index * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return {
      id: `row-${index + 1}`,
      name,
      status,
      amount,
      updatedAt,
    };
  });
}

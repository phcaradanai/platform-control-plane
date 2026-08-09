import { describe, expect, it, vi } from 'vitest';

const { push, historySubscribe, getHref, setHref } = vi.hoisted(() => {
  let href = '/';
  return {
    push: vi.fn(),
    historySubscribe: vi.fn(() => () => {}),
    getHref: () => href,
    setHref: (next: string) => {
      href = next;
    },
  };
});

vi.mock('../router', () => ({
  router: {
    history: {
      get location() {
        return { href: getHref() };
      },
      push,
      subscribe: historySubscribe,
    },
  },
}));

import { createRouterNavigationAdapter } from './platform-navigation-adapter';

describe('createRouterNavigationAdapter', () => {
  it('navigate() delegates to the router history', () => {
    const adapter = createRouterNavigationAdapter();
    adapter.navigate('/table');
    expect(push).toHaveBeenCalledWith('/table');
  });

  it('getSnapshot() reflects the router history location and stays referentially stable when unchanged', () => {
    setHref('/');
    const adapter = createRouterNavigationAdapter();
    const first = adapter.getSnapshot();
    expect(first).toEqual({ currentPath: '/' });
    expect(adapter.getSnapshot()).toBe(first);

    setHref('/table');
    const second = adapter.getSnapshot();
    expect(second).toEqual({ currentPath: '/table' });
    expect(second).not.toBe(first);
  });

  it('subscribe() delegates to the router history', () => {
    const adapter = createRouterNavigationAdapter();
    const onChange = () => {};
    adapter.subscribe(onChange);
    expect(historySubscribe).toHaveBeenCalledWith(onChange);
  });
});

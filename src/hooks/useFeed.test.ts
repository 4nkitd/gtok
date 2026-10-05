import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repo } from '../lib/types';
import { useFeed } from './useFeed';

const searchRising = vi.hoisted(() => vi.fn());
vi.mock('../lib/github', async (importOriginal) => ({ ...(await importOriginal<object>()), searchRising }));

function repo(id: number): Repo {
  return {
    id,
    fullName: `o/r${id}`,
    owner: 'o',
    name: `r${id}`,
    avatarUrl: '',
    url: '',
    description: null,
    language: null,
    topics: [],
    stars: 1,
    forks: 0,
    createdAt: null,
  };
}

const none = new Set<number>();
const now = new Date('2026-10-05T12:00:00Z');
const seenFirstThree = new Set([1, 2, 3]);
const seenFirst = new Set([1]);

beforeEach(() => {
  searchRising.mockReset();
});

describe('useFeed', () => {
  it('loads the first page on mount', async () => {
    searchRising.mockResolvedValueOnce({ repos: [repo(1), repo(2)], hasMore: true });
    const { result } = renderHook(() => useFeed('week', 'Go', none, now));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.repos.map((r) => r.id)).toEqual([1, 2]);
    expect(searchRising).toHaveBeenCalledWith(expect.objectContaining({ window: 'week', language: 'Go', page: 1, now }));
  });

  it('appends later pages without duplicating repos that shifted between pages', async () => {
    searchRising
      .mockResolvedValueOnce({ repos: [repo(1), repo(2)], hasMore: true })
      .mockResolvedValueOnce({ repos: [repo(2), repo(3)], hasMore: false });
    const { result } = renderHook(() => useFeed('week', '', none, now));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.loadMore());

    expect(result.current.repos.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(result.current.hasMore).toBe(false);
  });

  it('skips repos already seen and pages past fully seen pages', async () => {
    searchRising
      .mockResolvedValueOnce({ repos: [repo(1), repo(2)], hasMore: true })
      .mockResolvedValueOnce({ repos: [repo(3), repo(4)], hasMore: true });
    const { result } = renderHook(() => useFeed('week', '', seenFirstThree, now));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.repos.map((r) => r.id)).toEqual([4]);
    expect(searchRising).toHaveBeenCalledTimes(2);
  });

  it('stops after three fully seen pages and reports it is stalled', async () => {
    searchRising.mockResolvedValue({ repos: [repo(1)], hasMore: true });
    const { result } = renderHook(() => useFeed('week', '', seenFirst, now));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(searchRising).toHaveBeenCalledTimes(3);
    expect(result.current.stalled).toBe(true);
    expect(result.current.repos).toEqual([]);
  });

  it('keeps loaded repos when a later page fails, and retries the same page', async () => {
    searchRising
      .mockResolvedValueOnce({ repos: [repo(1)], hasMore: true })
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ repos: [repo(2)], hasMore: false });
    const { result } = renderHook(() => useFeed('week', '', none, now));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.loadMore());
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.repos.map((r) => r.id)).toEqual([1]);

    await act(() => result.current.loadMore());
    expect(result.current.error).toBeNull();
    expect(result.current.repos.map((r) => r.id)).toEqual([1, 2]);
    expect(searchRising.mock.calls.map(([params]) => (params as { page: number }).page)).toEqual([1, 2, 2]);
  });

  it('aborts the in-flight search on unmount', () => {
    searchRising.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = renderHook(() => useFeed('week', '', none, now));
    const { signal } = searchRising.mock.calls[0]?.[0] as { signal: AbortSignal };

    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });
});

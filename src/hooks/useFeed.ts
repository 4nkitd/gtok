import { useCallback, useEffect, useRef, useState } from 'react';
import { searchRising } from '../lib/github';
import type { Repo, TimeWindow } from '../lib/types';

const MAX_EMPTY_PAGES = 3;

interface Session {
  controller: AbortController;
  page: number;
  hasMore: boolean;
  loading: boolean;
  ids: Set<number>;
}

export interface FeedState {
  repos: Repo[];
  loading: boolean;
  hasMore: boolean;
  stalled: boolean;
  error: Error | null;
}

// Remount (via React key) to change filters; one hook instance serves one window/language pair.
export function useFeed(window: TimeWindow, language: string, hidden: ReadonlySet<number>) {
  const [state, setState] = useState<FeedState>({ repos: [], loading: true, hasMore: true, stalled: false, error: null });
  const sessionRef = useRef<Session | null>(null);

  const loadMore = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || session.loading || !session.hasMore) return;
    session.loading = true;
    setState((current) => ({ ...current, loading: true, stalled: false, error: null }));

    try {
      let fresh: Repo[] = [];
      // Skip ahead when a whole page is already seen, but cap it so one scroll can't burn the search quota.
      for (let attempt = 0; fresh.length === 0 && session.hasMore && attempt < MAX_EMPTY_PAGES; attempt++) {
        const result = await searchRising({ window, language, page: session.page + 1, signal: session.controller.signal });
        session.page += 1;
        session.hasMore = result.hasMore;
        fresh = result.repos.filter((repo) => !hidden.has(repo.id) && !session.ids.has(repo.id));
      }
      fresh.forEach((repo) => session.ids.add(repo.id));
      if (session.controller.signal.aborted) return;
      setState((current) => ({
        repos: [...current.repos, ...fresh],
        loading: false,
        hasMore: session.hasMore,
        stalled: fresh.length === 0 && session.hasMore,
        error: null,
      }));
    } catch (error) {
      if (session.controller.signal.aborted) return;
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error : new Error(String(error)) }));
    } finally {
      session.loading = false;
    }
  }, [window, language, hidden]);

  useEffect(() => {
    const session: Session = { controller: new AbortController(), page: 0, hasMore: true, loading: false, ids: new Set() };
    sessionRef.current = session;
    void loadMore();
    return () => {
      session.controller.abort();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [loadMore]);

  return { ...state, loadMore };
}

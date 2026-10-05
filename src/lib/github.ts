import type { Repo, TimeWindow } from './types';

export class RateLimitError extends Error {
  constructor(readonly resetAt: Date | null) {
    super('Search is temporarily limited');
    this.name = 'RateLimitError';
  }
}

export class GitHubError extends Error {
  constructor(readonly status: number, message = `The feed responded with ${status}`) {
    super(message);
    this.name = 'GitHubError';
  }
}

export interface SearchParams {
  window: TimeWindow;
  language: string;
  page: number;
  signal?: AbortSignal;
  now?: Date;
}

export interface SearchPage {
  repos: Repo[];
  hasMore: boolean;
  stale: boolean;
  cachedAt: string;
}

export async function searchRising({ window, language, page, signal, now = new Date() }: SearchParams): Promise<SearchPage> {
  const url = new URL('/api/repos', location.origin);
  url.searchParams.set('window', window);
  url.searchParams.set('language', language);
  url.searchParams.set('page', String(page));
  url.searchParams.set('asOf', now.toISOString().slice(0, 10));
  const res = await fetch(url, { signal, credentials: 'omit' });
  if (!res.ok) {
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after'));
      throw new RateLimitError(Number.isFinite(wait) && wait > 0 ? new Date(Date.now() + wait * 1000) : null);
    }
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new GitHubError(res.status, body?.error);
  }
  return res.json();
}

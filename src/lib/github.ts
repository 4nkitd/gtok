import type { Repo, TimeWindow } from './types';

const SEARCH_URL = 'https://api.github.com/search/repositories';
export const PAGE_SIZE = 30;
const MAX_SEARCH_RESULTS = 1000;
const WINDOW_DAYS: Record<TimeWindow, number> = { day: 1, week: 7, month: 30 };
const DAY_MS = 86_400_000;

export class RateLimitError extends Error {
  readonly resetAt: Date | null;

  constructor(resetAt: Date | null) {
    super('GitHub rate limit reached');
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

export class GitHubError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`GitHub responded with ${status}`);
    this.name = 'GitHubError';
    this.status = status;
  }
}

export function sinceDate(window: TimeWindow, now: Date): string {
  return new Date(now.getTime() - WINDOW_DAYS[window] * DAY_MS).toISOString().slice(0, 10);
}

export function buildQuery(window: TimeWindow, language: string, now: Date): string {
  const parts = [`created:>=${sinceDate(window, now)}`];
  if (language) parts.push(`language:"${language.replaceAll('"', '')}"`);
  return parts.join(' ');
}

interface SearchItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  owner: { login: string; avatar_url: string } | null;
}

function toRepo(item: SearchItem): Repo {
  const owner = item.owner?.login ?? item.full_name.split('/')[0] ?? '';
  return {
    id: item.id,
    fullName: item.full_name,
    owner,
    name: item.name,
    avatarUrl: item.owner?.avatar_url ?? `https://github.com/${owner}.png`,
    url: item.html_url,
    description: item.description,
    language: item.language,
    topics: item.topics ?? [],
    stars: item.stargazers_count,
    forks: item.forks_count,
    createdAt: item.created_at,
  };
}

function rateLimitFrom(res: Response): RateLimitError | null {
  const retryAfter = res.headers.get('retry-after');
  if (retryAfter) return new RateLimitError(new Date(Date.now() + Number(retryAfter) * 1000));
  const reset = res.headers.get('x-ratelimit-reset');
  const resetAt = reset ? new Date(Number(reset) * 1000) : null;
  if (res.status === 429) return new RateLimitError(resetAt);
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') return new RateLimitError(resetAt);
  return null;
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
}

export async function searchRising({ window, language, page, signal, now = new Date() }: SearchParams): Promise<SearchPage> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('q', buildQuery(window, language, now));
  url.searchParams.set('sort', 'stars');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(PAGE_SIZE));
  url.searchParams.set('page', String(page));

  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' }, signal });
  if (!res.ok) throw rateLimitFrom(res) ?? new GitHubError(res.status);

  const body = (await res.json()) as { total_count: number; items: SearchItem[] };
  return {
    repos: body.items.map(toRepo),
    hasMore: page * PAGE_SIZE < Math.min(body.total_count, MAX_SEARCH_RESULTS),
  };
}

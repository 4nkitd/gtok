import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildQuery, GitHubError, PAGE_SIZE, RateLimitError, searchRising, sinceDate } from './github';

const now = new Date('2026-10-05T12:00:00Z');

function item(id: number) {
  return {
    id,
    name: `repo${id}`,
    full_name: `owner/repo${id}`,
    html_url: `https://github.com/owner/repo${id}`,
    description: 'desc',
    language: 'Go',
    topics: ['cli'],
    stargazers_count: 1200,
    forks_count: 30,
    created_at: '2026-10-01T00:00:00Z',
    owner: { login: 'owner', avatar_url: 'https://avatars.example/owner' },
  };
}

function mockFetch(response: Response) {
  const fn = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sinceDate', () => {
  it.each([
    ['day', '2026-10-04'],
    ['week', '2026-09-28'],
    ['month', '2026-09-05'],
  ] as const)('%s window starts at %s', (window, expected) => {
    expect(sinceDate(window, now)).toBe(expected);
  });
});

describe('buildQuery', () => {
  it('filters by creation date only when no language is chosen', () => {
    expect(buildQuery('week', '', now)).toBe('created:>=2026-09-28');
  });

  it('quotes languages so names with spaces and symbols work', () => {
    expect(buildQuery('day', 'Jupyter Notebook', now)).toBe('created:>=2026-10-04 language:"Jupyter Notebook"');
    expect(buildQuery('day', 'c"++', now)).toBe('created:>=2026-10-04 language:"c++"');
  });
});

describe('searchRising', () => {
  it('requests stars-sorted results and maps them to repos', async () => {
    const fetchMock = mockFetch(Response.json({ total_count: 45, items: [item(1)] }));

    const page = await searchRising({ window: 'week', language: 'go', page: 1, now });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('q')).toBe('created:>=2026-09-28 language:"go"');
    expect(url.searchParams.get('sort')).toBe('stars');
    expect(url.searchParams.get('per_page')).toBe(String(PAGE_SIZE));
    expect(url.searchParams.get('page')).toBe('1');
    expect(page.repos[0]).toEqual({
      id: 1,
      fullName: 'owner/repo1',
      owner: 'owner',
      name: 'repo1',
      avatarUrl: 'https://avatars.example/owner',
      url: 'https://github.com/owner/repo1',
      description: 'desc',
      language: 'Go',
      topics: ['cli'],
      stars: 1200,
      forks: 30,
      createdAt: '2026-10-01T00:00:00Z',
    });
    expect(page.hasMore).toBe(true);
  });

  it('reports no more pages after the last result', async () => {
    mockFetch(Response.json({ total_count: 45, items: [] }));
    expect((await searchRising({ window: 'week', language: '', page: 2, now })).hasMore).toBe(false);
  });

  it('stops at the 1000-result search cap', async () => {
    mockFetch(Response.json({ total_count: 50_000, items: [] }));
    const lastPage = Math.ceil(1000 / PAGE_SIZE);
    expect((await searchRising({ window: 'week', language: '', page: lastPage, now })).hasMore).toBe(false);
    mockFetch(Response.json({ total_count: 50_000, items: [] }));
    expect((await searchRising({ window: 'week', language: '', page: lastPage - 1, now })).hasMore).toBe(true);
  });

  it('turns an exhausted quota into a RateLimitError with the reset time', async () => {
    mockFetch(
      new Response('{}', {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1791201600' },
      }),
    );
    const error = await searchRising({ window: 'week', language: '', page: 1, now }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).resetAt?.getTime()).toBe(1791201600 * 1000);
  });

  it('treats 429 as a rate limit', async () => {
    mockFetch(new Response('{}', { status: 429 }));
    await expect(searchRising({ window: 'week', language: '', page: 1, now })).rejects.toBeInstanceOf(RateLimitError);
  });

  it('honours retry-after on secondary limits', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    mockFetch(new Response('{}', { status: 403, headers: { 'retry-after': '30' } }));
    const error = (await searchRising({ window: 'week', language: '', page: 1, now }).catch((e: unknown) => e)) as RateLimitError;
    expect(error.resetAt?.getTime()).toBe(1_030_000);
  });

  it('detects secondary limits that only say so in the body', async () => {
    mockFetch(
      new Response(JSON.stringify({ message: 'You have exceeded a secondary rate limit.' }), {
        status: 403,
        headers: { 'x-ratelimit-remaining': '7' },
      }),
    );
    await expect(searchRising({ window: 'week', language: '', page: 1, now })).rejects.toBeInstanceOf(RateLimitError);
  });

  it('does not mistake other errors with retry-after for rate limits', async () => {
    mockFetch(new Response('', { status: 503, headers: { 'retry-after': '5' } }));
    await expect(searchRising({ window: 'week', language: '', page: 1, now })).rejects.toEqual(new GitHubError(503));
    mockFetch(new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }));
    await expect(searchRising({ window: 'week', language: '', page: 1, now })).rejects.toEqual(new GitHubError(403));
  });

  it('surfaces other failures as GitHubError', async () => {
    mockFetch(new Response('{}', { status: 422 }));
    await expect(searchRising({ window: 'week', language: '', page: 1, now })).rejects.toEqual(new GitHubError(422));
  });
});

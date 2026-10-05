import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitHubError, RateLimitError, searchRising } from './github';

const params = { window: 'week', language: 'Go', page: 1, now: new Date('2026-10-05T12:00:00Z') } as const;
afterEach(() => vi.unstubAllGlobals());

describe('backend feed client', () => {
  it('requests the same-origin API without credentials and keeps cache metadata', async () => {
    const body = { repos: [], hasMore: false, stale: true, cachedAt: '2026-10-05T12:00:00Z' };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchRising(params)).toEqual(body);
    const [input, init] = fetchMock.mock.calls[0]!;
    const url = new URL(String(input));
    expect(url.origin).toBe(location.origin);
    expect(url.pathname).toBe('/api/repos');
    expect(Object.fromEntries(url.searchParams)).toEqual({ window: 'week', language: 'Go', page: '1', asOf: '2026-10-05' });
    expect(init?.credentials).toBe('omit');
  });

  it('reports the shared backend cooldown', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000000);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '60' } })));
    const error = await searchRising(params).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).resetAt?.getTime()).toBe(1060000);
  });

  it('surfaces actionable server failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'This feed has expired. Refresh the page.' }, { status: 400 })));
    await expect(searchRising(params)).rejects.toEqual(new GitHubError(400, 'This feed has expired. Refresh the page.'));
  });
});

import { readFile } from 'node:fs/promises';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import worker, { cleanup } from './index';
import { cached } from './cache';
import type { Env } from './env';

const origin = 'https://gtok.dagar.in';
let mf: Miniflare;
let env: Env;
let upstream: ReturnType<typeof vi.fn<typeof fetch>>;
const rawRepo = {
  id: 42, full_name: 'Acme/rocket', name: 'rocket', owner: { login: 'Acme', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
  html_url: 'javascript:alert(1)', description: 'A rocket', language: 'Go', topics: ['cli'],
  stargazers_count: 100, forks_count: 2, created_at: '2026-10-01T00:00:00Z',
};

function request(path: string, init?: RequestInit) {
  return worker.fetch(new Request(`${origin}${path}`, init), env);
}

function post(body: unknown, originHeader = origin) {
  return request('/api/opens', { method: 'POST', headers: { Origin: originHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

beforeAll(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("ok") } }', d1Databases: ['DB'] }));
  const db = await mf.getD1Database('DB');
  env = { DB: db as unknown as D1Database, ASSETS: { fetch: async () => new Response('asset') } };
  const migration = await readFile(new URL('./migrations/0001_cache_and_counts.sql', import.meta.url), 'utf8');
  for (const statement of migration.split(';').filter((part) => part.trim())) await db.prepare(statement).run();
});

beforeEach(async () => {
  await env.DB.batch(['repo_open_daily', 'repo_catalog', 'api_cache', 'request_budgets', 'upstream_cooldowns'].map((table) => env.DB.prepare(`DELETE FROM ${table}`)));
  upstream = vi.fn<typeof fetch>(async (input) => String(input).includes('api.github.com')
    ? Response.json({ total_count: 31, items: [rawRepo], incomplete_results: false })
    : new Response('# Rocket'));
  vi.stubGlobal('fetch', upstream);
});

afterEach(() => vi.unstubAllGlobals());
afterAll(async () => mf?.dispose());

describe('shared cache', () => {
  it('hits GitHub once for repeated feed requests and persists normalized catalog data', async () => {
    const first = await request('/api/repos?language=C%2B%2B');
    expect(first.status).toBe(200);
    expect(first.headers.get('x-cache')).toBe('MISS');
    const body = await first.json() as { repos: { url: string }[] };
    expect(body.repos[0]?.url).toBe('https://github.com/acme/rocket');
    const second = await request('/api/repos?language=C%2B%2B');
    expect(second.headers.get('x-cache')).toBe('HIT');
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(new URL(String(upstream.mock.calls[0]?.[0])).searchParams.get('q')).toContain('language:"C++"');
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM repo_catalog').first('n')).toBe(1);
  });

  it('coalesces simultaneous cache misses using SQLite leases', async () => {
    const results = await Promise.all([request('/api/repos'), request('/api/repos'), request('/api/repos')]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('serves last-good data if GitHub fails after freshness expires', async () => {
    await request('/api/repos');
    await env.DB.prepare('UPDATE api_cache SET fresh_until = 0').run();
    upstream.mockResolvedValueOnce(new Response('', { status: 500 }));
    const res = await request('/api/repos');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache')).toBe('STALE');
    expect(await res.json()).toMatchObject({ stale: true });
    await request('/api/repos');
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('does not serve data beyond its stale deadline', async () => {
    await request('/api/repos');
    await env.DB.prepare('UPDATE api_cache SET fresh_until = 0, stale_until = 0').run();
    upstream.mockResolvedValueOnce(new Response('', { status: 500 }));
    expect((await request('/api/repos')).status).toBe(502);
  });

  it('caches README variants and missing READMEs', async () => {
    await request('/api/repos');
    upstream.mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(new Response('# lowercase'));
    expect(await (await request('/api/readme?repo=Acme%2Frocket')).json()).toMatchObject({ markdown: '# lowercase' });
    expect((await request('/api/readme?repo=acme%2Frocket')).headers.get('x-cache')).toBe('HIT');
    expect(upstream).toHaveBeenCalledTimes(3);
    expect(String(upstream.mock.calls[2]?.[0])).toContain('/readme.md');
    await env.DB.prepare("DELETE FROM api_cache WHERE key LIKE 'readme:%'").run();
    upstream.mockImplementation(async () => new Response('', { status: 404 }));
    expect(await (await request('/api/readme?repo=acme/rocket')).json()).toMatchObject({ markdown: null });
    expect((await request('/api/readme?repo=acme/rocket')).headers.get('x-cache')).toBe('HIT');
  });

  it('returns 503 during an abandoned lease without fetching again', async () => {
    await env.DB.prepare('INSERT INTO api_cache (key, lease_until) VALUES (?, ?)').bind('locked', Math.floor(Date.now() / 1000) + 45).run();
    const load = vi.fn();
    await expect(cached(env.DB, 'locked', 60, 120, load)).rejects.toMatchObject({ status: 503 });
    expect(load).not.toHaveBeenCalled();
  });
});

describe('upstream protection', () => {
  it.each(['window=toString', 'language=Go+OR+stars%3A%3E1', 'page=0', 'page=35', 'page=NaN', 'asOf=2020-01-01', 'q=anything'])('rejects unbounded queries: %s', async (query) => {
    expect((await request(`/api/repos?${query}`)).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('shares rate-limit cooldowns across filters', async () => {
    upstream.mockResolvedValueOnce(new Response('secondary rate limit', { status: 403, headers: { 'Retry-After': '120' } }));
    const first = await request('/api/repos');
    expect(first.status).toBe(429);
    expect(first.headers.get('retry-after')).toBe('120');
    expect((await request('/api/repos?language=Go')).status).toBe(429);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('limits fresh GitHub searches without limiting cache hits', async () => {
    for (let page = 1; page <= 8; page++) expect((await request(`/api/repos?page=${page}`)).status).toBe(200);
    expect((await request('/api/repos?page=9')).status).toBe(429);
    expect((await request('/api/repos?page=1')).status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(8);
  });

  it('enforces the GitHub 1000-result pagination boundary', async () => {
    upstream.mockImplementation(async () => Response.json({ total_count: 50000, items: [rawRepo] }));
    expect(await (await request('/api/repos?page=33')).json()).toMatchObject({ hasMore: true });
    expect(await (await request('/api/repos?page=34')).json()).toMatchObject({ hasMore: false });
  });

  it('rejects oversized README bodies and unknown repositories', async () => {
    expect((await request('/api/readme?repo=unknown/repo')).status).toBe(404);
    await request('/api/repos');
    upstream.mockResolvedValueOnce(new Response('x'.repeat(512 * 1024 + 1)));
    expect((await request('/api/readme?repo=acme/rocket')).status).toBe(413);
  });

  it('never forwards a GitHub token to image or raw hosts', async () => {
    env.GITHUB_TOKEN = 'fake-test-token';
    try {
      await request('/api/repos');
      await request('/api/readme?repo=acme/rocket');
      expect(new Headers(upstream.mock.calls[0]?.[1]?.headers).get('authorization')).toBe('Bearer fake-test-token');
      expect(new Headers(upstream.mock.calls[1]?.[1]?.headers).has('authorization')).toBe(false);
    } finally { delete env.GITHUB_TOKEN; }
  });

  it('rejects upstream redirects rather than following them with credentials', async () => {
    upstream.mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: 'https://elsewhere.example' } }));
    expect((await request('/api/repos')).status).toBe(502);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0]?.[1]?.redirect).toBe('manual');
  });
});

describe('aggregate opens', () => {
  it('increments a daily total atomically without recording request identifiers', async () => {
    await request('/api/repos');
    const results = await Promise.all(Array.from({ length: 6 }, () => post({ repo: 'Acme/rocket' })));
    expect(results.map((r) => r.status)).toEqual(Array(6).fill(204));
    const rows = await env.DB.prepare('SELECT * FROM repo_open_daily').all();
    expect(rows.results).toEqual([{ repo: 'acme/rocket', day: new Date().toISOString().slice(0, 10), opens: 6 }]);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(results.every((r) => !r.headers.has('set-cookie'))).toBe(true);
  });

  it('rejects cross-origin submissions, identifiers, unknown repos and invalid types', async () => {
    await request('/api/repos');
    expect((await post({ repo: 'acme/rocket' }, 'https://elsewhere.example')).status).toBe(403);
    expect((await post({ repo: 'acme/rocket', visitorId: 'nope' })).status).toBe(400);
    expect((await post({ repo: 'unknown/repo' })).status).toBe(404);
    expect((await post({ repo: ['acme/rocket'] })).status).toBe(400);
    expect((await post({ repo: 'acme/..' })).status).toBe(400);
    expect((await request('/api/opens')).status).toBe(404);
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM repo_open_daily').first('n')).toBe(0);
  });

  it('rejects huge and non-JSON events', async () => {
    expect((await post({ repo: 'x'.repeat(300) })).status).toBe(413);
    expect((await request('/api/opens', { method: 'POST', headers: { Origin: origin }, body: 'repo=acme/rocket' })).status).toBe(415);
  });

  it('cleans expired counts, cache entries and budgets but keeps current records', async () => {
    await request('/api/repos');
    await post({ repo: 'acme/rocket' });
    await env.DB.prepare("INSERT INTO repo_open_daily (day, repo) VALUES ('2020-01-01', 'acme/rocket')").run();
    await env.DB.prepare("INSERT INTO api_cache (key) VALUES ('expired')").run();
    await cleanup(env);
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM repo_open_daily').first('n')).toBe(1);
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM api_cache').first('n')).toBe(1);
  });
});

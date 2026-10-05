import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { expect, it } from 'vitest';

it('runs the compiled backend in workerd, including upstream fetch, cache and counters', async () => {
  const compiled = await build({ entryPoints: ['worker/index.ts'], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false });
  let upstreamRequests = 0;
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    compatibilityDate: '2026-10-05',
    script: compiled.outputFiles[0]!.text,
    d1Databases: ['DB'],
    serviceBindings: { ASSETS: async () => new Response('assets') },
    outboundService: async (request) => {
      upstreamRequests++;
      if (request.url.startsWith('https://api.github.com/')) return Response.json({
        total_count: 1,
        items: [{ id: 1, full_name: 'acme/rocket', created_at: '2026-10-01T00:00:00Z' }],
      });
      return new Response('# Rocket');
    },
  }));
  try {
    const db = await mf.getD1Database('DB');
    const migration = await readFile(new URL('./migrations/0001_cache_and_counts.sql', import.meta.url), 'utf8');
    for (const statement of migration.split(';').filter((part) => part.trim())) await db.prepare(statement).run();
    const first = await mf.dispatchFetch('https://gtok.dagar.in/api/repos');
    expect(first.status, await first.clone().text()).toBe(200);
    expect(first.headers.get('x-cache')).toBe('MISS');
    expect((await mf.dispatchFetch('https://gtok.dagar.in/api/repos')).headers.get('x-cache')).toBe('HIT');
    expect(upstreamRequests).toBe(1);
    const readme = await mf.dispatchFetch('https://gtok.dagar.in/api/readme?repo=acme/rocket');
    expect(readme.status).toBe(200);
    expect(await readme.json()).toMatchObject({ markdown: '# Rocket' });
    const open = await mf.dispatchFetch('https://gtok.dagar.in/api/opens', {
      method: 'POST', headers: { Origin: 'https://gtok.dagar.in', 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: 'acme/rocket' }),
    });
    expect(open.status).toBe(204);
    expect(await db.prepare('SELECT opens FROM repo_open_daily').first('opens')).toBe(1);
    expect(upstreamRequests).toBe(2);
  } finally {
    await mf.dispose();
  }
});

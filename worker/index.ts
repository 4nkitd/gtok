import type { Env } from './env';
import { cached } from './cache';
import { fetchReadme, fetchSearch, searchParams } from './github';
import { boundedText, HttpError, json, repoName, takeBudget } from './http';

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/') && url.pathname !== '/api') return env.ASSETS.fetch(request);
  if (url.pathname === '/api/health' && request.method === 'GET') {
    await env.DB.prepare('SELECT key FROM api_cache LIMIT 1').first();
    return json({ ok: true });
  }
  if (url.pathname === '/api/repos' && request.method === 'GET') {
    const { key, query, page } = searchParams(url);
    const result = await cached(env.DB, key, 15 * 60, 24 * 3600, () => fetchSearch(env, query, page));
    return json({ ...result.data, stale: result.state === 'STALE', cachedAt: result.storedAt }, 200, { 'X-Cache': result.state });
  }
  if (url.pathname === '/api/readme' && request.method === 'GET') {
    const repo = repoName(url.searchParams.get('repo'));
    const known = await env.DB.prepare('SELECT name FROM repo_catalog WHERE name = ?').bind(repo).first();
    if (!known) throw new HttpError(404, 'Repository not found in the feed.');
    const result = await cached(env.DB, `readme:${repo}`, 6 * 3600, 7 * 86400, () => fetchReadme(env, repo));
    return json({ ...result.data, stale: result.state === 'STALE', cachedAt: result.storedAt }, 200, { 'X-Cache': result.state });
  }
  if (url.pathname === '/api/opens' && request.method === 'POST') {
    // No cookies or identity fields. Cross-site pages must not be able to submit browser-generated counts.
    if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      throw new HttpError(403, 'Same-origin requests only.');
    }
    if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') throw new HttpError(415, 'JSON required.');
    let body: unknown;
    try { body = JSON.parse(await boundedText(request, 256)); } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, 'Invalid JSON.');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => key !== 'repo')) {
      throw new HttpError(400, 'Only a repository name is accepted.');
    }
    const repo = repoName((body as { repo?: string }).repo ?? null);
    if (!await env.DB.prepare('SELECT name FROM repo_catalog WHERE name = ?').bind(repo).first()) throw new HttpError(404, 'Unknown repository.');
    await takeBudget(env.DB, 'opens', 600);
    await env.DB.prepare(`
      INSERT INTO repo_open_daily (day, repo) VALUES (?, ?)
      ON CONFLICT(day, repo) DO UPDATE SET opens = opens + 1
    `).bind(new Date().toISOString().slice(0, 10), repo).run();
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  throw new HttpError(404, 'API route not found.');
}

export async function cleanup(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM api_cache WHERE stale_until < ? AND lease_until < ?').bind(now, now),
    env.DB.prepare('DELETE FROM request_budgets WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM repo_open_daily WHERE day < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM repo_catalog WHERE updated_at < ? AND NOT EXISTS (SELECT 1 FROM repo_open_daily WHERE repo = name)').bind(now - 30 * 86400),
  ]);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try { return await route(request, env); } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
      }
      return json({ error: 'Service temporarily unavailable.' }, 503, { 'Retry-After': '30' });
    }
  },
  async scheduled(_event: unknown, env: Env) {
    await cleanup(env);
  },
};

import type { D1Database } from '@cloudflare/workers-types';
import { HttpError } from './http';

interface CacheRow {
  body: string | null;
  stored_at: number;
  fresh_until: number;
  stale_until: number;
  lease_until: number;
}

export async function cached<T>(db: D1Database, key: string, ttl: number, staleTtl: number, load: () => Promise<T>) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare('SELECT * FROM api_cache WHERE key = ?').bind(key).first<CacheRow>();
  const result = (body: string, storedAt: number, state: 'HIT' | 'MISS' | 'STALE') => ({
    data: JSON.parse(body) as T,
    storedAt: new Date(storedAt * 1000).toISOString(),
    state,
  });
  if (row?.body && row.fresh_until > now) return result(row.body, row.stored_at, 'HIT');

  // A D1 lease prevents concurrent cold requests in different Worker isolates from all fetching GitHub.
  const lease = await db.prepare(`
    INSERT INTO api_cache (key, lease_until) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET lease_until = excluded.lease_until
    WHERE api_cache.lease_until <= ? AND api_cache.fresh_until <= ?
    RETURNING key
  `).bind(key, now + 45, now, now).first();
  if (!lease) {
    if (row?.body && row.stale_until > now) return result(row.body, row.stored_at, 'STALE');
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const ready = await db.prepare('SELECT * FROM api_cache WHERE key = ?').bind(key).first<CacheRow>();
      if (ready?.body && ready.fresh_until > now) return result(ready.body, ready.stored_at, 'HIT');
    }
    throw new HttpError(503, 'This feed is being refreshed. Try again in a moment.', 3);
  }

  try {
    const body = JSON.stringify(await load());
    await db.prepare(`
      UPDATE api_cache SET body = ?, stored_at = ?, fresh_until = ?, stale_until = ?, lease_until = 0 WHERE key = ?
    `).bind(body, now, now + ttl, now + staleTtl, key).run();
    return result(body, now, 'MISS');
  } catch (error) {
    const wait = error instanceof HttpError ? Math.min(error.retryAfter ?? 30, 300) : 30;
    await db.prepare('UPDATE api_cache SET lease_until = ? WHERE key = ?').bind(now + wait, key).run();
    if (row?.body && row.stale_until > now) return result(row.body, row.stored_at, 'STALE');
    throw error;
  }
}

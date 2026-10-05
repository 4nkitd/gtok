import type { D1Database } from '@cloudflare/workers-types';

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly retryAfter?: number) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...headers,
    },
  });
}

export async function boundedText(message: Request | Response, limit: number): Promise<string> {
  if (Number(message.headers.get('content-length')) > limit) throw new HttpError(413, 'Response or request is too large.');
  const reader = message.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > limit) throw new HttpError(413, 'Response or request is too large.');
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export async function takeBudget(db: D1Database, category: string, limit: number): Promise<void> {
  const minute = Math.floor(Date.now() / 60_000);
  const row = await db.prepare(`
    INSERT INTO request_budgets (key, used, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET used = used + 1 WHERE used < ?
    RETURNING used
  `).bind(`${category}:${minute}`, (minute + 1) * 60, limit).first();
  if (!row) throw new HttpError(429, 'Too many requests. Try again shortly.', 60);
}

export function repoName(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]{1,100}$/i.test(value)) {
    throw new HttpError(400, 'Invalid repository name.');
  }
  const name = value.split('/')[1];
  if (name === '.' || name === '..') throw new HttpError(400, 'Invalid repository name.');
  return value.toLowerCase();
}

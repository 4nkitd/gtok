import type { Repo, TimeWindow } from '../src/lib/types';
import { LANGUAGES } from '../src/lib/languages';
import type { Env } from './env';
import { boundedText, HttpError, repoName, takeBudget } from './http';

export const PAGE_SIZE = 30;
const DAYS: Record<TimeWindow, number> = { day: 1, week: 7, month: 30 };
const README_NAMES = ['README.md', 'readme.md', 'Readme.md'];

export function searchParams(url: URL) {
  const params = url.searchParams;
  if ([...params.keys()].some((key) => !['window', 'language', 'page', 'asOf'].includes(key))) {
    throw new HttpError(400, 'Unknown search parameter.');
  }
  const window = params.get('window') ?? 'week';
  const language = params.get('language') ?? '';
  const page = params.get('page') ?? '1';
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const asOf = params.get('asOf') ?? today;
  if (!Object.hasOwn(DAYS, window) || (language && !LANGUAGES.includes(language))) throw new HttpError(400, 'Invalid search filter.');
  if (!/^[1-9]\d?$/.test(page) || Number(page) > 34) throw new HttpError(400, 'Page must be between 1 and 34.');
  if (asOf !== today && asOf !== yesterday) throw new HttpError(400, 'This feed has expired. Refresh the page.');
  const since = new Date(Date.parse(asOf) - DAYS[window as TimeWindow] * 86_400_000).toISOString().slice(0, 10);
  const query = `created:>=${since}${language ? ` language:"${language}"` : ''}`;
  return { query, page: Number(page), key: `search:${asOf}:${window}:${language}:${page}` };
}

async function upstream(url: string, env: Env, githubApi: boolean): Promise<Response> {
  const headers: Record<string, string> = { 'User-Agent': 'G.tok (https://gtok.dagar.in)' };
  if (githubApi) {
    headers.Accept = 'application/vnd.github+json';
    headers['X-GitHub-Api-Version'] = '2022-11-28';
    if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000), redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new HttpError(502, 'GitHub redirected this request.');
    }
    return response;
  } catch {
    throw new HttpError(502, 'GitHub is unavailable. Try again shortly.');
  }
}

function normalize(item: unknown): Repo {
  const value = item as Record<string, unknown>;
  if (!value || typeof value.full_name !== 'string' || !Number.isSafeInteger(value.id)) throw new HttpError(502, 'Invalid GitHub response.');
  const fullName = repoName(value.full_name);
  const [owner = '', name = ''] = value.full_name.split('/');
  const avatar = (value.owner as { avatar_url?: unknown } | null)?.avatar_url;
  const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
  return {
    id: value.id as number, fullName: value.full_name, owner, name,
    url: `https://github.com/${fullName}`,
    avatarUrl: typeof avatar === 'string' && avatar.startsWith('https://avatars.githubusercontent.com/') ? avatar : `https://github.com/${owner}.png`,
    description: typeof value.description === 'string' ? value.description : null,
    language: typeof value.language === 'string' ? value.language : null,
    topics: Array.isArray(value.topics) ? value.topics.filter((t): t is string => typeof t === 'string').slice(0, 20) : [],
    stars: count(value.stargazers_count), forks: count(value.forks_count),
    createdAt: typeof value.created_at === 'string' && Number.isFinite(Date.parse(value.created_at)) ? value.created_at : null,
  };
}

export async function fetchSearch(env: Env, query: string, page: number) {
  const now = Math.floor(Date.now() / 1000);
  const cooldown = await env.DB.prepare('SELECT until_at FROM upstream_cooldowns WHERE service = ?').bind('github').first<{ until_at: number }>();
  if (cooldown && cooldown.until_at > now) throw new HttpError(429, 'GitHub search is cooling down.', cooldown.until_at - now);
  await takeBudget(env.DB, 'github-search', 8);
  const params = new URLSearchParams({ q: query, sort: 'stars', order: 'desc', per_page: String(PAGE_SIZE), page: String(page) });
  const res = await upstream(`https://api.github.com/search/repositories?${params}`, env, true);
  const text = await boundedText(res, 2 * 1024 * 1024);
  if (!res.ok) {
    if (res.status === 429 || (res.status === 403 && (res.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(text)))) {
      const retry = Number(res.headers.get('retry-after'));
      const reset = Number(res.headers.get('x-ratelimit-reset')) - now;
      const wait = Math.min(3600, Math.max(60, Number.isFinite(retry) ? retry : 0, Number.isFinite(reset) ? reset : 0));
      await env.DB.prepare(`INSERT INTO upstream_cooldowns (service, until_at) VALUES ('github', ?)
        ON CONFLICT(service) DO UPDATE SET until_at = MAX(until_at, excluded.until_at)`).bind(now + wait).run();
      throw new HttpError(429, 'GitHub search is cooling down.', wait);
    }
    throw new HttpError(502, 'GitHub search is unavailable.');
  }
  let data: { items?: unknown[]; total_count?: number; incomplete_results?: boolean };
  try { data = JSON.parse(text); } catch { throw new HttpError(502, 'Invalid GitHub response.'); }
  if (!data || !Array.isArray(data.items) || typeof data.total_count !== 'number' || data.incomplete_results) {
    throw new HttpError(502, 'GitHub returned incomplete results. Try again shortly.');
  }
  const repos = data.items.slice(0, PAGE_SIZE).map(normalize);
  await env.DB.prepare(`
    INSERT INTO repo_catalog (name, metadata, updated_at)
    SELECT lower(json_extract(value, '$.fullName')), value, ? FROM json_each(?) WHERE true
    ON CONFLICT(name) DO UPDATE SET metadata = excluded.metadata, updated_at = excluded.updated_at
  `).bind(now, JSON.stringify(repos)).run();
  return { repos, hasMore: page * PAGE_SIZE < Math.min(data.total_count, 1000) };
}

export async function fetchReadme(env: Env, repo: string) {
  await takeBudget(env.DB, 'readme', 60);
  for (const name of README_NAMES) {
    const res = await upstream(`https://raw.githubusercontent.com/${repo}/HEAD/${name}`, env, false);
    if (res.ok) return { markdown: await boundedText(res, 512 * 1024) };
    await res.body?.cancel();
    if (res.status !== 404) throw new HttpError(502, 'The README is unavailable.');
  }
  return { markdown: null };
}

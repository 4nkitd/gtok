import type { Repo } from './types';

const SAVED_KEY = 'gtok:saved';
const SEEN_KEY = 'gtok:seen';
const LEGACY_SAVED_KEY = 'gtok_saved_repos';
export const SEEN_LIMIT = 5000;

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or disabled (private mode); the in-memory state still works for this session.
  }
}

function isRepo(value: unknown): value is Repo {
  const repo = value as Partial<Repo> | null;
  return typeof repo?.id === 'number' && typeof repo.fullName === 'string' && typeof repo.url === 'string';
}

interface LegacyRepo {
  id: number;
  name: string;
  username: string;
  description?: string;
  starsCount?: number;
  forksCount?: number;
  language?: string;
  profile?: string;
  url: string;
}

function fromLegacy(item: unknown): Repo | null {
  const legacy = item as Partial<LegacyRepo> | null;
  if (typeof legacy?.id !== 'number' || typeof legacy.name !== 'string' || typeof legacy.username !== 'string') return null;
  if (typeof legacy.url !== 'string') return null;
  return {
    id: legacy.id,
    fullName: `${legacy.username}/${legacy.name}`,
    owner: legacy.username,
    name: legacy.name,
    avatarUrl: legacy.profile ?? `https://github.com/${legacy.username}.png`,
    url: legacy.url,
    description: legacy.description ?? null,
    language: legacy.language && legacy.language !== 'Code' ? legacy.language : null,
    topics: [],
    stars: legacy.starsCount ?? 0,
    forks: legacy.forksCount ?? 0,
    createdAt: null,
  };
}

export function loadSaved(): Repo[] {
  const stored = readJson(SAVED_KEY);
  if (Array.isArray(stored)) return stored.filter(isRepo);

  const legacy = readJson(LEGACY_SAVED_KEY);
  if (!Array.isArray(legacy)) return [];
  const migrated = legacy.map(fromLegacy).filter((repo): repo is Repo => repo !== null);
  writeJson(SAVED_KEY, migrated);
  return migrated;
}

export function storeSaved(repos: Repo[]): void {
  writeJson(SAVED_KEY, repos);
}

export function loadSeen(): number[] {
  const stored = readJson(SEEN_KEY);
  return Array.isArray(stored) ? stored.filter((id): id is number => typeof id === 'number') : [];
}

export function storeSeen(ids: number[]): void {
  writeJson(SEEN_KEY, ids.slice(-SEEN_LIMIT));
}

import { describe, expect, it } from 'vitest';
import { loadSaved, loadSeen, SEEN_LIMIT, storeSaved, storeSeen } from './storage';
import type { Repo } from './types';

const repo: Repo = {
  id: 1,
  fullName: 'o/r',
  owner: 'o',
  name: 'r',
  avatarUrl: 'https://a.example/o',
  url: 'https://github.com/o/r',
  description: null,
  language: 'Go',
  topics: [],
  stars: 5,
  forks: 1,
  createdAt: '2026-10-01T00:00:00Z',
};

describe('saved repos', () => {
  it('round-trips through localStorage', () => {
    storeSaved([repo]);
    expect(loadSaved()).toEqual([repo]);
  });

  it('starts empty and ignores corrupt data', () => {
    expect(loadSaved()).toEqual([]);
    localStorage.setItem('gtok:saved', '{not json');
    expect(loadSaved()).toEqual([]);
    localStorage.setItem('gtok:saved', JSON.stringify([repo, { id: 'bad' }, null]));
    expect(loadSaved()).toEqual([repo]);
  });

  it('migrates repos saved by the previous version', () => {
    localStorage.setItem(
      'gtok_saved_repos',
      JSON.stringify([
        {
          id: 7,
          name: 'react',
          username: 'facebook',
          description: 'UI library',
          stars: '228k',
          starsCount: 228000,
          forks: '46k',
          forksCount: 46000,
          language: 'Code',
          profile: 'https://a.example/fb',
          url: 'https://github.com/facebook/react',
        },
        { broken: true },
      ]),
    );

    const migrated = loadSaved();
    expect(migrated).toEqual([
      {
        id: 7,
        fullName: 'facebook/react',
        owner: 'facebook',
        name: 'react',
        avatarUrl: 'https://a.example/fb',
        url: 'https://github.com/facebook/react',
        description: 'UI library',
        language: null,
        topics: [],
        stars: 228000,
        forks: 46000,
        createdAt: null,
      },
    ]);
    expect(JSON.parse(localStorage.getItem('gtok:saved') ?? '[]')).toEqual(migrated);
  });
});

describe('seen repos', () => {
  it('round-trips ids and drops invalid entries', () => {
    storeSeen([1, 2]);
    expect(loadSeen()).toEqual([1, 2]);
    localStorage.setItem('gtok:seen', JSON.stringify([1, 'x', 3]));
    expect(loadSeen()).toEqual([1, 3]);
  });

  it('keeps only the most recent ids', () => {
    storeSeen(Array.from({ length: SEEN_LIMIT + 10 }, (_, i) => i));
    const seen = loadSeen();
    expect(seen).toHaveLength(SEEN_LIMIT);
    expect(seen[0]).toBe(10);
  });
});

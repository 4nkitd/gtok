import fallbackRepos, { formatNumber, formatRepo } from './data';

describe('Data utilities', () => {
  test('fallbackRepos contains valid repositories', () => {
    expect(Array.isArray(fallbackRepos)).toBe(true);
    expect(fallbackRepos.length).toBeGreaterThan(0);
    fallbackRepos.forEach((repo) => {
      expect(repo).toHaveProperty('name');
      expect(repo).toHaveProperty('username');
      expect(repo).toHaveProperty('stars');
      expect(repo).toHaveProperty('url');
    });
  });

  test('formatNumber formats numbers correctly', () => {
    expect(formatNumber(500)).toBe('500');
    expect(formatNumber(1500)).toBe('1.5k');
    expect(formatNumber(2500000)).toBe('2.5m');
    expect(formatNumber(0)).toBe('0');
  });

  test('formatRepo formats GitHub API object accurately', () => {
    const mockItem = {
      id: 999,
      name: 'awesome-project',
      owner: {
        login: 'testuser',
        avatar_url: 'https://example.com/avatar.png'
      },
      description: 'An awesome test repository',
      stargazers_count: 3400,
      forks_count: 120,
      language: 'JavaScript',
      html_url: 'https://github.com/testuser/awesome-project'
    };

    const formatted = formatRepo(mockItem);
    expect(formatted.id).toBe(999);
    expect(formatted.name).toBe('awesome-project');
    expect(formatted.username).toBe('testuser');
    expect(formatted.stars).toBe('3.4k');
    expect(formatted.forks).toBe('120');
    expect(formatted.language).toBe('JavaScript');
    expect(formatted.profile).toBe('https://example.com/avatar.png');
    expect(formatted.url).toBe('https://github.com/testuser/awesome-project');
  });
});

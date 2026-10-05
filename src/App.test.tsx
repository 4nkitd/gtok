import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { clearReadmeCache } from './lib/readme';

const searchItem = {
  id: 42,
  name: 'rocket',
  full_name: 'acme/rocket',
  html_url: 'https://github.com/acme/rocket',
  description: 'Launches things',
  language: 'Rust',
  topics: ['cli'],
  stargazers_count: 6012,
  forks_count: 12,
  created_at: new Date(Date.now() - 4 * 86_400_000).toISOString(),
  owner: { login: 'acme', avatar_url: 'https://avatars.example/acme?v=4' },
};

function mockGitHub() {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.startsWith('https://api.github.com/search/repositories')) {
      return Response.json({ total_count: 1, items: [searchItem] });
    }
    if (url.endsWith('/README.md')) return new Response('# Rocket\n\nFast launches.');
    return new Response('', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  history.replaceState(null, '', '/');
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearReadmeCache();
});

describe('App', () => {
  it('shows a rising repo with its growth and README preview', async () => {
    mockGitHub();
    render(<App />);

    const card = await screen.findByRole('article', { name: 'acme/rocket' });
    expect(within(card).getByRole('heading', { name: 'rocket' })).toBeInTheDocument();
    expect(card).toHaveTextContent('6,012 stars in 4 days');
    expect(await within(card).findByRole('button', { name: 'Read the README' })).toBeInTheDocument();
    expect(screen.getByText('You’re all caught up')).toBeInTheDocument();
  });

  it('saves with the button and the S key, and persists the choice', async () => {
    mockGitHub();
    const user = userEvent.setup();
    render(<App />);
    const save = await screen.findByRole('button', { name: 'Save' });

    await user.click(save);
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem('gtok:saved') ?? '[]')).toHaveLength(1);

    await user.keyboard('s');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-pressed', 'false');
    expect(JSON.parse(localStorage.getItem('gtok:saved') ?? '[]')).toHaveLength(0);
  });

  it('opens the full README in a sheet', async () => {
    mockGitHub();
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Read the README' }));
    const sheet = screen.getByRole('dialog', { name: 'rocket' });
    expect(within(sheet).getByText('Fast launches.')).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: 'Close README' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('applies filters from the URL and writes changes back', async () => {
    history.replaceState(null, '', '/?since=day&lang=Go');
    const fetchMock = mockGitHub();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('article', { name: 'acme/rocket' });
    const firstQuery = new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('q');
    expect(firstQuery).toContain('language:"Go"');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'Rust');
    expect(location.search).toBe('?since=day&lang=Rust');
    await waitFor(() => {
      const queries = fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('q') ?? '');
      expect(queries.some((q) => q.includes('language:"Rust"'))).toBe(true);
    });
  });

  it('explains a rate limit and offers a retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })),
    );
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub is limiting searches from your network');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

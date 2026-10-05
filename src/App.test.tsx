import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { clearReadmeCache } from './lib/readme';

const searchItem = {
  id: 42,
  name: 'rocket',
  fullName: 'acme/rocket',
  url: 'https://github.com/acme/rocket',
  description: 'Launches things',
  language: 'Rust',
  topics: ['cli'],
  stars: 6012,
  forks: 12,
  createdAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
  owner: 'acme',
  avatarUrl: 'https://avatars.example/acme?v=4',
};

const secondItem = { ...searchItem, id: 43, name: 'comet', fullName: 'acme/comet', url: 'https://github.com/acme/comet' };

function mockGitHub(items = [searchItem]) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.includes('/api/repos')) {
      return Response.json({ repos: items, hasMore: false, stale: false, cachedAt: new Date().toISOString() });
    }
    if (url.includes('/api/readme')) return Response.json({ markdown: '# Rocket\n\nFast launches.' });
    if (url === '/api/opens') return new Response(null, { status: 204 });
    return new Response('', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

class FakeIntersectionObserver {
  static latest: FakeIntersectionObserver | null = null;
  readonly callback: IntersectionObserverCallback;
  elements: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.latest = this;
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  disconnect() {
    this.elements = [];
  }
}

function scrollSlideIntoView(index: number) {
  const observer = FakeIntersectionObserver.latest;
  const target = observer?.elements.find((element) => (element as HTMLElement).dataset.index === String(index));
  if (!observer || !target) throw new Error(`Slide ${index} is not observed`);
  act(() => observer.callback([{ isIntersecting: true, target } as unknown as IntersectionObserverEntry], observer as never));
}

const scrolledTo: string[] = [];

beforeEach(() => {
  history.replaceState(null, '', '/');
  scrolledTo.length = 0;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolledTo.push((this as HTMLElement).dataset.index ?? '');
  };
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
    const firstQuery = new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('language');
    expect(firstQuery).toBe('Go');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'Rust');
    expect(location.search).toBe('?since=day&lang=Rust');
    await waitFor(() => {
      const queries = fetchMock.mock.calls.map(([url]) => new URL(String(url), location.origin).searchParams.get('language'));
      expect(queries).toContain('Rust');
    });
  });

  it('explains a rate limit and offers a retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response('{}', { status: 429, headers: { 'Retry-After': '60' } })),
    );
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Search is temporarily limited');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('marks repos seen as they scroll into view and moves with J and K', async () => {
    mockGitHub([searchItem, secondItem]);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('article', { name: 'acme/comet' });

    scrollSlideIntoView(0);
    expect(JSON.parse(localStorage.getItem('gtok:seen') ?? '[]')).toEqual([42]);

    await user.keyboard('j');
    expect(scrolledTo).toEqual(['1']);
    scrollSlideIntoView(1);
    expect(JSON.parse(localStorage.getItem('gtok:seen') ?? '[]')).toEqual([42, 43]);

    await user.keyboard('k');
    expect(scrolledTo).toEqual(['1', '0']);
  });

  it('ignores feed shortcuts while the README sheet is open', async () => {
    mockGitHub();
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Read the README' }));
    await user.keyboard('s');
    expect(localStorage.getItem('gtok:saved')).toBe('[]');
  });

  it('releases focus from a filter after choosing so arrow keys move the feed', async () => {
    mockGitHub();
    const user = userEvent.setup();
    render(<App />);
    const language = screen.getByRole('combobox', { name: 'Language' });

    await user.selectOptions(language, 'Go');
    expect(language).not.toHaveFocus();
  });

  it('falls back to this week for unknown URL values', async () => {
    history.replaceState(null, '', '/?since=toString&lang=Klingon');
    const fetchMock = mockGitHub();
    render(<App />);

    await screen.findByRole('article', { name: 'acme/rocket' });
    expect(screen.getByRole('combobox', { name: 'Created' })).toHaveValue('week');
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('');
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('window')).toBe('week');
  });

  it('counts the O shortcut, but not previews or saves', async () => {
    const fetchMock = mockGitHub();
    const user = userEvent.setup();
    const openMock = vi.fn();
    vi.stubGlobal('open', openMock);
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Read the README' }));
    await user.click(screen.getByRole('button', { name: 'Close README' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const events = () => fetchMock.mock.calls.filter(([url]) => url === '/api/opens');
    expect(events()).toHaveLength(0);
    await user.keyboard('o');
    expect(openMock).toHaveBeenCalledWith(searchItem.url, '_blank', 'noopener,noreferrer');
    expect(events()).toHaveLength(1);
    expect(events()[0]?.[1]).toMatchObject({ body: JSON.stringify({ repo: 'acme/rocket' }), credentials: 'omit', keepalive: true });
  });
});

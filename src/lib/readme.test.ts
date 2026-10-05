import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearReadmeCache, loadReadme, renderReadme } from './readme';

function parse(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearReadmeCache();
});

describe('renderReadme', () => {
  it('renders GitHub-flavoured Markdown', () => {
    const html = parse(renderReadme('# Title\n\n| a |\n|---|\n| 1 |', 'o/r'));
    expect(html.querySelector('h1')?.textContent).toBe('Title');
    expect(html.querySelector('table')).not.toBeNull();
  });

  it('strips scripts, event handlers, inline styles and form controls', () => {
    const html = parse(
      renderReadme(
        '<script>alert(1)</script><img src="x.png" onerror="alert(1)"><p style="color:red">hi</p><input><a href="javascript:alert(1)">x</a>',
        'o/r',
      ),
    );
    expect(html.querySelector('script, input')).toBeNull();
    expect(html.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(html.querySelector('p')?.hasAttribute('style')).toBe(false);
    expect(html.querySelector('a')?.getAttribute('href') ?? '').not.toMatch(/^javascript:/);
  });

  it('points relative images at raw files and lazy-loads them', () => {
    const html = parse(renderReadme('![a](docs/a.png)\n\n<img src="/b.svg">\n\n![c](https://cdn.example/c.png)', 'o/r'));
    const sources = [...html.querySelectorAll('img')].map((img) => img.getAttribute('src'));
    expect(sources).toEqual([
      'https://raw.githubusercontent.com/o/r/HEAD/docs/a.png',
      'https://raw.githubusercontent.com/o/r/HEAD/b.svg',
      'https://cdn.example/c.png',
    ]);
    expect(html.querySelector('img')?.getAttribute('loading')).toBe('lazy');
  });

  it('resolves picture srcset candidates', () => {
    const html = parse(renderReadme('<picture><source srcset="dark.png 1x, https://x.example/l.png 2x"><img src="l.png"></picture>', 'o/r'));
    expect(html.querySelector('source')?.getAttribute('srcset')).toBe(
      'https://raw.githubusercontent.com/o/r/HEAD/dark.png 1x, https://x.example/l.png 2x',
    );
  });

  it('opens links on GitHub in a new tab', () => {
    const html = parse(renderReadme('[docs](docs/guide.md) [top](#install) [site](https://example.com)', 'o/r'));
    const links = [...html.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://github.com/o/r/blob/HEAD/docs/guide.md',
      'https://github.com/o/r#install',
      'https://example.com/',
    ]);
    expect(links.every((a) => a.getAttribute('target') === '_blank' && a.getAttribute('rel') === 'noopener noreferrer')).toBe(true);
  });
});

describe('loadReadme', () => {
  it('falls back through README name variants', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('# lower'));
    vi.stubGlobal('fetch', fetchMock);

    expect(parse((await loadReadme('o/r')) ?? '').textContent).toContain('lower');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://raw.githubusercontent.com/o/r/HEAD/README.md',
      'https://raw.githubusercontent.com/o/r/HEAD/readme.md',
    ]);
  });

  it('returns null when no README exists', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async () => new Response('', { status: 404 })));
    expect(await loadReadme('o/none')).toBeNull();
  });

  it('caches successful loads', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => new Response('# hi'));
    vi.stubGlobal('fetch', fetchMock);
    await loadReadme('o/r');
    await loadReadme('o/r');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries after a failure instead of caching it', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(new Response('# ok'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadReadme('o/r')).rejects.toThrow('500');
    expect(await loadReadme('o/r')).toContain('ok');
  });
});

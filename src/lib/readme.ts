import DOMPurify from 'dompurify';
import { marked } from 'marked';

const README_NAMES = ['README.md', 'readme.md', 'Readme.md'];
const cache = new Map<string, Promise<string | null>>();

function resolveUrl(value: string, base: string, fullName: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) return `https://github.com/${fullName}${trimmed}`;
  const relative = trimmed.startsWith('/') && !trimmed.startsWith('//') ? trimmed.slice(1) : trimmed;
  try {
    return new URL(relative, base).href;
  } catch {
    return '';
  }
}

export function renderReadme(markdown: string, fullName: string): string {
  const rawBase = `https://raw.githubusercontent.com/${fullName}/HEAD/`;
  const blobBase = `https://github.com/${fullName}/blob/HEAD/`;
  const html = marked.parse(markdown, { async: false, gfm: true });
  const fragment = DOMPurify.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['style'],
  });

  fragment.querySelectorAll('img').forEach((img) => {
    img.setAttribute('src', resolveUrl(img.getAttribute('src') ?? '', rawBase, fullName));
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  });
  fragment.querySelectorAll('source[srcset]').forEach((source) => {
    const srcset = (source.getAttribute('srcset') ?? '')
      .split(',')
      .map((candidate) => {
        const [url = '', ...descriptor] = candidate.trim().split(/\s+/);
        return [resolveUrl(url, rawBase, fullName), ...descriptor].join(' ');
      })
      .join(', ');
    source.setAttribute('srcset', srcset);
  });
  fragment.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('href', resolveUrl(link.getAttribute('href') ?? '', blobBase, fullName));
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });

  const container = document.createElement('div');
  container.append(fragment);
  return container.innerHTML;
}

async function fetchReadme(fullName: string): Promise<string | null> {
  for (const name of README_NAMES) {
    const res = await fetch(`https://raw.githubusercontent.com/${fullName}/HEAD/${name}`);
    if (res.ok) return renderReadme(await res.text(), fullName);
    if (res.status !== 404) throw new Error(`README request failed with ${res.status}`);
  }
  return null;
}

export function loadReadme(fullName: string): Promise<string | null> {
  const cached = cache.get(fullName);
  if (cached) return cached;
  const pending = fetchReadme(fullName).catch((error: unknown) => {
    cache.delete(fullName);
    throw error;
  });
  cache.set(fullName, pending);
  return pending;
}

export function clearReadmeCache(): void {
  cache.clear();
}

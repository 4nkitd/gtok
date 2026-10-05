import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFeed } from '../hooks/useFeed';
import { RateLimitError } from '../lib/github';
import { recordOpen } from '../lib/opens';
import type { Repo, TimeWindow } from '../lib/types';
import RepoCard from './RepoCard';

const PRELOAD_DISTANCE = 4;
const WINDOW_PHRASES: Record<TimeWindow, string> = { day: 'today', week: 'this week', month: 'this month' };
const WIDER_WINDOW: Partial<Record<TimeWindow, TimeWindow>> = { day: 'week', week: 'month' };

interface FeedProps {
  window: TimeWindow;
  language: string;
  seenIds: ReadonlySet<number>;
  savedIds: ReadonlySet<number>;
  paused: boolean;
  onToggleSave: (repo: Repo) => void;
  onShare: (repo: Repo) => void;
  onReadMore: (repo: Repo) => void;
  onSeen: (id: number) => void;
  onWindowChange: (window: TimeWindow) => void;
}

function describeError(error: Error): { title: string; detail: string } {
  if (error instanceof RateLimitError) {
    const time = error.resetAt?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return {
      title: 'Search is temporarily limited',
      detail: time ? `Try again after ${time}.` : 'Wait a minute, then try again.',
    };
  }
  if (!navigator.onLine || error instanceof TypeError) {
    return { title: 'You’re offline', detail: 'Connect to the internet, then try again.' };
  }
  return { title: 'GitHub search failed', detail: `${error.message}. Try again in a moment.` };
}

function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function Feed(props: FeedProps) {
  const { window, language, savedIds, paused, onToggleSave, onShare, onReadMore, onSeen, onWindowChange } = props;
  const [hidden] = useState(() => new Set(props.seenIds));
  const [now] = useState(() => new Date());
  const { repos, loading, hasMore, stalled, stale, error, loadMore } = useFeed(window, language, hidden, now);
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          setActive(index);
          const repo = repos[index];
          if (repo) onSeen(repo.id);
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll('[data-index]').forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [repos, onSeen]);

  useEffect(() => {
    if (hasMore && !loading && !stalled && !error && repos.length > 0 && active >= repos.length - PRELOAD_DISTANCE) void loadMore();
  }, [active, repos.length, hasMore, loading, stalled, error, loadMore]);

  const goTo = useCallback((index: number) => {
    const slide = scrollerRef.current?.querySelector(`[data-index="${index}"]`);
    slide?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (paused || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as Element | null)?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
      const repo = repos[active];
      const last = repos.length;
      switch (event.key) {
        case 'j':
        case 'ArrowDown':
          goTo(Math.min(active + 1, last));
          break;
        case 'k':
        case 'ArrowUp':
          goTo(Math.max(active - 1, 0));
          break;
        case 's':
          if (repo) onToggleSave(repo);
          break;
        case 'o':
          if (repo && !event.repeat) {
            recordOpen(repo.fullName);
            globalThis.open(repo.url, '_blank', 'noopener,noreferrer');
          }
          break;
        case 'r':
          if (repo) onReadMore(repo);
          break;
        default:
          return;
      }
      event.preventDefault();
    }
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [active, repos, paused, goTo, onToggleSave, onReadMore]);

  const scope = `${language ? `${language} ` : ''}repositories created ${WINDOW_PHRASES[window]}`;
  const wider = WIDER_WINDOW[window];

  let tail: ReactNode = null;
  if (error) {
    const { title, detail } = describeError(error);
    tail = (
      <div className="message" role="alert">
        <h2>{title}</h2>
        <p>{detail}</p>
        <button type="button" className="primary-button" onClick={() => void loadMore()}>
          Try again
        </button>
      </div>
    );
  } else if (loading) {
    tail = (
      <div className="message" aria-busy="true">
        <div className="spinner" />
        <p>{repos.length === 0 ? `Finding ${scope}` : 'Loading more'}</p>
      </div>
    );
  } else if (stalled) {
    tail = (
      <div className="message">
        <h2>{repos.length === 0 ? 'You’ve seen the top of this list' : 'Only repositories you’ve seen so far'}</h2>
        <p>The next ones are further down GitHub’s results.</p>
        <button type="button" className="primary-button" onClick={() => void loadMore()}>
          Keep looking
        </button>
      </div>
    );
  } else if (!hasMore) {
    tail = (
      <div className="message">
        <h2>{repos.length === 0 ? `No new ${scope}` : 'You’re all caught up'}</h2>
        <p>
          {repos.length === 0
            ? 'Nothing new you haven’t already seen.'
            : `That’s every ${scope} you haven’t seen yet.`}
        </p>
        {wider && (
          <button type="button" className="primary-button" onClick={() => onWindowChange(wider)}>
            Show {WINDOW_PHRASES[wider]}
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="feed" data-stale={stale} ref={scrollerRef} aria-label={`Rising ${scope}`}>
      {stale && <p className="cache-notice" role="status">Showing older cached results. Reload to check for updates.</p>}
      {repos.map((repo, index) => (
        <RepoCard
          key={repo.id}
          repo={repo}
          index={index}
          now={now}
          nearby={Math.abs(index - active) <= 1}
          saved={savedIds.has(repo.id)}
          onToggleSave={onToggleSave}
          onShare={onShare}
          onReadMore={onReadMore}
        />
      ))}
      {tail && (
        <section className="slide slide-message" data-index={repos.length}>
          {tail}
        </section>
      )}
    </main>
  );
}

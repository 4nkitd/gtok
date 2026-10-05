import { useCallback, useEffect, useRef, useState } from 'react';
import Feed from './components/Feed';
import ReadmeSheet from './components/ReadmeSheet';
import TopBar, { WINDOW_LABELS } from './components/TopBar';
import { useLibrary } from './hooks/useLibrary';
import { LANGUAGES } from './lib/languages';
import type { Repo, TimeWindow } from './lib/types';

const TOAST_MS = 2400;

interface Filters {
  window: TimeWindow;
  language: string;
}

function readFilters(): Filters {
  const params = new URLSearchParams(location.search);
  const since = params.get('since');
  const lang = params.get('lang') ?? '';
  return {
    window: since && Object.hasOwn(WINDOW_LABELS, since) ? (since as TimeWindow) : 'week',
    language: LANGUAGES.includes(lang) ? lang : '',
  };
}

export default function App() {
  const [filters, setFilters] = useState(readFilters);
  const [sheetRepo, setSheetRepo] = useState<Repo | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const { savedIds, seenIds, toggleSaved, markSeen } = useLibrary();

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.window !== 'week') params.set('since', filters.window);
    if (filters.language) params.set('lang', filters.language);
    const query = params.toString();
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
  }, [filters]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), TOAST_MS);
  }, []);

  const share = useCallback(
    async (repo: Repo) => {
      const data = { title: repo.fullName, text: repo.description ?? repo.fullName, url: repo.url };
      if (navigator.share) {
        try {
          await navigator.share(data);
          return;
        } catch (error) {
          if ((error as DOMException).name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(repo.url);
        showToast('Link copied');
      } catch {
        showToast('Couldn’t copy the link');
      }
    },
    [showToast],
  );

  const setWindow = useCallback((window: TimeWindow) => setFilters((current) => ({ ...current, window })), []);
  const setLanguage = useCallback((language: string) => setFilters((current) => ({ ...current, language })), []);
  const closeSheet = useCallback(() => setSheetRepo(null), []);

  return (
    <div className="app">
      <TopBar window={filters.window} language={filters.language} onWindowChange={setWindow} onLanguageChange={setLanguage} />
      <Feed
        key={`${filters.window}:${filters.language}`}
        window={filters.window}
        language={filters.language}
        seenIds={seenIds}
        savedIds={savedIds}
        paused={sheetRepo !== null}
        onToggleSave={toggleSaved}
        onShare={share}
        onReadMore={setSheetRepo}
        onSeen={markSeen}
        onWindowChange={setWindow}
      />
      <ReadmeSheet repo={sheetRepo} onClose={closeSheet} />
      <a className="privacy-link" href="/privacy" target="_blank" rel="noopener noreferrer">About & privacy</a>
      <p className="keyboard-hint" aria-hidden="true">
        <span>
          <kbd>J</kbd>
          <kbd>K</kbd> move
        </span>
        <span>
          <kbd>S</kbd> save
        </span>
        <span>
          <kbd>O</kbd> open
        </span>
        <span>
          <kbd>R</kbd> read
        </span>
      </p>
      <div className="toast" role="status" aria-live="polite" data-visible={toast !== ''}>
        {toast}
      </div>
    </div>
  );
}

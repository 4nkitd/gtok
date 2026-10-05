import { useEffect, useState } from 'react';
import { formatCount } from './lib/format';
import { searchRising } from './lib/github';
import { loadReadme } from './lib/readme';
import type { Repo } from './lib/types';

// Milestone 1 placeholder: proves the live data path. Replaced by the vertical feed in milestone 2.
export default function App() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [readme, setReadme] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    searchRising({ window: 'week', language: '', page: 1, signal: controller.signal })
      .then(async ({ repos: page }) => {
        setRepos(page);
        if (page[0]) setReadme(await loadReadme(page[0].fullName));
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : String(err));
      });
    return () => controller.abort();
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>G.tok</h1>
      {error && <p role="alert">{error}</p>}
      <ol>
        {repos.map((repo) => (
          <li key={repo.id}>
            <a href={repo.url}>{repo.fullName}</a> · {formatCount(repo.stars)} stars · {repo.language ?? 'n/a'}
          </li>
        ))}
      </ol>
      {readme && <article dangerouslySetInnerHTML={{ __html: readme }} />}
    </main>
  );
}

import { useEffect, useRef } from 'react';
import { useReadme } from '../hooks/useReadme';
import type { Repo } from '../lib/types';
import { recordOpen } from '../lib/opens';
import { CloseIcon } from './Icons';

interface ReadmeSheetProps {
  repo: Repo | null;
  onClose: () => void;
}

function SheetBody({ repo }: { repo: Repo }) {
  const { state, retry } = useReadme(repo.fullName, true);
  if (state.status === 'ready') return <div className="markdown" dangerouslySetInnerHTML={{ __html: state.html }} />;
  if (state.status === 'missing') return <p className="readme-note">This repository has no README.</p>;
  if (state.status === 'error') {
    return (
      <p className="readme-note">
        The README didn’t load.{' '}
        <button type="button" className="text-button" onClick={retry}>
          Try again
        </button>
      </p>
    );
  }
  return <p className="readme-note">Loading README…</p>;
}

export default function ReadmeSheet({ repo, onClose }: ReadmeSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (repo && !dialog.open) dialog.showModal();
    if (!repo && dialog.open) dialog.close();
  }, [repo]);

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {repo && (
        <div className="sheet-panel">
          <header className="sheet-head">
            <div className="sheet-title-group">
              <h2 id="sheet-title" className="sheet-title">
                {repo.name}
              </h2>
              <span className="sheet-subtitle">{repo.owner}</span>
            </div>
            <a className="pill-link" href={repo.url} target="_blank" rel="noopener noreferrer"
              onClick={() => recordOpen(repo.fullName)} onAuxClick={(event) => { if (event.button === 1) recordOpen(repo.fullName); }}>
              Open on GitHub
            </a>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close README">
              <CloseIcon />
            </button>
          </header>
          <div className="sheet-body">
            <SheetBody repo={repo} />
          </div>
        </div>
      )}
    </dialog>
  );
}

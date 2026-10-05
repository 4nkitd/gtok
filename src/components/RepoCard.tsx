import { memo } from 'react';
import { useReadme } from '../hooks/useReadme';
import { describeAge, formatCount, formatStars } from '../lib/format';
import type { Repo } from '../lib/types';
import { BookmarkIcon, OpenIcon, ShareIcon } from './Icons';

interface RepoCardProps {
  repo: Repo;
  index: number;
  now: Date;
  nearby: boolean;
  saved: boolean;
  onToggleSave: (repo: Repo) => void;
  onShare: (repo: Repo) => void;
  onReadMore: (repo: Repo) => void;
}

function ReadmePreview({ repo, enabled, onReadMore }: { repo: Repo; enabled: boolean; onReadMore: (repo: Repo) => void }) {
  const { state, retry } = useReadme(repo.fullName, enabled);

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

  return (
    <div className="readme-preview" onClick={state.status === 'ready' ? () => onReadMore(repo) : undefined}>
      {state.status === 'ready' ? (
        <div className="readme-preview-body markdown" dangerouslySetInnerHTML={{ __html: state.html }} />
      ) : (
        <div className="readme-skeleton" aria-label="Loading README">
          <span />
          <span />
          <span />
        </div>
      )}
      {state.status === 'ready' && (
        <button type="button" className="readme-open" onClick={() => onReadMore(repo)}>
          Read the README
        </button>
      )}
    </div>
  );
}

function RepoCard({ repo, index, now, nearby, saved, onToggleSave, onShare, onReadMore }: RepoCardProps) {
  return (
    <article className="slide" data-index={index} aria-label={repo.fullName}>
      <div className="slide-content">
        <header className="repo-head">
          <a className="repo-owner" href={`https://github.com/${repo.owner}`} target="_blank" rel="noopener noreferrer">
            <img
              src={`${repo.avatarUrl}${repo.avatarUrl.includes('?') ? '&' : '?'}s=64`}
              alt=""
              width="28"
              height="28"
              loading={nearby ? 'eager' : 'lazy'}
            />
            {repo.owner}
          </a>
          <h2 className="repo-name">
            <a href={repo.url} target="_blank" rel="noopener noreferrer">
              {repo.name}
            </a>
          </h2>
          <p className="repo-velocity">
            <strong>{formatStars(repo.stars)}</strong>
            {repo.createdAt && ` ${describeAge(repo.createdAt, now)}`}
          </p>
        </header>

        {repo.description && <p className="repo-description">{repo.description}</p>}

        <ul className="repo-facts" aria-label="Details">
          {repo.language && <li>{repo.language}</li>}
          <li>
            {formatCount(repo.forks)} {repo.forks === 1 ? 'fork' : 'forks'}
          </li>
          {repo.topics.slice(0, 4).map((topic) => (
            <li key={topic} className="topic">
              {topic}
            </li>
          ))}
        </ul>

        <ReadmePreview repo={repo} enabled={nearby} onReadMore={onReadMore} />
      </div>

      <div className="actions" aria-label="Actions">
        <button
          type="button"
          className="action"
          aria-pressed={saved}
          onClick={() => onToggleSave(repo)}
          title="Save (S)"
        >
          <span className="action-icon">
            <BookmarkIcon filled={saved} />
          </span>
          {saved ? 'Saved' : 'Save'}
        </button>
        <a className="action" href={repo.url} target="_blank" rel="noopener noreferrer" title="Open on GitHub (O)">
          <span className="action-icon">
            <OpenIcon />
          </span>
          Open
        </a>
        <button type="button" className="action" onClick={() => onShare(repo)}>
          <span className="action-icon">
            <ShareIcon />
          </span>
          Share
        </button>
      </div>
    </article>
  );
}

export default memo(RepoCard);

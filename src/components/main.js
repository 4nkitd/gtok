import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Header from './header';
import Footer from './footer';
import SavedModal from './savedModal';
import TinderCard from 'react-tinder-card';
import fallbackRepos, { formatRepo } from './data';

function Main() {
  const [repos, setRepos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [savedRepos, setSavedRepos] = useState(() => {
    try {
      const stored = localStorage.getItem('gtok_saved_repos');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Persist savedRepos to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gtok_saved_repos', JSON.stringify(savedRepos));
    } catch (e) {
      console.error('Failed to save repos to localStorage', e);
    }
  }, [savedRepos]);

  // Fetch repositories from GitHub API
  const fetchRepos = useCallback(async (language = '') => {
    setLoading(true);
    setError(null);
    try {
      let query = 'stars:>1000';
      if (language) {
        query += `+language:${language}`;
      }
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=30`
      );

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const formatted = data.items.map(formatRepo);
        setRepos(formatted);
        setCurrentIndex(formatted.length - 1);
      } else {
        throw new Error('No repositories found');
      }
    } catch (err) {
      console.warn('Using fallback repository data due to fetch error:', err.message);
      let filteredFallback = fallbackRepos;
      if (language) {
        filteredFallback = fallbackRepos.filter(
          (r) => r.language.toLowerCase() === language.toLowerCase()
        );
        if (filteredFallback.length === 0) filteredFallback = fallbackRepos;
      }
      setRepos(filteredFallback);
      setCurrentIndex(filteredFallback.length - 1);
      setError('Live API unavailable. Showing curated popular repos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos(selectedLanguage);
  }, [selectedLanguage, fetchRepos]);

  const childRefs = useMemo(
    () =>
      Array(repos.length)
        .fill(0)
        .map(() => React.createRef()),
    [repos.length]
  );

  const updateCurrentIndex = (val) => {
    setCurrentIndex(val);
    currentIndexRef.current = val;
  };

  const handleSwiped = (direction, repo, index) => {
    if (direction === 'right' || direction === 'up') {
      setSavedRepos((prev) => {
        if (prev.some((item) => item.id === repo.id)) return prev;
        return [repo, ...prev];
      });
    }
    updateCurrentIndex(index - 1);
  };

  const swipe = async (dir) => {
    if (currentIndex >= 0 && currentIndex < repos.length) {
      const cardRef = childRefs[currentIndex];
      if (cardRef && cardRef.current) {
        await cardRef.current.swipe(dir);
      }
    }
  };

  const removeSavedRepo = (id) => {
    setSavedRepos((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="bg-theme">
      <Header
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        savedCount={savedRepos.length}
        onOpenSaved={() => setIsSavedModalOpen(true)}
      />

      <main className="container flex-grow-1 d-flex flex-column justify-content-center align-items-center py-3">
        {loading ? (
          <div className="text-center py-5 text-white">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="h5">Fetching trending repositories...</p>
          </div>
        ) : currentIndex >= 0 && repos.length > 0 ? (
          <>
            {error && (
              <div
                className="alert alert-warning py-1 px-3 mb-2 small text-center"
                role="alert"
                style={{ borderRadius: '20px', opacity: 0.9 }}
              >
                {error}
              </div>
            )}

            <div className="card-container">
              {repos.map((repo, index) => (
                <TinderCard
                  ref={childRefs[index]}
                  className="swipe"
                  key={repo.id || index}
                  onSwipe={(dir) => handleSwiped(dir, repo, index)}
                  preventSwipe={['up', 'down']}
                >
                  <div className="repo-card">
                    <img
                      src={repo.profile}
                      alt={repo.username}
                      className="repo-avatar"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
                      }}
                    />

                    <div className="repo-header">
                      <a
                        href={`https://github.com/${repo.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="repo-owner"
                      >
                        @{repo.username}
                      </a>
                      <h2 className="repo-title">
                        <a href={repo.url} target="_blank" rel="noopener noreferrer">
                          {repo.name}
                        </a>
                      </h2>
                    </div>

                    <div className="repo-meta">
                      <span className="repo-lang">{repo.language}</span>
                    </div>

                    <p className="repo-description">{repo.description}</p>

                    <div className="repo-footer-stats">
                      <div className="stat-item">
                        <div className="stat-label">Stars</div>
                        <div className="stat-value">⭐️ {repo.stars}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Forks</div>
                        <div className="stat-value">🍴 {repo.forks}</div>
                      </div>
                    </div>
                  </div>
                </TinderCard>
              ))}
            </div>

            <div className="action-buttons">
              <button
                type="button"
                className="action-btn pass"
                onClick={() => swipe('left')}
                title="Pass (Swipe Left)"
                aria-label="Pass repository"
              >
                ✕
              </button>

              <button
                type="button"
                className="action-btn link"
                onClick={() => {
                  if (repos[currentIndex]) {
                    window.open(repos[currentIndex].url, '_blank', 'noopener,noreferrer');
                  }
                }}
                title="Open on GitHub"
                aria-label="Open repository on GitHub"
              >
                🔗
              </button>

              <button
                type="button"
                className="action-btn star"
                onClick={() => swipe('right')}
                title="Star / Save (Swipe Right)"
                aria-label="Star repository"
              >
                ⭐️
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state text-center text-white">
            <span role="img" aria-label="party" style={{ fontSize: '3rem' }}>
              🎉
            </span>
            <h3 className="mt-3 font-weight-bold">All caught up!</h3>
            <p className="text-muted mt-2">
              You&apos;ve swiped through all loaded repositories in this category.
            </p>
            <div className="mt-4 d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-primary mr-2"
                onClick={() => fetchRepos(selectedLanguage)}
              >
                🔄 Refresh Feed
              </button>
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={() => setIsSavedModalOpen(true)}
              >
                ⭐️ View Saved ({savedRepos.length})
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />

      <SavedModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedRepos={savedRepos}
        onRemoveRepo={removeSavedRepo}
      />
    </div>
  );
}

export default Main;

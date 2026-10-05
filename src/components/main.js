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

  const childRefs = useMemo(
    () =>
      Array(repos.length)
        .fill(0)
        .map(() => React.createRef()),
    [repos.length]
  );

  useEffect(() => {
    try {
      localStorage.setItem('gtok_saved_repos', JSON.stringify(savedRepos));
    } catch (e) {
      console.error('Failed to save repos to localStorage', e);
    }
  }, [savedRepos]);

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
        throw new Error(`GitHub API HTTP ${response.status}`);
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
      console.warn('Using curated fallback data:', err.message);
      let filteredFallback = fallbackRepos;
      if (language) {
        filteredFallback = fallbackRepos.filter(
          (r) => r.language.toLowerCase() === language.toLowerCase()
        );
        if (filteredFallback.length === 0) filteredFallback = fallbackRepos;
      }
      setRepos(filteredFallback);
      setCurrentIndex(filteredFallback.length - 1);
      setError('GitHub API rate limited / offline. Displaying curated top repositories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos(selectedLanguage);
  }, [selectedLanguage, fetchRepos]);

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

  const swipe = useCallback(
    async (dir) => {
      const idx = currentIndexRef.current;
      if (idx >= 0 && idx < childRefs.length) {
        const cardRef = childRefs[idx];
        if (cardRef && cardRef.current) {
          await cardRef.current.swipe(dir);
        }
      }
    },
    [childRefs]
  );

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSavedModalOpen) return;
      if (e.key === 'ArrowLeft') {
        swipe('left');
      } else if (e.key === 'ArrowRight') {
        swipe('right');
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (repos[currentIndexRef.current]) {
          window.open(repos[currentIndexRef.current].url, '_blank', 'noopener,noreferrer');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSavedModalOpen, repos, swipe]);

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

      <main className="main-content">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-purple mb-3" role="status" style={{ color: '#8b5cf6' }}>
              <span className="sr-only">Loading...</span>
            </div>
            <p className="h5 text-muted font-weight-bold">Discovering repositories...</p>
          </div>
        ) : currentIndex >= 0 && repos.length > 0 ? (
          <>
            {error && (
              <div
                className="alert alert-dark py-1 px-3 mb-3 small text-center"
                style={{
                  borderRadius: '20px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24'
                }}
              >
                {error}
              </div>
            )}

            <div className="card-stack">
              {repos.map((repo, index) => (
                <TinderCard
                  ref={childRefs[index]}
                  className="swipe-card"
                  key={repo.id || index}
                  onSwipe={(dir) => handleSwiped(dir, repo, index)}
                  preventSwipe={['up', 'down']}
                >
                  <div className="gtok-card">
                    <div>
                      <div className="card-owner-bar">
                        <img
                          src={repo.profile}
                          alt={repo.username}
                          className="card-avatar"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
                          }}
                        />
                        <div className="card-owner-info">
                          <a
                            href={`https://github.com/${repo.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-owner-handle"
                          >
                            @{repo.username}
                          </a>
                          <h2 className="card-repo-name">
                            <a href={repo.url} target="_blank" rel="noopener noreferrer">
                              {repo.name}
                            </a>
                          </h2>
                        </div>
                      </div>

                      <div className="card-tags">
                        <span className="lang-pill">
                          <span>⚡</span> {repo.language || 'Code'}
                        </span>
                      </div>

                      <p className="card-description">{repo.description}</p>
                    </div>

                    <div className="card-stats-grid">
                      <div className="stat-box">
                        <span className="stat-box-label">Stars</span>
                        <span className="stat-box-value" style={{ color: '#f59e0b' }}>
                          ⭐️ {repo.stars}
                        </span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-box-label">Forks</span>
                        <span className="stat-box-value" style={{ color: '#38bdf8' }}>
                          🍴 {repo.forks}
                        </span>
                      </div>
                    </div>
                  </div>
                </TinderCard>
              ))}
            </div>

            <div className="controls-bar">
              <button
                type="button"
                className="ctrl-btn btn-pass"
                onClick={() => swipe('left')}
                title="Pass (Left Arrow / Swipe Left)"
                aria-label="Pass repository"
              >
                ✕
              </button>

              <button
                type="button"
                className="ctrl-btn btn-open"
                onClick={() => {
                  if (repos[currentIndex]) {
                    window.open(repos[currentIndex].url, '_blank', 'noopener,noreferrer');
                  }
                }}
                title="Open on GitHub (Spacebar)"
                aria-label="Open repository on GitHub"
              >
                🔗
              </button>

              <button
                type="button"
                className="ctrl-btn btn-star"
                onClick={() => swipe('right')}
                title="Star / Save (Right Arrow / Swipe Right)"
                aria-label="Star repository"
              >
                ⭐️
              </button>
            </div>

            <div className="kbd-hints">
              <span>Press <kbd className="kbd-badge">←</kbd> Pass</span>
              <span>•</span>
              <span><kbd className="kbd-badge">Space</kbd> Open</span>
              <span>•</span>
              <span><kbd className="kbd-badge">→</kbd> Star</span>
            </div>
          </>
        ) : (
          <div className="empty-box">
            <div className="empty-icon">🚀</div>
            <h3 className="h4 font-weight-bold text-white mb-2">You&apos;ve seen all repositories!</h3>
            <p className="text-muted small mb-4">
              Switch languages or refresh the feed to discover more trending projects.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <button
                type="button"
                className="btn btn-primary px-4 py-2"
                style={{ background: '#8b5cf6', borderColor: '#8b5cf6', borderRadius: '12px' }}
                onClick={() => fetchRepos(selectedLanguage)}
              >
                🔄 Refresh Feed
              </button>
              <button
                type="button"
                className="btn btn-outline-light px-4 py-2"
                style={{ borderRadius: '12px' }}
                onClick={() => setIsSavedModalOpen(true)}
              >
                ⭐️ Saved ({savedRepos.length})
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

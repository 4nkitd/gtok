import React from 'react';

function Header({ selectedLanguage, onLanguageChange, savedCount, onOpenSaved }) {
  const languages = [
    { label: '🔥 All Languages', value: '' },
    { label: '⚡ JavaScript', value: 'javascript' },
    { label: '🔷 TypeScript', value: 'typescript' },
    { label: '🐍 Python', value: 'python' },
    { label: '🐹 Go', value: 'go' },
    { label: '🦀 Rust', value: 'rust' },
    { label: '⚡ C++', value: 'cpp' },
    { label: '☕ Java', value: 'java' }
  ];

  return (
    <header className="gtok-navbar">
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span className="brand-gradient">G.tok</span>
          <span className="badge badge-primary px-2 py-1 style-badge" style={{ fontSize: '0.65rem', borderRadius: '6px', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
            v2.0
          </span>
        </div>

        <div className="d-flex align-items-center gap-3">
          <select
            className="nav-select"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            aria-label="Filter repositories by language"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value} style={{ background: '#151c2c', color: '#f3f4f6' }}>
                {lang.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn-saved-trigger"
            onClick={onOpenSaved}
            title="View Starred Repositories"
          >
            <span>⭐️ Saved</span>
            <span className="badge-saved-count">{savedCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;

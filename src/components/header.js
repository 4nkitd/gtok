import React from 'react';

function Header({ selectedLanguage, onLanguageChange, savedCount, onOpenSaved }) {
  const languages = [
    { label: 'All Languages', value: '' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Python', value: 'python' },
    { label: 'Go', value: 'go' },
    { label: 'Rust', value: 'rust' },
    { label: 'C++', value: 'cpp' },
    { label: 'Java', value: 'java' }
  ];

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-dark shadow-sm py-2 px-3">
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <a className="navbar-brand d-flex align-items-center font-weight-bold text-white" href="/">
          <span className="mr-2" role="img" aria-label="tree">🌳</span>
          <span style={{ letterSpacing: '0.5px' }}>G.tok</span>
          <span className="badge badge-primary ml-2 style-badge" style={{ fontSize: '0.65rem' }}>PROD</span>
        </a>

        <div className="d-flex align-items-center">
          <div className="mr-2 mr-md-3">
            <select
              className="form-control form-control-sm bg-secondary text-white border-0"
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              aria-label="Filter repositories by language"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-light d-flex align-items-center mr-2"
            onClick={onOpenSaved}
            title="View Starred Repositories"
          >
            <span role="img" aria-label="star" className="mr-1">⭐️</span>
            <span className="d-none d-sm-inline mr-1">Saved</span>
            <span className="badge badge-pill badge-warning">{savedCount}</span>
          </button>

          <a
            className="btn btn-sm btn-outline-secondary text-white"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Header;

import React from 'react';

function Footer() {
  return (
    <footer className="footer bg-dark text-muted py-2 text-center fixed-bottom shadow-lg border-top border-secondary">
      <div className="container">
        <small className="text-light">
          Made with <span role="img" aria-label="atom">⚛️</span> for developers &bull;{' '}
          <a
            className="text-info font-weight-bold"
            href="https://dagar.in"
            target="_blank"
            rel="noopener noreferrer"
          >
            dagar.in
          </a>
        </small>
      </div>
    </footer>
  );
}

export default Footer;

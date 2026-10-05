import React from 'react';

function SavedModal({ isOpen, onClose, savedRepos, onRemoveRepo }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1050 }}
    >
      <div
        className="modal-dialog modal-dialog-scrollable modal-lg"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content bg-dark text-white border-secondary">
          <div className="modal-header border-secondary">
            <h5 className="modal-title font-weight-bold d-flex align-items-center">
              <span role="img" aria-label="star" className="mr-2">⭐️</span>
              Starred Repositories ({savedRepos.length})
            </h5>
            <button
              type="button"
              className="close text-white"
              onClick={onClose}
              aria-label="Close"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {savedRepos.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <p className="h4 mb-2">No starred repositories yet!</p>
                <p className="small">Swipe right on any card or click the ⭐️ button to save repositories here.</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {savedRepos.map((repo) => (
                  <div
                    key={repo.id || repo.name}
                    className="list-group-item bg-dark text-white border-secondary d-flex justify-content-between align-items-center py-3"
                  >
                    <div className="d-flex align-items-center pr-3" style={{ minWidth: 0 }}>
                      <img
                        src={repo.profile}
                        alt={repo.username}
                        className="rounded-circle mr-3"
                        style={{ width: '42px', height: '42px', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <h6 className="mb-0 text-truncate font-weight-bold">
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-info"
                          >
                            {repo.username} / {repo.name}
                          </a>
                        </h6>
                        <small className="text-muted d-block text-truncate">
                          {repo.description}
                        </small>
                        <div className="mt-1 small">
                          <span className="badge badge-secondary mr-2">{repo.language || 'Code'}</span>
                          <span className="text-warning mr-3">⭐️ {repo.stars}</span>
                          <span className="text-muted">🍴 {repo.forks}</span>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center" style={{ flexShrink: 0 }}>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-info mr-2"
                      >
                        Visit
                      </a>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onRemoveRepo(repo.id)}
                        title="Remove"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer border-secondary">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SavedModal;

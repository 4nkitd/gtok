import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Main from './main';

// Mock react-tinder-card to simplify DOM testing
jest.mock('react-tinder-card', () => {
  const React = require('react');
  return React.forwardRef(function DummyTinderCard({ children, className }, ref) {
    return <div ref={ref} data-testid="tinder-card" className={className}>{children}</div>;
  });
});

describe('Main component', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: 1,
                name: 'test-repo',
                owner: { login: 'dev', avatar_url: 'https://example.com/a.png' },
                description: 'Test description',
                stargazers_count: 5000,
                forks_count: 300,
                language: 'TypeScript',
                html_url: 'https://github.com/dev/test-repo'
              }
            ]
          })
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders Header with G.tok title', async () => {
    render(<Main />);
    await waitFor(() => {
      expect(screen.getByText('G.tok')).toBeInTheDocument();
    });
  });

  test('renders repository card from API response', async () => {
    render(<Main />);
    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
      expect(screen.getByText('@dev')).toBeInTheDocument();
    });
  });
});

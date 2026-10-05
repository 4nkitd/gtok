import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SavedModal from './savedModal';

describe('SavedModal component', () => {
  const mockRepos = [
    {
      id: 1,
      name: 'react',
      username: 'facebook',
      description: 'A JavaScript library for building user interfaces',
      stars: '220k',
      forks: '40k',
      language: 'JavaScript',
      profile: 'https://example.com/avatar.png',
      url: 'https://github.com/facebook/react'
    }
  ];

  test('does not render when isOpen is false', () => {
    const { container } = render(
      <SavedModal
        isOpen={false}
        onClose={jest.fn()}
        savedRepos={mockRepos}
        onRemoveRepo={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders starred repos when isOpen is true', () => {
    render(
      <SavedModal
        isOpen={true}
        onClose={jest.fn()}
        savedRepos={mockRepos}
        onRemoveRepo={jest.fn()}
      />
    );

    expect(screen.getByText(/Starred Repositories \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/facebook \/ react/i)).toBeInTheDocument();
  });

  test('calls onRemoveRepo when remove button is clicked', () => {
    const onRemoveMock = jest.fn();
    render(
      <SavedModal
        isOpen={true}
        onClose={jest.fn()}
        savedRepos={mockRepos}
        onRemoveRepo={onRemoveMock}
      />
    );

    const removeBtn = screen.getByTitle('Remove');
    fireEvent.click(removeBtn);
    expect(onRemoveMock).toHaveBeenCalledWith(1);
  });
});

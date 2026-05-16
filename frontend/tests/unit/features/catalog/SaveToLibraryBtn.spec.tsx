import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveToLibraryBtn } from '@/features/catalog/SaveToLibraryBtn';
import { catalogApi } from '@/entities/catalog/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/entities/catalog/api', () => ({
  catalogApi: {
    saveAlias: vi.fn(),
  },
}));

describe('SaveToLibraryBtn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates UI optimistically and calls API when track is not saved', async () => {
    const queryClient = new QueryClient();
    (catalogApi.saveAlias as any).mockResolvedValueOnce();

    render(
      <QueryClientProvider client={queryClient}>
        <SaveToLibraryBtn trackId="test-track-id" isSaved={false} />
      </QueryClientProvider>
    );

    const button = screen.getByText('В библиотеку');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Сохранено')).toBeInTheDocument();
      expect(screen.getByText('Сохранено')).toBeDisabled();
    });

    expect(catalogApi.saveAlias).toHaveBeenCalledWith('test-track-id');
    expect(catalogApi.saveAlias).toHaveBeenCalledTimes(1);
  });

  it('renders as disabled if track is already saved', () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SaveToLibraryBtn trackId="test-track-id" isSaved={true} />
      </QueryClientProvider>
    );

    const button = screen.getByText('Сохранено');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    
    expect(catalogApi.saveAlias).not.toHaveBeenCalled();
  });
});
'use client';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/entities/catalog/api';
import { Button } from '@/shared/ui/Button';
import { QUERY_KEYS } from '@/shared/api/query-keys';

interface SaveToLibraryBtnProps {
  trackId: string;
  isSaved: boolean;
}

export const SaveToLibraryBtn: React.FC<SaveToLibraryBtnProps> = ({ trackId, isSaved }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => catalogApi.saveAlias(trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    }
  });

  const isCompleted = isSaved || mutation.isSuccess;

  return (
    <Button 
      variant={isCompleted ? 'ghost' : 'secondary'}
      size="sm"
      className={isCompleted ? 'text-accent-green border-accent-green/20' : ''}
      onClick={() => mutation.mutate()}
      disabled={isCompleted || mutation.isPending}
      leftIcon={
        isCompleted ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        )
      }
    >
      {isCompleted ? 'Сохранено' : 'В библиотеку'}
    </Button>
  );
};
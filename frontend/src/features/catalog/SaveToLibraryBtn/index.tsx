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
      variant="secondary" 
      className="text-xs py-1"
      onClick={() => mutation.mutate()}
      disabled={isCompleted || mutation.isPending}
    >
      {isCompleted ? 'Сохранено' : 'В библиотеку'}
    </Button>
  );
};
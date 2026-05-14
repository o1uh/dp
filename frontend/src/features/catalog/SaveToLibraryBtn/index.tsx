'use client';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/entities/catalog/api';
import { Button } from '@/shared/ui/Button';
import { QUERY_KEYS } from '@/shared/api/query-keys';

interface SaveToLibraryBtnProps {
  trackId: string;
}

export const SaveToLibraryBtn: React.FC<SaveToLibraryBtnProps> = ({ trackId }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => catalogApi.saveAlias(trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRACKS.LIST() });
    }
  });

  return (
    <Button 
      variant="secondary" 
      className="text-xs py-1"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending || mutation.isSuccess}
    >
      {mutation.isSuccess ? 'Сохранено' : 'В библиотеку'}
    </Button>
  );
};
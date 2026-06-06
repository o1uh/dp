'use client';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/entities/catalog/api';
import { Button } from '@/shared/ui/Button';
import { QUERY_KEYS } from '@/shared/api/query-keys';

interface SaveToLibraryBtnProps {
  trackId: string;
  isSaved: boolean;
  className?: string;
}

export const SaveToLibraryBtn: React.FC<SaveToLibraryBtnProps> = ({ trackId, isSaved, className = '' }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => catalogApi.saveAlias(trackId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['catalog'] });
      const prev = queryClient.getQueriesData({ queryKey: ['catalog'] });

      queryClient.setQueriesData<any>({ queryKey: ['catalog'] }, (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((t: any) =>
            t.id === trackId
              ? { ...t, is_saved: true, save_count: (t.save_count ?? 0) + 1 }
              : t
          )
        };
      });

      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
    onError: (_err, _vars, ctx) => {
      ctx?.prev?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    }
  });

  const isCompleted = isSaved || mutation.isSuccess;

  return (
    <Button
      variant={isCompleted ? 'ghost' : 'secondary'}
      size="sm"
      className={`${className}${isCompleted ? ' text-accent-green border-accent-green/20' : ''}`}
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
      {isCompleted ? 'Добавлено' : 'В библиотеку'}
    </Button>
  );
};

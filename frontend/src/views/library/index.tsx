import React from 'react';
import { UploadZone } from '@/widgets/file_management/UploadZone';
import { TrackGrid } from '@/widgets/file_management/TrackGrid';

export const LibraryView = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Библиотека</h1>
      </div>
      <UploadZone />
      <TrackGrid />
    </div>
  );
};
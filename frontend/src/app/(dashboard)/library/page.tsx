import React from 'react';
import { UploadZone } from '@/widgets/file_management/UploadZone';
import { TrackGrid } from '@/widgets/file_management/TrackGrid';

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Библиотека</h1>
      <UploadZone />
      <TrackGrid />
    </div>
  );
}
import React from 'react';
import { UploadZone } from '@/widgets/file_management/UploadZone';

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-primary">Библиотека</h1>
      <UploadZone />
    </div>
  );
}
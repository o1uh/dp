import React from 'react';
import { Button } from '@/shared/ui/Button';

interface StemCardProps {
  id: string;
  stemClass: string;
  onDownload: (id: string) => void;
}

export const StemCard: React.FC<StemCardProps> = ({ id, stemClass, onDownload }) => {
  return (
    <div className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center">
      <span className="capitalize font-semibold text-sm">{stemClass}</span>
      <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => onDownload(id)}>DL</Button>
    </div>
  );
};
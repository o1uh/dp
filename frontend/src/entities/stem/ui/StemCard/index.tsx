import React from 'react';
import { Button } from '@/shared/ui/Button';

interface StemCardProps {
  id: string;
  stemClass: string;
  onDownload: (id: string) => void;
}

export const StemCard: React.FC<StemCardProps> = ({ id, stemClass, onDownload }) => {
  const getStemColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('vocal')) return 'border-pink-500/30 bg-pink-500/5';
    if (lower.includes('drum')) return 'border-cyan-500/30 bg-cyan-500/5';
    if (lower.includes('bass')) return 'border-emerald-500/30 bg-emerald-500/5';
    if (lower.includes('guitar')) return 'border-amber-500/30 bg-amber-500/5';
    return 'border-violet-500/30 bg-violet-500/5';
  };

  const getStemIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('vocal')) return '🎤';
    if (lower.includes('drum')) return '🥁';
    if (lower.includes('bass')) return '🎸';
    if (lower.includes('guitar')) return '🎸';
    return '🎵';
  };

  return (
    <div className={`group p-3 rounded-xl border ${getStemColor(stemClass)} hover:brightness-110 transition-all duration-200 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{getStemIcon(stemClass)}</span>
        <span className="capitalize font-bold text-sm text-gray-200">{stemClass}</span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => onDownload(id)}
        leftIcon={
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 6m0 0l-4.5 4.5M12 6v13.5" />
          </svg>
        }
      >
        Скачать
      </Button>
    </div>
  );
};
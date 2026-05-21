import React from 'react';
import { UploadZone } from '@/widgets/file_management/UploadZone';
import { TrackGrid } from '@/widgets/file_management/TrackGrid';

export const LibraryView = () => {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full select-none">
      {/* Секция заголовка, счетчика треков и дискового пространства */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.04]">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-gray-200 uppercase">Моя аудио-библиотека</h1>
          <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-widest">ИМПОРТ ФАЙЛОВ И ДЕКОМПОЗИЦИЯ НА СТЕМЫ</p>
        </div>
        
        {/* Объединенный блок телеметрии справа */}
        <div className="flex items-center gap-6 self-end md:self-auto">
          {/* Всего треков */}
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Всего треков</span>
            <span className="text-sm font-bold text-primary font-mono mt-1 leading-none">LIBRARY_ACTIVE</span>
          </div>

          {/* Тонкий вертикальный разделитель */}
          <div className="h-8 w-[1.5px] bg-white/[0.04]" />

          {/* Дисковое пространство */}
          <div className="flex flex-col w-44">
            <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1">
              <span>Хранилище</span>
              <span>Безлимитно</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/[0.02]">
              <div className="bg-secondary h-full w-[12%] rounded-full" />
            </div>
            <span className="text-[8px] font-mono text-gray-600 block mt-1">0.12 GB из ∞ использовано</span>
          </div>
        </div>
      </div>

      {/* Зона перетаскивания и прямой загрузки на S3 */}
      <div className="bg-background-surface/20 border border-white/[0.04] p-2 rounded-2xl backdrop-blur-md">
        <UploadZone />
      </div>

      {/* Сетка физических/логических треков пользователя */}
      <div className="mt-2">
        <TrackGrid />
      </div>
    </div>
  );
};
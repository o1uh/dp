'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[REACT GLOBAL ERROR BOUNDARY] Uncaught client-side application crash occurred!", {
      message: error.message,
      digest: error.digest,
      stack: error.stack
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white gap-4 p-6 text-center select-none">
      <div className="w-12 h-12 rounded-full bg-accent-red/25 flex items-center justify-center border border-accent-red/40 text-accent-red text-xl font-bold animate-bounce">
        ✕
      </div>
      <h2 className="text-xl font-bold text-accent-red uppercase tracking-wider">Критическая ошибка интерфейса</h2>
      <p className="text-xs text-gray-500 max-w-md font-mono bg-slate-950 p-4 border border-white/[0.04] rounded-lg text-left overflow-auto max-h-40 w-full">
        {error.message || "Uncaught React runtime exception"}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => window.location.href = '/library'}>
          На главную
        </Button>
        <Button variant="primary" onClick={() => {
          console.log("[REACT GLOBAL ERROR BOUNDARY] Dispatched transaction state rollback trigger (reset)...");
          reset();
        }}>
          Попробовать снова
        </Button>
      </div>
    </div>
  );
}
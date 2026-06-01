'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GLOBAL ERROR BOUNDARY] Uncaught client-side application crash:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white gap-6 p-6 text-center select-none">
      {/* Error icon */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-accent-red/10 flex items-center justify-center border border-accent-red/20">
          <svg className="w-8 h-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-red animate-ping opacity-40" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-accent-red mb-2">Критическая ошибка интерфейса</h2>
        <p className="text-sm text-gray-500 max-w-md">
          Произошла непредвиденная ошибка. Наша команда уже уведомлена.
        </p>
      </div>

      <div className="max-w-sm w-full bg-background-deep border border-white/[0.04] rounded-xl p-4 text-left overflow-auto max-h-24">
        <code className="text-[10px] font-mono text-gray-500 leading-relaxed">
          {error.message || "Unknown error"}
        </code>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => window.location.href = '/library'}>
          На главную
        </Button>
        <Button variant="primary" onClick={() => reset()}>
          Попробовать снова
        </Button>
      </div>
    </div>
  );
}
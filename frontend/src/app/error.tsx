'use client';

import { Button } from '@/shared/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white gap-4">
      <h2 className="text-2xl font-bold text-red-500">Что-то пошло не так</h2>
      <p className="text-gray-400">{error.message}</p>
      <Button onClick={() => reset()}>Попробовать снова</Button>
    </div>
  );
}
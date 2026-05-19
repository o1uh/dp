import React from 'react';

export default function BillingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-2xl font-bold text-primary mb-4">Подписка и квоты</h1>
      <div className="bg-slate-800 p-8 rounded-lg border border-dashed border-slate-600">
        <p className="text-gray-400">В текущей версии платформы всем пользователям предоставляется безлимитный доступ.</p>
      </div>
    </div>
  );
}
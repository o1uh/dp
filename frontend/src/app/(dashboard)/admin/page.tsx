import React from 'react';

export default function AdminPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-2xl font-bold text-red-500 mb-4">Панель администратора</h1>
      <div className="bg-slate-800 p-8 rounded-lg border border-dashed border-slate-600">
        <p className="text-gray-400">Модуль администрирования в разработке.</p>
      </div>
    </div>
  );
}
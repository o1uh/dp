import React from 'react';

export default function FeedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-2xl font-bold text-primary mb-4">Лента активности</h1>
      <div className="bg-slate-800 p-8 rounded-lg border border-dashed border-slate-600">
        <p className="text-gray-400">Данный раздел находится в разработке.</p>
        <p className="text-sm text-gray-500 mt-2">Здесь будут отображаться новые релизы авторов, на которых вы подписаны.</p>
      </div>
    </div>
  );
}
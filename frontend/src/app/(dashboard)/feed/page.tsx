'use client';

import React from 'react';
import Link from 'next/link';

export default function FeedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-100 mb-2">Лента активности</h1>
        <p className="text-sm text-gray-500 mb-6">Раздел находится в разработке</p>
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-xs text-gray-500 leading-relaxed">
            Здесь будут отображаться новые публичные релизы авторов, на которых вы подписаны, 
            а также активность вашей библиотеки.
          </p>
        </div>
        <div className="mt-6">
          <Link href="/library" className="text-xs text-primary hover:text-primary-light font-semibold transition">
            ← Вернуться в библиотеку
          </Link>
        </div>
      </div>
    </div>
  );
}
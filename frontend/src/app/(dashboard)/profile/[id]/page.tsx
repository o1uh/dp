'use client';

import React from 'react';
import Link from 'next/link';

export default function ProfilePage({ params }: { params: { id: string } }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-100 mb-2">Профиль пользователя</h1>
        <p className="text-sm text-gray-500 mb-6">ID: {params.id}</p>
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-xs text-gray-500 leading-relaxed">
            Публичные профили пользователей находятся в разработке. 
            Здесь будет отображаться информация об авторе и его публичные треки.
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
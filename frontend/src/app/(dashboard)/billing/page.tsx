'use client';

import React from 'react';
import Link from 'next/link';

export default function BillingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-100 mb-2">Подписка и квоты</h1>
        <div className="p-5 rounded-2xl bg-accent-green/5 border border-accent-green/20 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold text-accent-green">Безлимитный доступ</span>
          </div>
          <p className="text-xs text-gray-500 text-left">
            В текущей версии платформы всем пользователям предоставляется безлимитный доступ ко всем функциям.
          </p>
        </div>
        <Link href="/library" className="text-xs text-primary hover:text-primary-light font-semibold transition">
          ← Вернуться в библиотеку
        </Link>
      </div>
    </div>
  );
}
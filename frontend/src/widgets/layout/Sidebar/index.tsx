'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Sidebar = () => {
  const pathname = usePathname();

  const links = [
    { href: '/library', label: 'Библиотека' },
    { href: '/catalog', label: 'Каталог' },
    { href: '/feed', label: 'Лента' },
    { href: '/billing', label: 'Подписка' },
    { href: '/settings', label: 'Настройки' },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-background flex flex-col">
      <nav className="flex-1 p-4 flex flex-col gap-2 mt-4">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`px-4 py-2 rounded transition-colors ${isActive ? 'bg-slate-800 text-primary' : 'text-gray-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
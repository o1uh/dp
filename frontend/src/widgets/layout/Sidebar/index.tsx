'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Sidebar = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const links = [
    { 
      href: '/library', 
      label: 'Моя библиотека',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
        </svg>
      )
    },
    { 
      href: '/catalog', 
      label: 'Глобальный каталог',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      )
    },
    { 
      href: '/feed', 
      label: 'Лента активности',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      )
    },
    { 
      href: '/billing', 
      label: 'Тарифы и квоты',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      )
    },
    { 
      href: '/settings', 
      label: 'Настройки',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} border-r border-border bg-background-deep flex flex-col justify-between select-none pb-8 transition-all duration-300 relative`}>
      {/* Logo area */}
      <div className="px-4 pt-5 pb-2">
        <Link href="/library" className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'px-3'}`}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-glow-primary">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-sm font-black tracking-tight">
              <span className="text-gray-100">AUDIO</span>
              <span className="text-primary">.</span>
              <span className="text-secondary">AI</span>
            </span>
          )}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background-surface border border-border flex items-center justify-center text-gray-400 hover:text-gray-100 transition z-10"
      >
        <svg 
          className={`w-3 h-3 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-6 flex flex-col gap-1">
        {!collapsed && (
          <span className="text-[9px] font-mono font-black text-gray-500 px-3 mb-2 uppercase tracking-widest">
            НАВИГАЦИЯ
          </span>
        )}
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`
                relative group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide
                transition-all duration-150
                ${collapsed ? 'justify-center' : ''}
                ${isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow-primary' 
                  : 'text-gray-400 hover:text-gray-100 hover:bg-background-elevated border border-transparent'
                }
              `}
              title={collapsed ? link.label : undefined}
            >
              {link.icon}
              {!collapsed && <span>{link.label}</span>}
              {isActive && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full ${collapsed ? 'hidden' : ''}`} />
              )}
            </Link>
          );
        })}

        {/* Admin link */}
        <div className="mt-6 pt-4 border-t border-border">
          {!collapsed && (
            <span className="text-[9px] font-mono font-black text-gray-500 px-3 mb-2 uppercase tracking-widest block">
              СИСТЕМА
            </span>
          )}
          <Link 
            href="/admin"
            className={`relative group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide
              transition-all duration-150
              ${collapsed ? 'justify-center' : ''}
              ${pathname.startsWith('/admin') 
                ? 'bg-accent-red/10 text-accent-red border border-accent-red/20' 
                : 'text-gray-400 hover:text-gray-100 hover:bg-background-elevated border border-transparent'
              }`}
            title={collapsed ? 'Админ-панель' : undefined}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            {!collapsed && <span>Админ-панель</span>}
          </Link>
        </div>
      </nav>

      {/* Version */}
      {!collapsed && (
        <div className="px-6 mt-4">
          <span className="text-[9px] font-mono text-gray-500">v2.0.0 • Demucs v4</span>
        </div>
      )}
    </aside>
  );
};
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUserStore } from '@/entities/user/model/store';
import { Avatar } from '@/entities/user/ui/Avatar';
import { UserBadge } from '@/entities/user/ui/UserBadge';
import { LogoutBtn } from '@/features/auth/LogoutBtn';

export const Header = () => {
  const profile = useUserStore((state) => state.profile);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="h-14 border-b border-white/[0.04] bg-background-surface/40 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-40 select-none">
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-glow" />
        <span className="text-[10px] font-mono font-semibold text-gray-600 uppercase tracking-widest">Система активна</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] text-gray-400 hover:text-white transition"
          title="Сменить тему"
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </button>

        {profile && (
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/[0.04]"
            >
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-gray-200 leading-none mb-0.5">{profile.username}</span>
                <UserBadge roleName={profile.role_name} specialization={profile.profile_specialization} />
              </div>
              <Avatar url={profile.avatar_url} name={profile.username} size="sm" />
              <svg className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 p-1.5 rounded-xl bg-background-surface border border-white/[0.08] shadow-elevated animate-fade-in-up origin-top-right">
                <div className="px-3 py-2.5 border-b border-white/[0.04] mb-1">
                  <p className="text-xs font-semibold text-gray-200">{profile.username}</p>
                  <p className="text-[10px] font-mono text-gray-500">{profile.email || 'Нет email'}</p>
                </div>
                <button 
                  onClick={() => window.location.href = '/settings'}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition"
                >
                  Настройки
                </button>
                <div className="border-t border-white/[0.04] mt-1 pt-1">
                  <LogoutBtn />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
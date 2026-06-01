'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';

export const SearchFilters = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setGenre(searchParams.get('genre') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (genre) params.set('genre', genre);
    
    router.push(`/catalog?${params.toString()}`);
  };

  const handleReset = () => {
    setQuery('');
    setGenre('');
    router.push('/catalog');
  };

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-3">
      <Input 
        placeholder="Поиск по названию..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        }
      />
      
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
        </div>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full px-3.5 py-3 pl-10 bg-background-deep text-gray-100 text-xs border border-white/[0.06] rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 appearance-none cursor-pointer transition"
        >
          <option value="">Все жанры</option>
          <option value="Rock">Rock</option>
          <option value="Pop">Pop</option>
          <option value="Electronic">Electronic</option>
          <option value="Hip-Hop">Hip-Hop</option>
          <option value="Jazz">Jazz</option>
          <option value="Classical">Classical</option>
          <option value="Metal">Metal</option>
          <option value="Folk">Folk</option>
          <option value="R&B">R&B</option>
          <option value="Other">Other</option>
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      <div className="flex gap-2 mt-1">
        <Button type="submit" variant="primary" className="flex-1" size="sm">
          Найти
        </Button>
        {(query || genre) && (
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            Сбросить
          </Button>
        )}
      </div>
    </form>
  );
};
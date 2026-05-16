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

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
      <h3 className="font-semibold text-white">Фильтры</h3>
      <Input 
        placeholder="Поиск по названию..." 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
      />
      <Input 
        placeholder="Жанр (например, Rock)" 
        value={genre} 
        onChange={(e) => setGenre(e.target.value)} 
      />
      <Button type="submit" variant="primary">Найти</Button>
    </form>
  );
};
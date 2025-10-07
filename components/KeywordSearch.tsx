"use client";

import { useState } from 'react';

interface Props {
  onSearch: (keyword: string) => void;
  isLoading: boolean;
}

export default function KeywordSearch({ onSearch, isLoading }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    
    // 🆕 공백을 모두 제거하고 검색
    const cleanedKeyword = value.trim().replace(/\s+/g, '');
    if (!cleanedKeyword) return;
    
    console.log(`[검색] 원본: "${value.trim()}" → 변환: "${cleanedKeyword}"`);
    onSearch(cleanedKeyword);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="키워드를 입력하세요"
        className="w-full max-w-xl rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        maxLength={50}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
      >
        {isLoading ? '검색 중…' : '검색'}
      </button>
    </form>
  );
}



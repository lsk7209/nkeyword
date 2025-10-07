/**
 * 메모리 기반 저장소 (Vercel 서버 환경용)
 * 서버 재시작 시 데이터가 사라지지만, 테스트용으로 사용
 */

import type { KeywordData } from './types';

// 전역 메모리 저장소
let memoryStorage: KeywordData[] = [];

export function getMemoryStorage(): KeywordData[] {
  return memoryStorage;
}

export function setMemoryStorage(data: KeywordData[]): void {
  memoryStorage = data;
  console.log(`[Memory Storage] 데이터 저장: ${data.length}개 키워드`);
}

export function addMemoryKeywords(keywords: KeywordData[]): void {
  keywords.forEach(newKeyword => {
    const existingIndex = memoryStorage.findIndex(k => k.keyword === newKeyword.keyword);
    if (existingIndex !== -1) {
      // 기존 키워드가 있으면 업데이트
      memoryStorage[existingIndex] = { ...memoryStorage[existingIndex], ...newKeyword };
    } else {
      // 없으면 추가
      memoryStorage.push(newKeyword);
    }
  });
  console.log(`[Memory Storage] ${keywords.length}개 키워드 추가/업데이트`);
}

export function clearMemoryStorage(): void {
  memoryStorage = [];
  console.log('[Memory Storage] 모든 데이터 삭제');
}

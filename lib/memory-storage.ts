/**
 * 메모리 기반 저장소 (Vercel 서버 환경용)
 * 서버 재시작 시 데이터가 사라지지만, 테스트용으로 사용
 */

import type { Dataset, StoredRow } from './storage';

// 전역 메모리 저장소
let memoryStorage: Dataset = [];

export function getMemoryStorage(): Dataset {
  return memoryStorage;
}

export function setMemoryStorage(data: Dataset): void {
  memoryStorage = data;
  console.log(`[Memory Storage] 데이터 저장: ${data.length}개 키워드`);
}

export function addToMemoryStorage(keyword: string, data: any): void {
  const newRow: StoredRow = {
    keyword,
    monthlyPcSearch: data.monthlyPcSearch || 0,
    monthlyMobileSearch: data.monthlyMobileSearch || 0,
    totalSearch: data.totalSearch || 0,
    competition: data.competition || '중',
    monthlyPcClicks: data.monthlyPcClicks,
    monthlyMobileClicks: data.monthlyMobileClicks,
    monthlyPcClickRate: data.monthlyPcClickRate,
    monthlyMobileClickRate: data.monthlyMobileClickRate,
    monthlyAdCount: data.monthlyAdCount,
    blogTotalCount: data.blogTotalCount,
    cafeTotalCount: data.cafeTotalCount,
    newsTotalCount: data.newsTotalCount,
    webkrTotalCount: data.webkrTotalCount,
    collectedAt: new Date().toISOString(),
  };
  
  // 중복 제거
  memoryStorage = memoryStorage.filter(item => item.keyword !== keyword);
  memoryStorage.push(newRow);
  
  console.log(`[Memory Storage] 키워드 추가: ${keyword}`);
}

export function clearMemoryStorage(): void {
  memoryStorage = [];
  console.log('[Memory Storage] 모든 데이터 삭제');
}

export function deleteFromMemoryStorage(keywords: string[]): void {
  memoryStorage = memoryStorage.filter(item => !keywords.includes(item.keyword));
  console.log(`[Memory Storage] 키워드 삭제: ${keywords.length}개`);
}

export function updateMemoryStorageDocumentCounts(keyword: string, counts: any): void {
  const item = memoryStorage.find(item => item.keyword === keyword);
  if (item) {
    item.blogTotalCount = counts.blog;
    item.cafeTotalCount = counts.cafe;
    item.newsTotalCount = counts.news;
    item.webkrTotalCount = counts.webkr;
    console.log(`[Memory Storage] 문서수 업데이트: ${keyword}`);
  }
}

export function getMemoryStorageStats(): { total: number; withDocCounts: number; withoutDocCounts: number } {
  const total = memoryStorage.length;
  const withDocCounts = memoryStorage.filter(item => 
    item.blogTotalCount || item.cafeTotalCount || item.newsTotalCount || item.webkrTotalCount
  ).length;
  const withoutDocCounts = total - withDocCounts;
  
  return { total, withDocCounts, withoutDocCounts };
}

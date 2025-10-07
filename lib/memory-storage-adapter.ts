/**
 * 메모리 기반 저장소 어댑터 (서버 환경용)
 * Vercel 서버리스 환경에서 메모리 저장소를 사용
 */

import type { StorageAdapter, Dataset, DocumentCounts } from './storage-adapter';
import { getMemoryStorage, setMemoryStorage, addMemoryKeywords, clearMemoryStorage } from './memory-storage';
import type { KeywordData } from './types';

/**
 * 메모리 기반 저장소 어댑터 (서버 환경용)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  async getKeywords(): Promise<Dataset> {
    console.log('[MemoryStorageAdapter] 키워드 조회');
    const data = getMemoryStorage();
    console.log(`[MemoryStorageAdapter] ${data.length}개 키워드 조회됨`);
    return data;
  }

  async addKeywords(results: KeywordData[]): Promise<void> {
    console.log(`[MemoryStorageAdapter] ${results.length}개 키워드 추가`);
    addMemoryKeywords(results);
  }

  async updateDocumentCounts(keyword: string, counts: DocumentCounts): Promise<void> {
    console.log(`[MemoryStorageAdapter] ${keyword} 문서수 업데이트`, counts);
    const currentData = getMemoryStorage();
    const index = currentData.findIndex(k => k.keyword === keyword);
    if (index !== -1) {
      currentData[index] = {
        ...currentData[index],
        blogTotalCount: counts.blog,
        cafeTotalCount: counts.cafe,
        newsTotalCount: counts.news,
        webkrTotalCount: counts.webkr,
      };
      setMemoryStorage(currentData);
    }
  }

  async deleteKeywords(keywords: string[]): Promise<void> {
    console.log(`[MemoryStorageAdapter] ${keywords.length}개 키워드 삭제`);
    let currentData = getMemoryStorage();
    currentData = currentData.filter(k => !keywords.includes(k.keyword));
    setMemoryStorage(currentData);
  }

  async clearAllKeywords(): Promise<void> {
    console.log('[MemoryStorageAdapter] 모든 키워드 삭제');
    clearMemoryStorage();
  }

  async getKeywordsWithoutDocCounts(): Promise<string[]> {
    console.log('[MemoryStorageAdapter] 문서수 없는 키워드 조회');
    return getMemoryStorage()
      .filter(k => !k.blogTotalCount && !k.cafeTotalCount && !k.newsTotalCount && !k.webkrTotalCount)
      .map(k => k.keyword);
  }

  async getUnusedSeedKeywords(limit: number = 10): Promise<any[]> {
    console.log('[MemoryStorageAdapter] 미사용 시드 키워드 조회');
    // 메모리 저장소는 'isUsedSeed' 개념이 없으므로 모든 키워드를 반환
    return getMemoryStorage().slice(0, limit);
  }

  async markAsUsedSeed(keyword: string): Promise<void> {
    console.log(`[MemoryStorageAdapter] ${keyword} 시드 사용으로 표시 (더미)`);
    // 메모리 저장소는 'isUsedSeed' 개념이 없으므로 더미
  }

  async getKeywordStats(): Promise<{ total: number; withDocCounts: number; withoutDocCounts: number }> {
    console.log('[MemoryStorageAdapter] 키워드 통계 조회');
    const data = getMemoryStorage();
    const total = data.length;
    const withDocCounts = data.filter(item => 
      item.blogTotalCount || item.cafeTotalCount || item.newsTotalCount || item.webkrTotalCount
    ).length;
    const withoutDocCounts = total - withDocCounts;
    
    return { total, withDocCounts, withoutDocCounts };
  }

  async batchInsertKeywords(keywords: KeywordData[]): Promise<void> {
    console.log(`[MemoryStorageAdapter] ${keywords.length}개 키워드 배치 삽입`);
    addMemoryKeywords(keywords);
  }
}
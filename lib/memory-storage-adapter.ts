/**
 * 메모리 저장소 어댑터 (Vercel 서버 환경용)
 */

import type { Dataset, StoredRow } from './storage';
import { 
  getMemoryStorage, 
  setMemoryStorage, 
  addToMemoryStorage, 
  clearMemoryStorage,
  deleteFromMemoryStorage,
  updateMemoryStorageDocumentCounts,
  getMemoryStorageStats
} from './memory-storage';

export interface DocumentCounts {
  blog?: number;
  cafe?: number;
  news?: number;
  webkr?: number;
}

export class MemoryStorageAdapter {
  async getKeywords(): Promise<Dataset> {
    const data = getMemoryStorage();
    console.log(`[Memory Adapter] 키워드 조회: ${data.length}개`);
    return data;
  }

  async addKeywords(results: any[]): Promise<void> {
    console.log(`[Memory Adapter] 키워드 추가: ${results.length}개`);
    
    results.forEach(result => {
      addToMemoryStorage(result.keyword, {
        monthlyPcSearch: result.monthlyPcSearch,
        monthlyMobileSearch: result.monthlyMobileSearch,
        totalSearch: result.totalSearch,
        competition: result.competition,
        monthlyPcClicks: result.monthlyPcClicks,
        monthlyMobileClicks: result.monthlyMobileClicks,
        monthlyPcClickRate: result.monthlyPcClickRate,
        monthlyMobileClickRate: result.monthlyMobileClickRate,
        monthlyAdCount: result.monthlyAdCount,
        blogTotalCount: result.blogTotalCount,
        cafeTotalCount: result.cafeTotalCount,
        newsTotalCount: result.newsTotalCount,
        webkrTotalCount: result.webkrTotalCount,
      });
    });
  }

  async updateDocumentCounts(keyword: string, counts: DocumentCounts): Promise<void> {
    updateMemoryStorageDocumentCounts(keyword, counts);
  }

  async deleteKeywords(keywords: string[]): Promise<void> {
    deleteFromMemoryStorage(keywords);
  }

  async clearAllKeywords(): Promise<void> {
    clearMemoryStorage();
  }

  async getKeywordsWithoutDocCounts(): Promise<string[]> {
    const data = getMemoryStorage();
    return data
      .filter(item => !item.blogTotalCount && !item.cafeTotalCount && !item.newsTotalCount && !item.webkrTotalCount)
      .map(item => item.keyword);
  }

  async getUnusedSeedKeywords(): Promise<string[]> {
    // 메모리 저장소에서는 시드 키워드 추적이 없으므로 빈 배열 반환
    return [];
  }

  async markAsUsedSeed(keywords: string[]): Promise<void> {
    console.log(`[Memory Adapter] 시드 키워드 사용 표시 (지원 안 함): ${keywords.length}개`);
  }

  async getKeywordStats(): Promise<{ total: number; withDocCounts: number; withoutDocCounts: number }> {
    return getMemoryStorageStats();
  }

  async batchInsertKeywords(keywords: any[]): Promise<void> {
    await this.addKeywords(keywords);
  }
}

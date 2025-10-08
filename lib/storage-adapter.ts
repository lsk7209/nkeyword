/**
 * 🔥 하이브리드 저장소 어댑터 (임시 비활성화)
 * localStorage와 Supabase를 동시에 지원하여 성능과 확장성을 모두 확보
 */

// import { supabase } from './supabase/client';
import type { StoredRow, Dataset } from './storage';
import type { Database } from './supabase/types';

// Dataset 타입 re-export
export type { Dataset } from './storage';

// DocumentCounts 타입 export
export interface DocumentCounts {
  blog: number;
  cafe: number;
  news: number;
  webkr: number;
}

// 저장소 모드
export type StorageMode = 'localStorage' | 'supabase';

// StorageAdapter 인터페이스 (Vercel 배포용)
export interface StorageAdapter {
  getKeywords(): Promise<Dataset>;
  addKeywords(results: any[]): Promise<void>;
  updateDocumentCounts(keyword: string, counts: DocumentCounts): Promise<void>;
  deleteKeywords(keywords: string[]): Promise<void>;
  clearAllKeywords(): Promise<void>;
  getKeywordsWithoutDocCounts(): Promise<string[]>;
  getUnusedSeedKeywords(limit?: number): Promise<any[]>;
  markAsUsedSeed(keyword: string): Promise<void>;
  getKeywordStats(): Promise<{ total: number; withDocCounts: number; withoutDocCounts: number }>;
  batchInsertKeywords(keywords: any[]): Promise<void>;
}

// Supabase 키워드 타입
export type SupabaseKeyword = Database['public']['Tables']['keywords']['Row'];

// 문서수 타입

/**
 * Supabase 어댑터 (더미 구현 - Vercel 빌드 오류 방지)
 */
export class SupabaseAdapter implements StorageAdapter {
  async getKeywords(): Promise<Dataset> {
    console.log('[Supabase Adapter] 키워드 조회 (더미)');
    return [];
  }

  async addKeywords(results: any[]): Promise<void> {
    console.log(`[Supabase Adapter] ${results.length}개 키워드 추가 (더미)`);
  }
  
  async updateDocumentCounts(keyword: string, counts: DocumentCounts): Promise<void> {
    console.log(`[Supabase Adapter] ${keyword} 문서수 업데이트 (더미)`, counts);
  }
  
  async deleteKeywords(keywords: string[]): Promise<void> {
    console.log(`[Supabase Adapter] ${keywords.length}개 키워드 삭제`);
    const { supabaseAdmin } = await import('./supabase/client');
    
    if (!supabaseAdmin) {
      console.warn('[Supabase Adapter] Supabase Admin 클라이언트가 null - 키워드 삭제 건너뜀');
      return;
    }
    
    const { error } = await supabaseAdmin.from('keywords')
        .delete()
        .in('keyword', keywords);
      
    if (error) {
      console.error('[Supabase Adapter] 키워드 삭제 오류:', error);
      throw error;
    }
  }
  
  async clearAllKeywords(): Promise<void> {
    console.log('[Supabase Adapter] 모든 키워드 삭제');
    const { supabaseAdmin } = await import('./supabase/client');
    
    if (!supabaseAdmin) {
      console.warn('[Supabase Adapter] Supabase Admin 클라이언트가 null - 모든 키워드 삭제 건너뜀');
      return;
    }
    
    const { error } = await supabaseAdmin.from('keywords').delete().neq('id', '');
    
    if (error) {
      console.error('[Supabase Adapter] 모든 키워드 삭제 오류:', error);
      throw error;
    }
  }
  
  async getKeywordsWithoutDocCounts(): Promise<string[]> {
    console.log('[Supabase Adapter] 문서수 없는 키워드 조회 (더미)');
    return [];
  }

  async getUnusedSeedKeywords(limit: number = 10): Promise<any[]> {
    console.log('[Supabase Adapter] 미사용 시드 키워드 조회 (더미)');
    return [];
  }
  
  async markAsUsedSeed(keyword: string): Promise<void> {
    console.log(`[Supabase Adapter] ${keyword} 시드 사용으로 표시 (더미)`);
  }
  
  async getKeywordStats(): Promise<{ total: number; withDocCounts: number; withoutDocCounts: number }> {
    console.log('[Supabase Adapter] 키워드 통계 조회 (더미)');
    return { total: 0, withDocCounts: 0, withoutDocCounts: 0 };
  }

  async batchInsertKeywords(keywords: any[]): Promise<void> {
    console.log(`[Supabase Adapter] ${keywords.length}개 키워드 배치 삽입 (더미)`);
  }
}

/**
 * LocalStorage 어댑터 (기존 방식)
 */
export class LocalStorageAdapter implements StorageAdapter {
  async getKeywords(): Promise<Dataset> {
    // localStorage에서 데이터 로드
    const { loadDataset } = await import('./storage');
    return loadDataset();
  }

  async addKeywords(results: any[]): Promise<void> {
    // localStorage에 데이터 추가
    const { addResults } = await import('./storage');
    // results를 KeywordData 형식으로 변환
    const keywordData = results.map(result => ({
      keyword: result.keyword,
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
    }));
    addResults('batch', keywordData);
  }

  async updateDocumentCounts(keyword: string, counts: DocumentCounts): Promise<void> {
    // localStorage에서 문서수 업데이트
    const { updateDocumentCounts } = await import('./storage');
    updateDocumentCounts(keyword, {
      blog: counts.blog,
      cafe: counts.cafe,
      news: counts.news,
      webkr: counts.webkr,
    });
  }

  async deleteKeywords(keywords: string[]): Promise<void> {
    // localStorage에서 키워드 삭제
    const { deleteKeywords } = await import('./storage');
    deleteKeywords(keywords);
  }

  async clearAllKeywords(): Promise<void> {
    // localStorage에서 모든 키워드 삭제
    const { clearDataset } = await import('./storage');
    clearDataset();
  }

  async getKeywordsWithoutDocCounts(): Promise<string[]> {
    // localStorage에서 문서수 없는 키워드 조회
    const { loadDataset } = await import('./storage');
    const dataset = loadDataset();
    return dataset
      .filter(item => !item.blogTotalCount && !item.cafeTotalCount && !item.newsTotalCount && !item.webkrTotalCount)
      .map(item => item.keyword);
  }

  async getUnusedSeedKeywords(): Promise<string[]> {
    // localStorage에서는 시드 키워드 추적이 없으므로 빈 배열 반환
    return [];
  }

  async markAsUsedSeed(keyword: string): Promise<void> {
    // localStorage에서는 시드 키워드 추적이 없으므로 아무것도 하지 않음
    console.log('[LocalStorage Adapter] 시드 키워드 사용 표시 (지원 안 함):', keyword);
  }

  async getKeywordStats(): Promise<{ total: number; withDocCounts: number; withoutDocCounts: number }> {
    // localStorage에서 키워드 통계 조회
    const { loadDataset } = await import('./storage');
    const dataset = loadDataset();
    const total = dataset.length;
    const withDocCounts = dataset.filter(item => 
      item.blogTotalCount || item.cafeTotalCount || item.newsTotalCount || item.webkrTotalCount
    ).length;
    const withoutDocCounts = total - withDocCounts;
    
    return { total, withDocCounts, withoutDocCounts };
  }

  async batchInsertKeywords(keywords: any[]): Promise<void> {
    // localStorage에 배치로 키워드 삽입
    await this.addKeywords(keywords);
  }
}

/**
 * 저장소 어댑터 팩토리
 */
export function getStorageAdapter(): LocalStorageAdapter | SupabaseAdapter | any {
  const mode = (process.env.NEXT_PUBLIC_STORAGE_MODE || process.env.STORAGE_MODE) as StorageMode || 'supabase';
  
  // Supabase가 설정되어 있으면 Supabase 사용
  const { isSupabaseConfigured } = require('./supabase/client');
  
  if (isSupabaseConfigured) {
    console.log('[Storage Adapter] Supabase 모드 사용 (실제 DB)');
    return new SupabaseAdapter();
  }
  
  // 서버 환경에서 Supabase가 없으면 메모리 어댑터 사용
  if (typeof window === 'undefined') {
    console.log('[Storage Adapter] 서버 환경 - 메모리 어댑터 사용 (Supabase 미설정)');
    const { MemoryStorageAdapter } = require('./memory-storage-adapter');
    return new MemoryStorageAdapter();
  }
  
  // 클라이언트 환경에서는 LocalStorage 사용
  console.log('[Storage Adapter] LocalStorage 모드 사용 (Supabase 미설정)');
  return new LocalStorageAdapter();
}

/**
 * 마이그레이션 유틸리티
 */
export async function migrateToSupabase(): Promise<void> {
  console.log('[Storage Adapter] Supabase 마이그레이션 (더미)');
  // 실제 마이그레이션 로직은 Supabase 설정 후 구현
}

/**
 * 하이브리드 저장소 (로컬 + 클라우드 동기화)
 */
export class HybridStorage {
  private localAdapter: LocalStorageAdapter;
  private supabaseAdapter: SupabaseAdapter;

  constructor() {
    this.localAdapter = new LocalStorageAdapter();
    this.supabaseAdapter = new SupabaseAdapter();
  }

  async getKeywords(): Promise<Dataset> {
    // 로컬 우선, Supabase 백업
    try {
      const localData = await this.localAdapter.getKeywords();
      if (localData.length > 0) {
        return localData;
      }
      return await this.supabaseAdapter.getKeywords();
    } catch (error) {
      console.error('[Hybrid Storage] 키워드 조회 오류:', error);
      return [];
    }
  }

  async addKeywords(results: any[]): Promise<void> {
    // 로컬과 Supabase에 동시 저장
    await Promise.all([
      this.localAdapter.addKeywords(results),
      this.supabaseAdapter.addKeywords(results)
    ]);
  }

  async updateDocumentCounts(keyword: string, counts: DocumentCounts): Promise<void> {
    // 로컬과 Supabase에 동시 업데이트
    await Promise.all([
      this.localAdapter.updateDocumentCounts(keyword, counts),
      this.supabaseAdapter.updateDocumentCounts(keyword, counts)
    ]);
  }

  async deleteKeywords(keywords: string[]): Promise<void> {
    // 로컬과 Supabase에서 동시 삭제
    await Promise.all([
      this.localAdapter.deleteKeywords(keywords),
      this.supabaseAdapter.deleteKeywords(keywords)
    ]);
  }

  async clearAllKeywords(): Promise<void> {
    // 로컬과 Supabase에서 동시 삭제
    await Promise.all([
      this.localAdapter.clearAllKeywords(),
      this.supabaseAdapter.clearAllKeywords()
    ]);
  }

  async getKeywordsWithoutDocCounts(): Promise<string[]> {
    // 로컬 우선, Supabase 백업
    try {
      const localKeywords = await this.localAdapter.getKeywordsWithoutDocCounts();
      if (localKeywords.length > 0) {
        return localKeywords;
      }
      return await this.supabaseAdapter.getKeywordsWithoutDocCounts();
    } catch (error) {
      console.error('[Hybrid Storage] 문서수 없는 키워드 조회 오류:', error);
      return [];
    }
  }

  async getUnusedSeedKeywords(): Promise<string[]> {
    // Supabase에서만 시드 키워드 추적
    return await this.supabaseAdapter.getUnusedSeedKeywords();
  }

  async markAsUsedSeed(keyword: string): Promise<void> {
    // Supabase에서만 시드 키워드 추적
    await this.supabaseAdapter.markAsUsedSeed(keyword);
  }

  async getKeywordStats(): Promise<{ total: number; withDocCounts: number; withoutDocCounts: number }> {
    // 로컬 우선, Supabase 백업
    try {
      const localStats = await this.localAdapter.getKeywordStats();
      if (localStats.total > 0) {
        return localStats;
      }
      return await this.supabaseAdapter.getKeywordStats();
    } catch (error) {
      console.error('[Hybrid Storage] 키워드 통계 조회 오류:', error);
      return { total: 0, withDocCounts: 0, withoutDocCounts: 0 };
    }
  }

  async batchInsertKeywords(keywords: any[]): Promise<void> {
    // 로컬과 Supabase에 동시 삽입
    await Promise.all([
      this.localAdapter.batchInsertKeywords(keywords),
      this.supabaseAdapter.batchInsertKeywords(keywords)
    ]);
  }
}
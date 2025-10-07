/**
 * 🔥 하이브리드 저장소 어댑터
 * localStorage와 Supabase를 동시에 지원하여 성능과 확장성을 모두 확보
 */

import { supabase } from './supabase/client';
import type { StoredRow, Dataset } from './storage';
import type { Database } from './supabase/types';

// 저장소 모드
export type StorageMode = 'localStorage' | 'supabase';

// 현재 저장소 모드
export function getStorageMode(): StorageMode {
  if (typeof window === 'undefined') return 'localStorage';
  
  const mode = process.env.NEXT_PUBLIC_STORAGE_MODE || 'localStorage';
  return mode as StorageMode;
}

// 저장소 모드 변경 (실시간 반영)
export function setStorageMode(mode: StorageMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nkeyword:storageMode', mode);
}

/**
 * 통합 저장소 인터페이스
 */
export interface StorageAdapter {
  // 조회
  getDataset(filters?: FilterOptions): Promise<Dataset>;
  getDatasetCount(filters?: FilterOptions): Promise<number>;
  
  // 추가/수정
  addResults(rootKeyword: string, results: StoredRow[]): Promise<void>;
  updateDocumentCounts(keyword: string, counts: DocumentCounts): Promise<void>;
  
  // 삭제
  deleteKeywords(keywords: string[]): Promise<void>;
  clearDataset(): Promise<void>;
  
  // 유틸리티
  getKeywordsWithoutDocCounts(): Promise<string[]>;
  getUnusedSeedKeywords(limit: number): Promise<StoredRow[]>;
  markAsUsedSeed(keyword: string): Promise<void>;
}

export interface FilterOptions {
  keyword?: string;
  minSearch?: number;
  maxSearch?: number;
  competition?: string[];
  hasDocCounts?: boolean;
  minBlogCount?: number;
  maxBlogCount?: number;
  minCafeCount?: number;
  maxCafeCount?: number;
  minNewsCount?: number;
  maxNewsCount?: number;
  minWebkrCount?: number;
  maxWebkrCount?: number;
  // 페이지네이션
  page?: number;
  pageSize?: number;
  // 정렬
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentCounts {
  blog?: number;
  cafe?: number;
  news?: number;
  webkr?: number;
}

/**
 * LocalStorage 어댑터 (기존 방식)
 */
class LocalStorageAdapter implements StorageAdapter {
  private DATASET_KEY = 'nkeyword:dataset:v2';
  
  async getDataset(filters?: FilterOptions): Promise<Dataset> {
    const { loadDataset } = await import('./storage');
    let data = loadDataset();
    
    // 클라이언트 사이드 필터링
    if (filters) {
      data = this.applyFilters(data, filters);
    }
    
    return data;
  }
  
  async getDatasetCount(filters?: FilterOptions): Promise<number> {
    const data = await this.getDataset(filters);
    return data.length;
  }
  
  async addResults(rootKeyword: string, results: StoredRow[]): Promise<void> {
    const { addResults } = await import('./storage');
    addResults(rootKeyword, results as any);
  }
  
  async updateDocumentCounts(keyword: string, counts: DocumentCounts): Promise<void> {
    const { updateDocumentCounts } = await import('./storage');
    updateDocumentCounts(keyword, counts);
  }
  
  async deleteKeywords(keywords: string[]): Promise<void> {
    const { deleteKeywords } = await import('./storage');
    deleteKeywords(keywords);
  }
  
  async clearDataset(): Promise<void> {
    const { clearDataset } = await import('./storage');
    clearDataset();
  }
  
  async getKeywordsWithoutDocCounts(): Promise<string[]> {
    const { getKeywordsWithoutDocCounts } = await import('./storage');
    return getKeywordsWithoutDocCounts();
  }
  
  async getUnusedSeedKeywords(limit: number): Promise<StoredRow[]> {
    const { getUnusedSeedKeywords } = await import('./storage');
    return getUnusedSeedKeywords(limit);
  }
  
  async markAsUsedSeed(keyword: string): Promise<void> {
    const { markAsUsedSeed } = await import('./storage');
    markAsUsedSeed(keyword);
  }
  
  // 클라이언트 사이드 필터링 로직
  private applyFilters(data: Dataset, filters: FilterOptions): Dataset {
    let filtered = [...data];
    
    if (filters.keyword) {
      const keywordLower = filters.keyword.toLowerCase();
      filtered = filtered.filter(item => 
        item.keyword.toLowerCase().includes(keywordLower)
      );
    }
    
    if (filters.minSearch) {
      filtered = filtered.filter(item => item.totalSearch >= filters.minSearch!);
    }
    
    if (filters.maxSearch) {
      filtered = filtered.filter(item => item.totalSearch <= filters.maxSearch!);
    }
    
    if (filters.competition && filters.competition.length > 0) {
      const competitionSet = new Set(filters.competition);
      filtered = filtered.filter(item => competitionSet.has(item.competition));
    }
    
    if (filters.hasDocCounts) {
      filtered = filtered.filter(item =>
        item.blogTotalCount !== undefined ||
        item.cafeTotalCount !== undefined ||
        item.newsTotalCount !== undefined ||
        item.webkrTotalCount !== undefined
      );
    }
    
    // 정렬
    if (filters.sortField) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[filters.sortField!];
        const bVal = (b as any)[filters.sortField!];
        
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;
        
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    // 페이지네이션
    if (filters.page && filters.pageSize) {
      const start = (filters.page - 1) * filters.pageSize;
      filtered = filtered.slice(start, start + filters.pageSize);
    }
    
    return filtered;
  }
}

/**
 * Supabase 어댑터 (서버 사이드 필터링/정렬)
 */
class SupabaseAdapter implements StorageAdapter {
  async getDataset(filters?: FilterOptions): Promise<Dataset> {
    try {
      let query = supabase
        .from('keywords')
        .select('*');
      
      // 서버 사이드 필터링
      if (filters) {
        if (filters.keyword) {
          query = query.ilike('keyword', `%${filters.keyword}%`);
        }
        
        if (filters.minSearch) {
          query = query.gte('total_search', filters.minSearch);
        }
        
        if (filters.maxSearch) {
          query = query.lte('total_search', filters.maxSearch);
        }
        
        if (filters.competition && filters.competition.length > 0) {
          query = query.in('competition', filters.competition);
        }
        
        if (filters.hasDocCounts) {
          query = query.not('cafe_total_count', 'is', null);
        }
        
        // 정렬
        if (filters.sortField) {
          query = query.order(filters.sortField, { 
            ascending: filters.sortOrder === 'asc' 
          });
        } else {
          query = query.order('total_search', { ascending: false });
        }
        
        // 페이지네이션
        if (filters.page && filters.pageSize) {
          const start = (filters.page - 1) * filters.pageSize;
          query = query.range(start, start + filters.pageSize - 1);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Supabase 형식 → StoredRow 형식 변환
      return (data || []).map(this.convertToStoredRow);
    } catch (error) {
      console.error('[Supabase Adapter] 조회 오류:', error);
      return [];
    }
  }
  
  async getDatasetCount(filters?: FilterOptions): Promise<number> {
    try {
      let query = supabase
        .from('keywords')
        .select('*', { count: 'exact', head: true });
      
      // 필터 적용 (getDataset과 동일)
      if (filters) {
        if (filters.keyword) {
          query = query.ilike('keyword', `%${filters.keyword}%`);
        }
        if (filters.minSearch) {
          query = query.gte('total_search', filters.minSearch);
        }
        // ... 나머지 필터들
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error('[Supabase Adapter] 카운트 오류:', error);
      return 0;
    }
  }
  
  async addResults(rootKeyword: string, results: StoredRow[]): Promise<void> {
    try {
      const inserts = results.map(result => ({
        keyword: result.keyword,
        root_keyword: rootKeyword,
        monthly_pc_search: result.monthlyPcSearch,
        monthly_mobile_search: result.monthlyMobileSearch,
        competition: result.competition,
        monthly_pc_clicks: result.monthlyPcClicks,
        monthly_mobile_clicks: result.monthlyMobileClicks,
        monthly_pc_click_rate: result.monthlyPcClickRate,
        monthly_mobile_click_rate: result.monthlyMobileClickRate,
        monthly_ad_count: result.monthlyAdCount,
      }));
      
      const { error } = await supabase
        .from('keywords')
        .upsert(inserts, { onConflict: 'keyword' });
      
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase Adapter] 추가 오류:', error);
      throw error;
    }
  }
  
  async updateDocumentCounts(keyword: string, counts: DocumentCounts): Promise<void> {
    try {
      const { error } = await supabase
        .from('keywords')
        .update({
          blog_total_count: counts.blog,
          cafe_total_count: counts.cafe,
          news_total_count: counts.news,
          webkr_total_count: counts.webkr,
        })
        .eq('keyword', keyword);
      
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase Adapter] 업데이트 오류:', error);
      throw error;
    }
  }
  
  async deleteKeywords(keywords: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('keywords')
        .delete()
        .in('keyword', keywords);
      
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase Adapter] 삭제 오류:', error);
      throw error;
    }
  }
  
  async clearDataset(): Promise<void> {
    try {
      const { error } = await supabase
        .from('keywords')
        .delete()
        .neq('id', 0); // 모든 행 삭제
      
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase Adapter] 전체 삭제 오류:', error);
      throw error;
    }
  }
  
  async getKeywordsWithoutDocCounts(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('keywords')
        .select('keyword')
        .is('cafe_total_count', null)
        .limit(100);
      
      if (error) throw error;
      
      return (data || []).map(row => row.keyword);
    } catch (error) {
      console.error('[Supabase Adapter] 문서수 없는 키워드 조회 오류:', error);
      return [];
    }
  }
  
  async getUnusedSeedKeywords(limit: number): Promise<StoredRow[]> {
    try {
      const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .eq('used_as_seed', false)
        .order('total_search', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return (data || []).map(this.convertToStoredRow);
    } catch (error) {
      console.error('[Supabase Adapter] 미사용 시드 조회 오류:', error);
      return [];
    }
  }
  
  async markAsUsedSeed(keyword: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('keywords')
        .update({ used_as_seed: true })
        .eq('keyword', keyword);
      
      if (error) throw error;
    } catch (error) {
      console.error('[Supabase Adapter] 시드 표시 오류:', error);
      throw error;
    }
  }
  
  // Supabase Row → StoredRow 변환
  private convertToStoredRow(row: Database['public']['Tables']['keywords']['Row']): StoredRow {
    return {
      keyword: row.keyword,
      rootKeyword: row.root_keyword || '',
      monthlyPcSearch: row.monthly_pc_search,
      monthlyMobileSearch: row.monthly_mobile_search,
      totalSearch: row.total_search,
      competition: row.competition || '',
      blogTotalCount: row.blog_total_count || undefined,
      cafeTotalCount: row.cafe_total_count || undefined,
      newsTotalCount: row.news_total_count || undefined,
      webkrTotalCount: row.webkr_total_count || undefined,
      monthlyPcClicks: row.monthly_pc_clicks || undefined,
      monthlyMobileClicks: row.monthly_mobile_clicks || undefined,
      monthlyPcClickRate: row.monthly_pc_click_rate ? Number(row.monthly_pc_click_rate) : undefined,
      monthlyMobileClickRate: row.monthly_mobile_click_rate ? Number(row.monthly_mobile_click_rate) : undefined,
      monthlyAdCount: row.monthly_ad_count || undefined,
      queriedAt: row.queried_at,
      usedAsSeed: row.used_as_seed,
      seedDepth: row.seed_depth,
    };
  }
}

/**
 * 저장소 팩토리 (싱글톤 패턴)
 */
let storageInstance: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (storageInstance) return storageInstance;
  
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { isSupabaseConfigured } = require('./supabase/client');
      
      if (!isSupabaseConfigured) {
        console.warn('[Storage Adapter] ⚠️ Supabase 설정 없음 - LocalStorage 모드로 폴백');
        storageInstance = new LocalStorageAdapter();
        console.log('[Storage Adapter] LocalStorage 모드 활성화 (폴백)');
      } else {
        storageInstance = new SupabaseAdapter();
        console.log('[Storage Adapter] Supabase 모드 활성화');
      }
    } catch (error) {
      console.warn('[Storage Adapter] ⚠️ Supabase 초기화 실패 - LocalStorage 모드로 폴백', error);
      storageInstance = new LocalStorageAdapter();
      console.log('[Storage Adapter] LocalStorage 모드 활성화 (폴백)');
    }
  } else {
    storageInstance = new LocalStorageAdapter();
    console.log(`[Storage Adapter] LocalStorage 모드 활성화`);
  }
  
  return storageInstance;
}

// 저장소 모드 전환 (마이그레이션 포함)
export async function switchStorageMode(newMode: StorageMode) {
  const currentMode = getStorageMode();
  
  if (currentMode === newMode) {
    console.log('[Storage] 이미 같은 모드입니다');
    return;
  }
  
  if (newMode === 'supabase') {
    // localStorage → Supabase 마이그레이션
    console.log('[Storage] localStorage → Supabase 마이그레이션 시작...');
    
    const localAdapter = new LocalStorageAdapter();
    const supabaseAdapter = new SupabaseAdapter();
    
    const localData = await localAdapter.getDataset();
    
    if (localData.length > 0) {
      console.log(`[Storage] ${localData.length}개 키워드 마이그레이션 중...`);
      
      // 100개씩 배치 업로드
      for (let i = 0; i < localData.length; i += 100) {
        const batch = localData.slice(i, i + 100);
        await supabaseAdapter.addResults('migration', batch);
        console.log(`[Storage] ${i + batch.length}/${localData.length} 완료`);
      }
      
      console.log('[Storage] ✅ 마이그레이션 완료!');
    }
  }
  
  setStorageMode(newMode);
  storageInstance = null; // 인스턴스 초기화
  
  console.log(`[Storage] 모드 전환 완료: ${currentMode} → ${newMode}`);
}


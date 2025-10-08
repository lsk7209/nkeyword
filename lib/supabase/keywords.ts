import { supabase, supabaseAdmin, isSupabaseConfigured } from './client';
import type { KeywordData } from '@/lib/types';

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
  cursor?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: number;
  total?: number;
}

/**
 * 키워드 목록 조회 (페이지네이션)
 */
export async function getKeywords(
  filters: FilterOptions = {}
): Promise<PaginatedResult<KeywordData>> {
  const {
    keyword,
    minSearch,
    maxSearch,
    competition,
    hasDocCounts,
    minBlogCount,
    maxBlogCount,
    minCafeCount,
    maxCafeCount,
    minNewsCount,
    maxNewsCount,
    minWebkrCount,
    maxWebkrCount,
    cursor,
    limit = 1000,
    sortBy = 'total_search',
    sortOrder = 'desc',
  } = filters;

  let query = supabase
    .from('keywords')
    .select('*', { count: 'exact' });

  // 키워드 검색
  if (keyword) {
    query = query.ilike('keyword', `%${keyword}%`);
  }

  // 검색량 필터
  if (minSearch) {
    query = query.gte('total_search', minSearch);
  }
  if (maxSearch) {
    query = query.lte('total_search', maxSearch);
  }

  // 경쟁도 필터
  if (competition && competition.length > 0) {
    query = query.in('competition', competition);
  }

  // 문서수 보유 여부
  if (hasDocCounts) {
    query = query.not('cafe_total_count', 'is', null);
  }

  // 문서수 범위 필터
  if (minBlogCount) query = query.gte('blog_total_count', minBlogCount);
  if (maxBlogCount) query = query.lte('blog_total_count', maxBlogCount);
  if (minCafeCount) query = query.gte('cafe_total_count', minCafeCount);
  if (maxCafeCount) query = query.lte('cafe_total_count', maxCafeCount);
  if (minNewsCount) query = query.gte('news_total_count', minNewsCount);
  if (maxNewsCount) query = query.lte('news_total_count', maxNewsCount);
  if (minWebkrCount) query = query.gte('webkr_total_count', minWebkrCount);
  if (maxWebkrCount) query = query.lte('webkr_total_count', maxWebkrCount);

  // Cursor 기반 페이지네이션
  if (cursor) {
    query = query.gt('id', cursor);
  }

  // 정렬
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // 제한
  query = query.limit(limit);

  const { data, error, count } = await query;

  if (error) {
    console.error('[Supabase] 키워드 조회 실패:', error);
    throw error;
  }

  return {
    data: data || [],
    nextCursor: data && data.length > 0 ? (data[data.length - 1] as any).id : undefined,
    total: count || 0,
  };
}

/**
 * 키워드 추가 (중복 시 업데이트)
 */
export async function upsertKeywords(keywords: Partial<KeywordData>[]) {
  if (!isSupabaseConfigured) {
    console.warn('[Supabase Keywords] Supabase가 설정되지 않음 - 키워드 업서트 건너뜀');
    return;
  }

  if (!supabaseAdmin) {
    console.warn('[Supabase Keywords] Supabase Admin 클라이언트가 null - 키워드 업서트 건너뜀');
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('keywords')
    .upsert(keywords as any, {
      onConflict: 'keyword',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('[Supabase] 키워드 추가 실패:', error);
    throw error;
  }

  return data;
}

/**
 * 키워드 삭제
 */
export async function deleteKeywords(keywordIds: number[]) {
  if (!supabase) {
    console.warn('[Supabase Keywords] Supabase 클라이언트가 null - 키워드 삭제 건너뜀');
    return;
  }

  const { error } = await supabase
    .from('keywords')
    .delete()
    .in('id', keywordIds);

  if (error) {
    console.error('[Supabase] 키워드 삭제 실패:', error);
    throw error;
  }
}

/**
 * 전체 키워드 삭제
 */
export async function clearAllKeywords() {
  const { error } = await supabaseAdmin
    .from('keywords')
    .delete()
    .neq('id', 0);  // 모든 행 삭제

  if (error) {
    console.error('[Supabase] 전체 삭제 실패:', error);
    throw error;
  }
}

/**
 * 문서수 업데이트
 */
export async function updateDocumentCounts(
  keyword: string,
  counts: {
    blog?: number;
    cafe?: number;
    news?: number;
    webkr?: number;
  }
) {
  if (!isSupabaseConfigured) {
    console.warn('[Supabase Keywords] Supabase가 설정되지 않음 - 문서수 업데이트 건너뜀');
    return;
  }

  if (!supabase) {
    console.warn('[Supabase Keywords] Supabase 클라이언트가 null - 문서수 업데이트 건너뜀');
    return;
  }

  const { error } = await supabase
    .from('keywords')
    .update({
      blog_total_count: counts.blog,
      cafe_total_count: counts.cafe,
      news_total_count: counts.news,
      webkr_total_count: counts.webkr,
    } as any)
    .eq('keyword', keyword);

  if (error) {
    console.error('[Supabase] 문서수 업데이트 실패:', error);
    throw error;
  }
}

/**
 * 문서수 없는 키워드 조회
 */
export async function getKeywordsWithoutDocCounts(limit = 100): Promise<string[]> {
  if (!supabase) {
    console.warn('[Supabase Keywords] Supabase 클라이언트가 null - 문서수 없는 키워드 조회 건너뜀');
    return [];
  }

  const { data, error } = await supabase
    .from('keywords')
    .select('keyword')
    .is('cafe_total_count', null)
    .limit(limit);

  if (error) {
    console.error('[Supabase] 키워드 조회 실패:', error);
    throw error;
  }

  return data?.map((row: any) => row.keyword) || [];
}

/**
 * 미사용 시드 키워드 조회
 */
export async function getUnusedSeedKeywords(limit = 10) {
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .eq('used_as_seed', false)
    .order('total_search', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase] 시드 키워드 조회 실패:', error);
    throw error;
  }

  return data || [];
}

/**
 * 시드로 표시
 */
export async function markAsUsedSeed(keyword: string) {
  const { error } = await supabase
    .from('keywords')
    .update({ used_as_seed: true })
    .eq('keyword', keyword);

  if (error) {
    console.error('[Supabase] 시드 표시 실패:', error);
    throw error;
  }
}

/**
 * 통계 조회
 */
export async function getKeywordStats() {
  const { data, error } = await supabase
    .from('keyword_performance_stats')
    .select('*')
    .single();

  if (error) {
    console.error('[Supabase] 통계 조회 실패:', error);
    throw error;
  }

  return data;
}

/**
 * 배치 삽입 (1000개씩)
 */
export async function batchInsertKeywords(keywords: Partial<KeywordData>[]) {
  const batchSize = 1000;
  const results = [];

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    const result = await upsertKeywords(batch);
    results.push(result);
    
    console.log(`[Supabase] ${i + batch.length}/${keywords.length} 삽입 완료`);
  }

  return results;
}

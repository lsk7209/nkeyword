// 데이터베이스 쿼리 헬퍼 함수들

import { db } from './client';
import type {
  TrendingKeyword,
  KeywordHistory,
  DailyStats,
  CollectionLog,
} from '@/lib/types/trending';

/**
 * 트렌드 키워드 저장
 */
export async function saveTrendingKeywords(
  keywords: TrendingKeyword[]
): Promise<void> {
  const query = `
    INSERT INTO trending_keywords 
    (keyword, rank, search_volume, change_rate, is_new, category, collected_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `;

  for (const kw of keywords) {
    await db.query(query, [
      kw.keyword,
      kw.rank,
      kw.searchVolume || 0,
      kw.changeRate || null,
      kw.isNew || false,
      kw.category || 'all',
    ]);
  }
}

/**
 * 키워드 이력 저장
 */
export async function saveKeywordHistory(
  keywords: TrendingKeyword[]
): Promise<void> {
  const query = `
    INSERT INTO keyword_history 
    (keyword, rank, search_volume, recorded_at)
    VALUES ($1, $2, $3, NOW())
  `;

  for (const kw of keywords) {
    await db.query(query, [
      kw.keyword,
      kw.rank,
      kw.searchVolume || 0,
    ]);
  }
}

/**
 * 최근 키워드 조회 (시간 범위별)
 */
export async function getRecentKeywords(
  timeFilter: Date,
  options: {
    category?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<TrendingKeyword[]> {
  const { category = 'all', limit = 20, offset = 0 } = options;
  
  const categoryFilter = category !== 'all' ? 'AND category = $4' : '';
  
  const query = `
    SELECT 
      id,
      keyword,
      rank,
      search_volume as "searchVolume",
      change_rate as "changeRate",
      is_new as "isNew",
      category,
      collected_at as "collectedAt",
      created_at as "createdAt"
    FROM trending_keywords
    WHERE collected_at >= $1
    ${categoryFilter}
    ORDER BY rank ASC
    LIMIT $2 OFFSET $3
  `;
  
  const values = category !== 'all'
    ? [timeFilter, limit, offset, category]
    : [timeFilter, limit, offset];
  
  return await db.query(query, values);
}

/**
 * 최신 키워드 조회
 */
export async function getLatestKeywords(
  limit: number = 20
): Promise<TrendingKeyword[]> {
  const query = `
    SELECT DISTINCT ON (keyword)
      id,
      keyword,
      rank,
      search_volume as "searchVolume",
      change_rate as "changeRate",
      is_new as "isNew",
      category,
      collected_at as "collectedAt",
      created_at as "createdAt"
    FROM trending_keywords
    ORDER BY keyword, collected_at DESC
    LIMIT $1
  `;
  
  return await db.query(query, [limit]);
}

/**
 * 키워드 이력 조회
 */
export async function getKeywordHistory(
  keyword: string,
  startDate: Date,
  endDate: Date
): Promise<KeywordHistory[]> {
  const query = `
    SELECT
      id,
      keyword,
      rank,
      search_volume as "searchVolume",
      recorded_at as "recordedAt",
      created_at as "createdAt"
    FROM keyword_history
    WHERE keyword = $1
      AND recorded_at >= $2
      AND recorded_at <= $3
    ORDER BY recorded_at DESC
  `;

  return await db.query(query, [keyword, startDate, endDate]);
}

/**
 * 이전 순위 조회 (변동률 계산용)
 */
export async function getPreviousRankings(
  hoursAgo: number = 1
): Promise<Array<{ keyword: string; rank: number }>> {
  const query = `
    SELECT DISTINCT ON (keyword)
      keyword,
      rank
    FROM trending_keywords
    WHERE collected_at >= NOW() - INTERVAL '${hoursAgo} hours'
      AND collected_at < NOW() - INTERVAL '${hoursAgo - 1} hours'
    ORDER BY keyword, collected_at DESC
  `;

  return await db.query(query);
}

/**
 * 최근 24시간 키워드 목록 조회 (신규 키워드 감지용)
 */
export async function getRecentKeywordList(
  hoursAgo: number = 24
): Promise<string[]> {
  const query = `
    SELECT DISTINCT keyword
    FROM trending_keywords
    WHERE collected_at >= NOW() - INTERVAL '${hoursAgo} hours'
  `;

  const rows = await db.query(query);
  return rows.map((row: any) => row.keyword);
}

/**
 * 일별 통계 조회
 */
export async function getDailyStats(date: string): Promise<DailyStats | null> {
  const query = `
    SELECT
      id,
      stats_date as "statsDate",
      total_keywords as "totalKeywords",
      new_keywords as "newKeywords",
      avg_search_volume as "avgSearchVolume",
      top_keyword as "topKeyword",
      category_distribution as "categoryDistribution",
      created_at as "createdAt"
    FROM daily_stats
    WHERE stats_date = $1
  `;

  return await db.queryOne(query, [date]);
}

/**
 * 통계 직접 계산 (캐시 미스 시)
 */
export async function calculateDailyStats(date: string): Promise<DailyStats> {
  const query = `
    SELECT 
      COUNT(DISTINCT keyword) as "totalKeywords",
      COUNT(DISTINCT CASE WHEN is_new = true THEN keyword END) as "newKeywords",
      COALESCE(AVG(search_volume), 0)::BIGINT as "avgSearchVolume",
      (
        SELECT keyword
        FROM trending_keywords
        WHERE DATE(collected_at) = $1
        GROUP BY keyword
        ORDER BY COUNT(*) DESC
        LIMIT 1
      ) as "topKeyword",
      (
        SELECT jsonb_object_agg(category, cnt)
        FROM (
          SELECT category, COUNT(*) as cnt
          FROM trending_keywords
          WHERE DATE(collected_at) = $1
          GROUP BY category
        ) cat_counts
      ) as "categoryDistribution"
    FROM trending_keywords
    WHERE DATE(collected_at) = $1
  `;

  const result = await db.queryOne(query, [date]);
  
  return {
    statsDate: date,
    totalKeywords: parseInt(result?.totalKeywords || '0'),
    newKeywords: parseInt(result?.newKeywords || '0'),
    avgSearchVolume: parseInt(result?.avgSearchVolume || '0'),
    topKeyword: result?.topKeyword || null,
    categoryDistribution: result?.categoryDistribution || {},
  };
}

/**
 * 수집 로그 저장
 */
export async function saveCollectionLog(
  status: 'success' | 'failed',
  keywordsCount: number,
  durationMs: number,
  errorMessage?: string
): Promise<void> {
  const query = `
    INSERT INTO collection_logs 
    (status, keywords_count, duration_ms, error_message)
    VALUES ($1, $2, $3, $4)
  `;

  await db.query(query, [status, keywordsCount, durationMs, errorMessage || null]);
}

/**
 * 최근 수집 로그 조회
 */
export async function getRecentCollectionLogs(
  limit: number = 10
): Promise<CollectionLog[]> {
  const query = `
    SELECT
      id,
      status,
      keywords_count as "keywordsCount",
      error_message as "errorMessage",
      duration_ms as "durationMs",
      collected_at as "collectedAt"
    FROM collection_logs
    ORDER BY collected_at DESC
    LIMIT $1
  `;

  return await db.query(query, [limit]);
}

/**
 * 오래된 이력 데이터 정리
 */
export async function cleanupOldHistory(daysAgo: number = 30): Promise<number> {
  const query = `
    DELETE FROM keyword_history
    WHERE recorded_at < NOW() - INTERVAL '${daysAgo} days'
  `;

  const result = await db.query(query);
  return result.length;
}

/**
 * 키워드 검색
 */
export async function searchKeywords(
  searchTerm: string,
  limit: number = 20
): Promise<TrendingKeyword[]> {
  const query = `
    SELECT DISTINCT ON (keyword)
      id,
      keyword,
      rank,
      search_volume as "searchVolume",
      change_rate as "changeRate",
      is_new as "isNew",
      category,
      collected_at as "collectedAt"
    FROM trending_keywords
    WHERE keyword ILIKE $1
    ORDER BY keyword, collected_at DESC
    LIMIT $2
  `;

  return await db.query(query, [`%${searchTerm}%`, limit]);
}


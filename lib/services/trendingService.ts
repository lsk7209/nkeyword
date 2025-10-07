// 트렌드 키워드 비즈니스 로직 서비스

import {
  getRecentKeywords,
  getLatestKeywords,
  getKeywordHistory,
  getDailyStats,
  calculateDailyStats,
  searchKeywords,
} from '@/lib/db/queries';
import { cache, CacheTTL, createCacheKey } from '@/lib/services/cacheService';
import { logger } from '@/lib/utils/logger';
import type {
  TrendingKeyword,
  KeywordHistory,
  KeywordStats,
  DailyStats,
  GetKeywordsParams,
  GetHistoryParams,
  TimeRange,
} from '@/lib/types/trending';

/**
 * 트렌드 키워드 서비스
 */
export class TrendingService {
  /**
   * 키워드 목록 조회
   */
  static async getKeywords(params: GetKeywordsParams = {}): Promise<{
    keywords: TrendingKeyword[];
    total: number;
    lastUpdated: string;
    fromCache: boolean;
  }> {
    const {
      limit = 20,
      offset = 0,
      timeRange = 'realtime',
      category = 'all',
      sortBy = 'rank',
    } = params;

    logger.debug('[TrendingService] Getting keywords', params);

    // 캐시 확인
    const cacheKey = createCacheKey('trending', timeRange, category, limit, offset, sortBy);
    const cached = await cache.get<any>(cacheKey);
    
    if (cached) {
      logger.debug('[TrendingService] Cache hit', { key: cacheKey });
      return { ...cached, fromCache: true };
    }

    try {
      // DB 조회
      const timeFilter = this.getTimeFilter(timeRange);
      let keywords: TrendingKeyword[];

      if (timeRange === 'realtime') {
        keywords = await getLatestKeywords(limit);
      } else {
        keywords = await getRecentKeywords(timeFilter, { category, limit, offset });
      }

      // 정렬
      if (sortBy === 'searchVolume') {
        keywords.sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));
      }

      const result = {
        keywords,
        total: keywords.length,
        lastUpdated: keywords[0]?.collectedAt || new Date().toISOString(),
        fromCache: false,
      };

      // 캐시 저장 (5분)
      await cache.set(cacheKey, result, CacheTTL.MEDIUM);
      
      logger.debug('[TrendingService] Keywords fetched from DB', { count: keywords.length });

      return result;
    } catch (error) {
      logger.error('[TrendingService] Failed to get keywords', error);
      throw error;
    }
  }

  /**
   * 키워드 이력 조회
   */
  static async getHistory(
    keyword: string,
    params: GetHistoryParams = {}
  ): Promise<{
    keyword: string;
    history: KeywordHistory[];
    stats: KeywordStats | null;
  }> {
    const {
      startDate,
      endDate,
      interval = 'hourly',
    } = params;

    logger.debug('[TrendingService] Getting history', { keyword, ...params });

    // 캐시 확인
    const cacheKey = createCacheKey('history', keyword, startDate || '', endDate || '', interval);
    const cached = await cache.get<any>(cacheKey);
    
    if (cached) {
      logger.debug('[TrendingService] History cache hit', { keyword });
      return cached;
    }

    try {
      // 날짜 범위 설정 (기본: 최근 7일)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // DB 조회
      const history = await getKeywordHistory(keyword, start, end);

      // 통계 계산
      const stats = this.calculateStats(history);

      const result = { keyword, history, stats };

      // 캐시 저장 (15분)
      await cache.set(cacheKey, result, CacheTTL.LONG);
      
      logger.debug('[TrendingService] History fetched', {
        keyword,
        records: history.length,
      });

      return result;
    } catch (error) {
      logger.error('[TrendingService] Failed to get history', error, { keyword });
      throw error;
    }
  }

  /**
   * 통계 조회
   */
  static async getStats(date?: string): Promise<DailyStats> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    logger.debug('[TrendingService] Getting stats', { date: targetDate });

    // 캐시 확인
    const cacheKey = createCacheKey('stats', targetDate);
    const cached = await cache.get<DailyStats>(cacheKey);
    
    if (cached) {
      logger.debug('[TrendingService] Stats cache hit', { date: targetDate });
      return cached;
    }

    try {
      // DB에서 저장된 통계 조회
      let stats = await getDailyStats(targetDate);

      // 없으면 실시간 계산
      if (!stats) {
        logger.debug('[TrendingService] Stats not found, calculating...', { date: targetDate });
        stats = await calculateDailyStats(targetDate);
      }

      // 캐시 저장 (1시간)
      await cache.set(cacheKey, stats, CacheTTL.HOUR);
      
      logger.debug('[TrendingService] Stats fetched', { date: targetDate });

      return stats;
    } catch (error) {
      logger.error('[TrendingService] Failed to get stats', error, { date: targetDate });
      throw error;
    }
  }

  /**
   * 키워드 검색
   */
  static async searchKeywordsByTerm(
    searchTerm: string,
    limit: number = 20
  ): Promise<TrendingKeyword[]> {
    logger.debug('[TrendingService] Searching keywords', { searchTerm, limit });

    try {
      const keywords = await searchKeywords(searchTerm, limit);
      
      logger.debug('[TrendingService] Search completed', {
        searchTerm,
        results: keywords.length,
      });

      return keywords;
    } catch (error) {
      logger.error('[TrendingService] Search failed', error, { searchTerm });
      throw error;
    }
  }

  /**
   * 캐시 무효화
   */
  static async invalidateCache(pattern?: string): Promise<number> {
    try {
      if (pattern) {
        const deleted = await cache.deletePattern(pattern);
        logger.info('[TrendingService] Cache invalidated', { pattern, deleted });
        return deleted;
      } else {
        await cache.clear();
        logger.info('[TrendingService] All cache cleared');
        return -1;
      }
    } catch (error) {
      logger.error('[TrendingService] Cache invalidation failed', error);
      throw error;
    }
  }

  // ===== Helper Methods =====

  /**
   * 시간 필터 계산
   */
  private static getTimeFilter(timeRange: TimeRange): Date {
    const now = new Date();
    
    switch (timeRange) {
      case 'realtime':
        return new Date(now.getTime() - 60 * 60 * 1000); // 1시간
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24시간
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7일
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30일
      default:
        return new Date(now.getTime() - 60 * 60 * 1000);
    }
  }

  /**
   * 키워드 통계 계산
   */
  private static calculateStats(history: KeywordHistory[]): KeywordStats | null {
    if (history.length === 0) {
      return null;
    }

    const ranks = history
      .map(h => h.rank)
      .filter((r): r is number => r !== undefined);
    
    const volumes = history
      .map(h => h.searchVolume)
      .filter((v): v is number => v !== undefined);

    if (ranks.length === 0) {
      return null;
    }

    return {
      highestRank: Math.min(...ranks),
      lowestRank: Math.max(...ranks),
      avgSearchVolume: volumes.length > 0
        ? Math.floor(volumes.reduce((a, b) => a + b, 0) / volumes.length)
        : 0,
      totalAppearances: history.length,
    };
  }
}


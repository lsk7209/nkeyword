// 스케줄러 배치 작업

import { TrendCollectorFactory } from '@/lib/services/trendCollectorFactory';
import {
  saveTrendingKeywords,
  saveKeywordHistory,
  saveCollectionLog,
} from '@/lib/db/queries';
import { cache } from '@/lib/services/cacheService';
import { logger } from '@/lib/utils/logger';
import type { CollectionResult } from '@/lib/types/trending';

/**
 * 트렌드 키워드 수집 작업
 */
export async function collectTrendingKeywordsJob(): Promise<CollectionResult> {
  logger.info('[SCHEDULER] Starting keyword collection job...');
  
  const startTime = Date.now();
  
  try {
    const collector = TrendCollectorFactory.create();
    
    // 1. 키워드 수집
    logger.info('[SCHEDULER] Step 1: Collecting keywords...');
    const keywords = await collector.collectTrendingKeywords();
    
    if (keywords.length === 0) {
      throw new Error('No keywords collected');
    }
    
    logger.info('[SCHEDULER] Collected keywords', { count: keywords.length });
    
    // 2. DB 저장
    logger.info('[SCHEDULER] Step 2: Saving keywords to database...');
    await saveTrendingKeywords(keywords);
    logger.info('[SCHEDULER] Keywords saved');
    
    // 3. 이력 저장
    logger.info('[SCHEDULER] Step 3: Saving keyword history...');
    await saveKeywordHistory(keywords);
    logger.info('[SCHEDULER] History saved');
    
    // 4. 캐시 무효화
    logger.info('[SCHEDULER] Step 4: Invalidating cache...');
    await cache.deletePattern('trending:.*');
    logger.info('[SCHEDULER] Cache invalidated');
    
    // 5. 성공 로그 저장
    const duration = Date.now() - startTime;
    await saveCollectionLog('success', keywords.length, duration);
    
    const result: CollectionResult = {
      success: true,
      count: keywords.length,
      duration,
      newKeywords: keywords.filter((k: any) => k.isNew).length,
      timestamp: new Date().toISOString(),
    };
    
    logger.info('[SCHEDULER] Collection job completed successfully', result);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('[SCHEDULER] Collection job failed', error, { duration });
    
    // 실패 로그 저장
    try {
      await saveCollectionLog('failed', 0, duration, errorMessage);
    } catch (logError) {
      logger.error('[SCHEDULER] Failed to save error log', logError);
    }
    
    throw error;
  }
}

/**
 * 오래된 데이터 정리 작업
 */
export async function cleanupOldDataJob(): Promise<void> {
  logger.info('[SCHEDULER] Starting cleanup job...');
  
  try {
    const { cleanupOldHistory } = await import('@/lib/db/queries');
    
    // 30일 이상 된 이력 삭제
    const deleted = await cleanupOldHistory(30);
    
    logger.info('[SCHEDULER] Cleanup job completed', { deleted });
  } catch (error) {
    logger.error('[SCHEDULER] Cleanup job failed', error);
    throw error;
  }
}

/**
 * 일별 통계 업데이트 작업
 */
export async function updateDailyStatsJob(): Promise<void> {
  logger.info('[SCHEDULER] Starting daily stats update job...');
  
  try {
    const { db } = await import('@/lib/db/client');
    
    // 전날 통계 업데이트
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    await db.query('SELECT update_daily_stats($1)', [dateStr]);
    
    logger.info('[SCHEDULER] Daily stats updated', { date: dateStr });
  } catch (error) {
    logger.error('[SCHEDULER] Daily stats update failed', error);
    throw error;
  }
}

/**
 * 🆕 문서수 자동 수집 작업
 * - LocalStorage의 모든 키워드에 대해 문서수 수집
 * - 문서수가 없는 키워드만 수집
 */
export async function autoCollectDocumentCountsJob(): Promise<{
  success: boolean;
  collected: number;
  failed: number;
  duration: number;
}> {
  logger.info('[SCHEDULER] Starting auto document count collection job...');
  
  const startTime = Date.now();
  let collected = 0;
  let failed = 0;
  
  try {
    // 1. LocalStorage에서 키워드 로드 (서버 사이드에서는 불가능)
    // 대신 API를 통해 수집 트리거
    logger.info('[SCHEDULER] Triggering document count collection via API...');
    
    // 내부 API 호출
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/documents/auto-collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'development'}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const result = await response.json();
    collected = result.data?.collected || 0;
    failed = result.data?.failed || 0;
    
    const duration = Date.now() - startTime;
    
    logger.info('[SCHEDULER] Auto document count collection completed', {
      collected,
      failed,
      duration,
    });
    
    return {
      success: true,
      collected,
      failed,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[SCHEDULER] Auto document count collection failed', error);
    
    return {
      success: false,
      collected,
      failed: failed + 1,
      duration,
    };
  }
}

/**
 * 스케줄러 상태 확인
 */
export async function getSchedulerStatus(): Promise<{
  isHealthy: boolean;
  lastCollection?: string;
  totalCollections: number;
  failedCollections: number;
}> {
  try {
    const { getRecentCollectionLogs } = await import('@/lib/db/queries');
    
    const recentLogs = await getRecentCollectionLogs(10);
    
    return {
      isHealthy: recentLogs[0]?.status === 'success',
      lastCollection: recentLogs[0]?.collectedAt || undefined,
      totalCollections: recentLogs.length,
      failedCollections: recentLogs.filter(log => log.status === 'failed').length,
    };
  } catch (error) {
    logger.error('[SCHEDULER] Failed to get status', error);
    return {
      isHealthy: false,
      totalCollections: 0,
      failedCollections: 0,
    };
  }
}


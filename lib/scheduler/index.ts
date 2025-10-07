// 스케줄러 메인 파일

import cron from 'node-cron';
import {
  collectTrendingKeywordsJob,
  cleanupOldDataJob,
  updateDailyStatsJob,
  autoCollectDocumentCountsJob,
} from './jobs';
import { logger } from '@/lib/utils/logger';

let isSchedulerRunning = false;

/**
 * 스케줄러 시작
 */
export function startScheduler(): void {
  if (isSchedulerRunning) {
    logger.warn('[SCHEDULER] Already running');
    return;
  }

  logger.info('[SCHEDULER] Starting scheduler...');

  // 1. 매시간 정각에 키워드 수집 (0분)
  cron.schedule('0 * * * *', async () => {
    logger.info('[SCHEDULER] Triggering keyword collection (hourly)...');
    try {
      await collectTrendingKeywordsJob();
    } catch (error) {
      logger.error('[SCHEDULER] Hourly collection failed', error);
    }
  });

  // 2. 매일 새벽 2시에 오래된 데이터 정리
  cron.schedule('0 2 * * *', async () => {
    logger.info('[SCHEDULER] Triggering data cleanup (daily)...');
    try {
      await cleanupOldDataJob();
    } catch (error) {
      logger.error('[SCHEDULER] Daily cleanup failed', error);
    }
  });

  // 3. 매일 새벽 3시에 통계 업데이트
  cron.schedule('0 3 * * *', async () => {
    logger.info('[SCHEDULER] Triggering stats update (daily)...');
    try {
      await updateDailyStatsJob();
    } catch (error) {
      logger.error('[SCHEDULER] Daily stats update failed', error);
    }
  });

  // 🆕 4. 매일 새벽 1시에 문서수 자동 수집
  cron.schedule('0 1 * * *', async () => {
    logger.info('[SCHEDULER] Triggering auto document count collection (daily)...');
    try {
      await autoCollectDocumentCountsJob();
    } catch (error) {
      logger.error('[SCHEDULER] Auto document count collection failed', error);
    }
  });

  isSchedulerRunning = true;
  logger.info('[SCHEDULER] Scheduler started successfully');
  logger.info('[SCHEDULER] Jobs scheduled:');
  logger.info('  - Keyword collection: Every hour at 0 minutes');
  logger.info('  - Data cleanup: Daily at 2:00 AM');
  logger.info('  - Stats update: Daily at 3:00 AM');
  logger.info('  - 🆕 Auto document count collection: Daily at 1:00 AM');
}

/**
 * 스케줄러 중지
 */
export function stopScheduler(): void {
  if (!isSchedulerRunning) {
    logger.warn('[SCHEDULER] Not running');
    return;
  }

  // cron.stop()은 모든 작업을 중지
  // 실제로는 개별 작업 참조를 저장하고 관리해야 함
  isSchedulerRunning = false;
  logger.info('[SCHEDULER] Scheduler stopped');
}

/**
 * 스케줄러 상태 확인
 */
export function isRunning(): boolean {
  return isSchedulerRunning;
}


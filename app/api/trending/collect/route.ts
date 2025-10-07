// POST /api/trending/collect - 키워드 수집 트리거 (내부 API)

import { NextRequest, NextResponse } from 'next/server';
import { collectTrendingKeywordsJob } from '@/lib/scheduler/jobs';
import { logger, logApiRequest } from '@/lib/utils/logger';
import type { ApiResponse } from '@/lib/types/trending';

export const dynamic = 'force-dynamic';

/**
 * 트렌드 키워드 수집 트리거 (CRON 또는 관리자용)
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[API] Unauthorized collection attempt');
      
      const response: ApiResponse = {
        status: 'error',
        message: 'Unauthorized',
      };
      
      return NextResponse.json(response, { status: 401 });
    }

    logger.info('[API] POST /api/trending/collect - Starting collection...');

    // 수집 작업 실행
    const result = await collectTrendingKeywordsJob();

    const response: ApiResponse = {
      status: 'success',
      data: result,
      message: 'Collection completed successfully',
    };

    const duration = Date.now() - start;
    logApiRequest('POST', '/api/trending/collect', 200, duration);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('[API] POST /api/trending/collect failed', error);
    logApiRequest('POST', '/api/trending/collect', 500, duration);

    const response: ApiResponse = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Collection failed',
    };

    return NextResponse.json(response, { status: 500 });
  }
}


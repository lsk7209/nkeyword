// GET /api/trending/stats - 트렌드 통계 조회

import { NextRequest, NextResponse } from 'next/server';
import { TrendingService } from '@/lib/services/trendingService';
import { logger, logApiRequest } from '@/lib/utils/logger';
import type { ApiResponse } from '@/lib/types/trending';

export const dynamic = 'force-dynamic';

/**
 * 트렌드 통계 조회
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || undefined;

    logger.info('[API] GET /api/trending/stats', { date });

    // 서비스 호출
    const stats = await TrendingService.getStats(date);

    const response: ApiResponse = {
      status: 'success',
      data: stats,
    };

    const duration = Date.now() - start;
    logApiRequest('GET', '/api/trending/stats', 200, duration);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('[API] GET /api/trending/stats failed', error);
    logApiRequest('GET', '/api/trending/stats', 500, duration);

    const response: ApiResponse = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch stats',
    };

    return NextResponse.json(response, { status: 500 });
  }
}


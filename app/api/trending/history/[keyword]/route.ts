// GET /api/trending/history/:keyword - 키워드 이력 조회

import { NextRequest, NextResponse } from 'next/server';
import { TrendingService } from '@/lib/services/trendingService';
import { logger, logApiRequest } from '@/lib/utils/logger';
import type { ApiResponse, GetHistoryParams } from '@/lib/types/trending';

export const dynamic = 'force-dynamic';

/**
 * 키워드 이력 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { keyword: string } }
) {
  const start = Date.now();
  const keyword = decodeURIComponent(params.keyword);
  
  try {
    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const historyParams: GetHistoryParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      interval: (searchParams.get('interval') as any) || 'hourly',
    };

    logger.info('[API] GET /api/trending/history/:keyword', { keyword, ...historyParams });

    // 서비스 호출
    const result = await TrendingService.getHistory(keyword, historyParams);

    const response: ApiResponse = {
      status: 'success',
      data: result,
    };

    const duration = Date.now() - start;
    logApiRequest('GET', `/api/trending/history/${keyword}`, 200, duration);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('[API] GET /api/trending/history/:keyword failed', error, { keyword });
    logApiRequest('GET', `/api/trending/history/${keyword}`, 500, duration);

    const response: ApiResponse = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch keyword history',
    };

    return NextResponse.json(response, { status: 500 });
  }
}


// GET /api/trending/keywords - 트렌드 키워드 목록 조회

import { NextRequest, NextResponse } from 'next/server';
import { TrendingService } from '@/lib/services/trendingService';
import { logger, logApiRequest } from '@/lib/utils/logger';
import type { ApiResponse, GetKeywordsParams } from '@/lib/types/trending';

export const dynamic = 'force-dynamic';

/**
 * 트렌드 키워드 목록 조회
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const params: GetKeywordsParams = {
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      offset: parseInt(searchParams.get('offset') || '0'),
      timeRange: (searchParams.get('timeRange') as any) || 'realtime',
      category: searchParams.get('category') || 'all',
      sortBy: (searchParams.get('sortBy') as any) || 'rank',
    };

    logger.info('[API] GET /api/trending/keywords', params);

    // 서비스 호출
    const result = await TrendingService.getKeywords(params);

    const response: ApiResponse = {
      status: 'success',
      data: {
        lastUpdated: result.lastUpdated,
        keywords: result.keywords,
      },
      meta: {
        limit: params.limit,
        offset: params.offset,
        total: result.total,
      },
    };

    const duration = Date.now() - start;
    logApiRequest('GET', '/api/trending/keywords', 200, duration);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('[API] GET /api/trending/keywords failed', error);
    logApiRequest('GET', '/api/trending/keywords', 500, duration);

    const response: ApiResponse = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch keywords',
    };

    return NextResponse.json(response, { status: 500 });
  }
}


// GET /api/trending/search - 키워드 검색

import { NextRequest, NextResponse } from 'next/server';
import { TrendingService } from '@/lib/services/trendingService';
import { logger, logApiRequest } from '@/lib/utils/logger';
import type { ApiResponse } from '@/lib/types/trending';

export const dynamic = 'force-dynamic';

/**
 * 키워드 검색
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('query');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    if (!query) {
      const response: ApiResponse = {
        status: 'error',
        message: 'Query parameter is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    logger.info('[API] GET /api/trending/search', { query, limit });

    // 서비스 호출
    const keywords = await TrendingService.searchKeywordsByTerm(query, limit);

    const response: ApiResponse = {
      status: 'success',
      data: {
        query,
        keywords,
      },
      meta: {
        total: keywords.length,
      },
    };

    const duration = Date.now() - start;
    logApiRequest('GET', '/api/trending/search', 200, duration);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('[API] GET /api/trending/search failed', error);
    logApiRequest('GET', '/api/trending/search', 500, duration);

    const response: ApiResponse = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Search failed',
    };

    return NextResponse.json(response, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getNextOpenApiKey, OPEN_API_KEYS } from '@/lib/api-keys';

const NAVER_SEARCH_BASE = 'https://openapi.naver.com/v1/search';

async function getDocumentCount(
  endpoint: string,
  query: string,
  clientId: string,
  clientSecret: string
): Promise<number | null> {
  try {
    const searchParams = new URLSearchParams({
      query,
      display: '1', // 최소한의 데이터만 요청
    });

    const response = await fetch(`${NAVER_SEARCH_BASE}${endpoint}?${searchParams}`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      console.error(`Document count error for ${endpoint}:`, response.status);
      return null;
    }

    const data = await response.json();
    return data.total || 0;
  } catch (error) {
    console.error(`Error getting document count ${endpoint}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('keyword');

  if (!keyword) {
    return NextResponse.json(
      { success: false, error: '키워드를 입력해주세요' },
      { status: 400 }
    );
  }

  // 오픈 API 키 로테이션으로 가져오기
  const apiKey = getNextOpenApiKey();
  
  try {
    // 병렬로 4개 카테고리 문서수 조회
    const [blogCount, cafeCount, newsCount, webkrCount] = await Promise.all([
      getDocumentCount('/blog.json', keyword, apiKey.client_id, apiKey.client_secret),
      getDocumentCount('/cafearticle.json', keyword, apiKey.client_id, apiKey.client_secret),
      getDocumentCount('/news.json', keyword, apiKey.client_id, apiKey.client_secret),
      getDocumentCount('/webkr.json', keyword, apiKey.client_id, apiKey.client_secret),
    ]);

    console.log(`[문서수 API] 성공 - ${apiKey.name}, 키워드: ${keyword}`);

    return NextResponse.json({
      success: true,
      keyword,
      counts: {
        blog: blogCount,
        cafe: cafeCount,
        news: newsCount,
        webkr: webkrCount,
      },
    });
  } catch (error) {
    console.error('[문서수 API] 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: '문서수 조회에 실패했습니다',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}


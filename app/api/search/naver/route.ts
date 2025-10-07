import { NextRequest, NextResponse } from 'next/server';
import type { NaverSearchApiResponse, NaverSearchResponse } from '@/lib/types';
import { getNextOpenApiKey } from '@/lib/api-keys';

const NAVER_SEARCH_BASE = 'https://openapi.naver.com/v1/search';

async function searchNaverAPI(
  endpoint: string,
  query: string,
  clientId: string,
  clientSecret: string,
  params: Record<string, string> = {}
): Promise<NaverSearchResponse | null> {
  try {
    const searchParams = new URLSearchParams({
      query,
      display: '10',
      ...params,
    });

    const response = await fetch(`${NAVER_SEARCH_BASE}${endpoint}?${searchParams}`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      console.error(`Naver Search API error for ${endpoint}:`, response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error calling Naver Search API ${endpoint}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json(
      { success: false, error: '검색어를 입력해주세요' },
      { status: 400 }
    );
  }

  // 오픈 API 키 로테이션으로 가져오기
  const apiKey = getNextOpenApiKey();

  try {
    console.log(`[검색 API] 사용 - ${apiKey.name}, 검색어: ${query}`);
    
    // 병렬로 여러 검색 API 호출
    const [blog, news, book, kin, shop, webkr, cafe, local, image] = await Promise.all([
      searchNaverAPI('/blog.json', query, apiKey.client_id, apiKey.client_secret, { sort: 'sim' }),
      searchNaverAPI('/news.json', query, apiKey.client_id, apiKey.client_secret, { sort: 'sim' }),
      searchNaverAPI('/book.json', query, apiKey.client_id, apiKey.client_secret, { sort: 'sim' }),
      searchNaverAPI('/kin.json', query, apiKey.client_id, apiKey.client_secret),
      searchNaverAPI('/shop.json', query, apiKey.client_id, apiKey.client_secret, { sort: 'sim' }),
      searchNaverAPI('/webkr.json', query, apiKey.client_id, apiKey.client_secret),
      searchNaverAPI('/cafearticle.json', query, apiKey.client_id, apiKey.client_secret, { sort: 'sim' }),
      searchNaverAPI('/local.json', query, apiKey.client_id, apiKey.client_secret, { display: '5' }),
      searchNaverAPI('/image', query, apiKey.client_id, apiKey.client_secret, { sort: 'sim' }),
    ]);

    const results: NaverSearchApiResponse['results'] = {};
    const totals: NaverSearchApiResponse['totals'] = {};

    if (blog?.items) results.blog = blog.items;
    if (news?.items) results.news = news.items;
    if (book?.items) results.book = book.items;
    if (kin?.items) results.kin = kin.items;
    if (shop?.items) results.shop = shop.items;
    if (webkr?.items) results.webkr = webkr.items;
    if (cafe?.items) results.cafe = cafe.items;
    if (local?.items) results.local = local.items;
    if (image?.items) results.image = image.items;

    // 전체 문서수 저장
    if (blog) totals.blog = blog.total;
    if (news) totals.news = news.total;
    if (book) totals.book = book.total;
    if (kin) totals.kin = kin.total;
    if (shop) totals.shop = shop.total;
    if (webkr) totals.webkr = webkr.total;
    if (cafe) totals.cafe = cafe.total;
    if (local) totals.local = local.total;
    if (image) totals.image = image.total;

    return NextResponse.json({
      success: true,
      query,
      results,
      totals,
    });
  } catch (error) {
    console.error('Naver Search API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '네이버 검색 API 호출에 실패했습니다',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

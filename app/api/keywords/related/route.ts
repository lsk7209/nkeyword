import { NextRequest, NextResponse } from 'next/server';
import { createHeaders } from '@/lib/naver-api';
import { getNextSearchAdKey, SEARCH_AD_KEYS } from '@/lib/api-keys';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawKeyword = searchParams.get('keyword');
  const showDetail = searchParams.get('showDetail') ?? '1';

  if (!rawKeyword) {
    return NextResponse.json(
      { success: false, error: '키워드를 입력해주세요' },
      { status: 400 }
    );
  }

  // 🆕 공백을 모두 제거
  const keyword = rawKeyword.trim().replace(/\s+/g, '');
  
  if (!keyword) {
    return NextResponse.json(
      { success: false, error: '키워드를 입력해주세요' },
      { status: 400 }
    );
  }

  if (keyword.length > 50) {
    return NextResponse.json(
      { success: false, error: '키워드는 50자 이하로 입력해주세요' },
      { status: 400 }
    );
  }

  console.log(`[연관검색어 API] 원본: "${rawKeyword}" → 변환: "${keyword}"`);

  const method = 'GET';
  const uri = '/keywordstool';
  const params = new URLSearchParams({
    hintKeywords: keyword,
    showDetail,
  });

  // 모든 키를 순회하면서 시도
  let lastError: Error | null = null;
  
  for (let i = 0; i < SEARCH_AD_KEYS.length; i++) {
    try {
      const apiKey = getNextSearchAdKey();
      const headers = createHeaders(method, uri, apiKey);

      console.log(`[검색광고 API] 시도 ${i + 1}/${SEARCH_AD_KEYS.length} - ${apiKey.name}`);

      const response = await fetch(`https://api.naver.com${uri}?${params}`, {
        headers,
        cache: 'no-store',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`네이버 API 오류: ${response.status} ${text}`);
      }

      const data = await response.json();

      const list = Array.isArray(data.keywordList) ? data.keywordList : [];
      const keywords = list.map((item: any) => ({
        keyword: item.relKeyword,
        monthlyPcSearch: Number(item.monthlyPcQcCnt) || 0,
        monthlyMobileSearch: Number(item.monthlyMobileQcCnt) || 0,
        totalSearch:
          (Number(item.monthlyPcQcCnt) || 0) + (Number(item.monthlyMobileQcCnt) || 0),
        competition: item.compIdx || '정보없음',
        monthlyPcClicks: Number(item.monthlyAvePcClkCnt) || 0,
        monthlyMobileClicks: Number(item.monthlyAveMobileClkCnt) || 0,
        monthlyPcClickRate: Number(item.monthlyAvePcCtr) || 0,
        monthlyMobileClickRate: Number(item.monthlyAveMobileCtr) || 0,
        monthlyAdCount: Number(item.plAvgDepth) || 0,
      }));

      console.log(`[검색광고 API] 성공 - ${apiKey.name}, 키워드 ${keywords.length}개`);

      return NextResponse.json({
        success: true,
        keyword,
        total: keywords.length,
        keywords,
      });
    } catch (error) {
      console.error(`[검색광고 API] 실패 ${i + 1}/${SEARCH_AD_KEYS.length}:`, error);
      lastError = error instanceof Error ? error : new Error('알 수 없는 오류');
      
      // 다음 키로 재시도
      continue;
    }
  }

  // 모든 키 시도 실패
  console.error('[검색광고 API] 모든 키 시도 실패');
  return NextResponse.json(
    {
      success: false,
      error: '연관검색어 조회에 실패했습니다',
      details: lastError?.message || '모든 API 키 시도 실패',
    },
    { status: 500 }
  );
}



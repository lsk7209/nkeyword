import { NextRequest, NextResponse } from 'next/server';
import { getNextSearchAdKey } from '@/lib/api-keys';
import { createHeaders } from '@/lib/naver-api';
import { canCollectKeyword, recordCollection } from '@/lib/keyword-collection-tracker';

/**
 * 자동 연관검색어 수집 API (순환 참조 방지 강화)
 * 시드키워드를 받아서 연관검색어를 수집하고 반환
 */
export async function POST(request: NextRequest) {
  try {
    const { seedKeywords, depth = 0, parentKeyword = null, maxDepth = 10 } = await request.json();

    if (!seedKeywords || !Array.isArray(seedKeywords) || seedKeywords.length === 0) {
      return NextResponse.json(
        { success: false, error: '시드키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log(`[자동 수집] 시작: ${seedKeywords.length}개 시드, 깊이: ${depth}/${maxDepth}`);

    const allResults: any[] = [];
    const skippedKeywords: string[] = [];
    const method = 'GET';
    const uri = '/keywordstool';

    // 각 시드키워드에 대해 연관검색어 수집
    for (const seedKeyword of seedKeywords) {
      // 🚀 수집 가능 여부 확인 (순환 참조, 중복, 깊이 제한)
      const { canCollect, reason } = canCollectKeyword(seedKeyword, parentKeyword, depth, maxDepth);
      
      if (!canCollect) {
        console.log(`[자동 수집] ⏭️  ${seedKeyword} 건너뜀 - ${reason}`);
        skippedKeywords.push(seedKeyword);
        continue;
      }
      
      try {
        const apiKey = getNextSearchAdKey();
        const params = new URLSearchParams({
          hintKeywords: seedKeyword,
          showDetail: '1',
        });
        
        const headers = createHeaders(method, uri, apiKey);

        const response = await fetch(
          `https://api.naver.com${uri}?${params}`,
          {
            headers,
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          const text = await response.text();
          console.error(`[자동 수집] API 오류 (${seedKeyword}):`, response.status, text);
          continue;
        }

        const data = await response.json();
        const keywords = data.keywordList || [];

        // 결과에 시드 정보 추가
        const resultsWithSeed = keywords.map((kw: any) => ({
          keyword: kw.relKeyword,
          monthlyPcSearch: Number(kw.monthlyPcQcCnt) || 0,
          monthlyMobileSearch: Number(kw.monthlyMobileQcCnt) || 0,
          totalSearch: (Number(kw.monthlyPcQcCnt) || 0) + (Number(kw.monthlyMobileQcCnt) || 0),
          competition: kw.compIdx || '정보없음',
          monthlyPcClicks: Number(kw.monthlyAvePcClkCnt) || 0,
          monthlyMobileClicks: Number(kw.monthlyAveMobileClkCnt) || 0,
          monthlyPcClickRate: Number(kw.monthlyAvePcCtr) || 0,
          monthlyMobileClickRate: Number(kw.monthlyAveMobileCtr) || 0,
          monthlyAdCount: Number(kw.plAvgDepth) || 0,
          rootKeyword: seedKeyword,
          seedDepth: depth + 1,
        }));

        allResults.push(...resultsWithSeed);
        
        // 🚀 수집 이력 기록
        const childKeywords = resultsWithSeed.map((r: any) => r.keyword);
        recordCollection(seedKeyword, parentKeyword, depth, childKeywords);
        
        console.log(`[자동 수집] ✅ ${seedKeyword} - ${resultsWithSeed.length}개 수집 완료`);

        // API 호출 간격 (네이버 차단 방지)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[자동 수집] 키워드 처리 실패 (${seedKeyword}):`, error);
      }
    }

    console.log(`[자동 수집] 완료: ${allResults.length}개 수집, ${skippedKeywords.length}개 건너뜀`);

    return NextResponse.json({
      success: true,
      results: allResults,
      count: allResults.length,
      seedCount: seedKeywords.length,
      skippedCount: skippedKeywords.length,
      skippedKeywords: skippedKeywords.slice(0, 10), // 최대 10개만 표시
      depth: depth + 1,
    });
  } catch (error: any) {
    console.error('[자동 수집] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '자동 수집 실패' },
      { status: 500 }
    );
  }
}

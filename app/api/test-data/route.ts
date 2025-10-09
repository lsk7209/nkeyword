import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage-adapter';
import type { KeywordData } from '@/lib/types';

/**
 * 테스트 데이터 생성 API
 * Vercel에서 데이터가 보이지 않는 문제 해결을 위한 테스트 데이터
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'create') {
      // 테스트용 키워드 데이터 생성
      const testData: KeywordData[] = [
        {
          keyword: '반려로봇',
          monthlyPcSearch: 12000,
          monthlyMobileSearch: 18000,
          totalSearch: 30000,
          competition: '중',
          monthlyPcClicks: 2400,
          monthlyMobileClicks: 3600,
          monthlyPcClickRate: 20,
          monthlyMobileClickRate: 20,
          monthlyAdCount: 15,
          blogTotalCount: 2500,
          cafeTotalCount: 1800,
          newsTotalCount: 320,
          webkrTotalCount: 4500,
        },
        {
          keyword: '스마트홈',
          monthlyPcSearch: 25000,
          monthlyMobileSearch: 35000,
          totalSearch: 60000,
          competition: '높음',
          monthlyPcClicks: 5000,
          monthlyMobileClicks: 7000,
          monthlyPcClickRate: 20,
          monthlyMobileClickRate: 20,
          monthlyAdCount: 25,
          blogTotalCount: 5200,
          cafeTotalCount: 3800,
          newsTotalCount: 680,
          webkrTotalCount: 9200,
        },
        {
          keyword: 'AI 스피커',
          monthlyPcSearch: 8000,
          monthlyMobileSearch: 12000,
          totalSearch: 20000,
          competition: '중',
          monthlyPcClicks: 1600,
          monthlyMobileClicks: 2400,
          monthlyPcClickRate: 20,
          monthlyMobileClickRate: 20,
          monthlyAdCount: 12,
          blogTotalCount: 1800,
          cafeTotalCount: 1200,
          newsTotalCount: 280,
          webkrTotalCount: 3200,
        }
      ];
      
    // 저장소 어댑터를 통해 저장
    console.log('[테스트 데이터] 저장소 어댑터 가져오기 시작');
    const storageAdapter = getStorageAdapter();
    console.log('[테스트 데이터] 저장소 어댑터 타입:', storageAdapter.constructor.name);
    
    console.log('[테스트 데이터] 키워드 저장 시작');
    try {
      await storageAdapter.addKeywords(testData);
      console.log('[테스트 데이터] 키워드 저장 완료');
    } catch (error) {
      console.error('[테스트 데이터] 저장 오류:', error);
      console.error('[테스트 데이터] 오류 상세:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      
      // 더 상세한 오류 정보 반환
      return NextResponse.json({ 
        success: false, 
        error: '테스트 데이터 저장 실패',
        details: {
          message: error instanceof Error ? error.message : String(error),
          type: error instanceof Error ? error.name : 'Unknown'
        }
      }, { status: 500 });
    }
      
      console.log(`[테스트 데이터] 저장소에 ${testData.length}개 키워드 저장 완료`);
      console.log('[테스트 데이터] 저장된 데이터:', JSON.stringify(testData, null, 2));
      
      // 저장 후 즉시 확인
      const storedData = await storageAdapter.getKeywords();
      console.log(`[테스트 데이터] 저장 확인: ${storedData.length}개 키워드`);
      console.log('[테스트 데이터] 저장된 키워드들:', storedData.map((k: any) => k.keyword));
      
      return NextResponse.json({
        success: true,
        message: `${testData.length}개의 테스트 데이터가 생성되었습니다.`,
        data: testData
      });
    }
    
    return NextResponse.json({
      success: false,
      error: '지원하지 않는 작업입니다.'
    }, { status: 400 });
    
  } catch (error) {
    console.error('[테스트 데이터] 오류:', error);
    return NextResponse.json({
      success: false,
      error: '테스트 데이터 생성 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

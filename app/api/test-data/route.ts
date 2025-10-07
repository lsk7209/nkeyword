import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { setMemoryStorage } from '@/lib/memory-storage';

/**
 * 테스트 데이터 생성 API
 * Vercel에서 데이터가 보이지 않는 문제 해결을 위한 테스트 데이터
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'create') {
      // 테스트용 키워드 데이터 생성
      const testData = [
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
      
      // 메모리 저장소에 직접 저장
      setMemoryStorage(testData);
      
      console.log(`[테스트 데이터] 메모리 저장소에 ${testData.length}개 키워드 저장 완료`);
      console.log('[테스트 데이터] 저장된 데이터:', testData);
      
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

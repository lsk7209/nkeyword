import { NextRequest, NextResponse } from 'next/server';
import { getMemoryStorage } from '@/lib/memory-storage';

/**
 * 데이터 조회 API
 * 메모리 저장소에서 데이터를 조회
 */
export async function GET(request: NextRequest) {
  try {
    const data = getMemoryStorage();
    
    return NextResponse.json({
      success: true,
      data: data,
      count: data.length,
      stats: {
        total: data.length,
        withDocCounts: data.filter(item => 
          item.blogTotalCount || item.cafeTotalCount || item.newsTotalCount || item.webkrTotalCount
        ).length,
        withoutDocCounts: data.filter(item => 
          !item.blogTotalCount && !item.cafeTotalCount && !item.newsTotalCount && !item.webkrTotalCount
        ).length
      }
    });
    
  } catch (error) {
    console.error('[데이터 조회] 오류:', error);
    return NextResponse.json({
      success: false,
      error: '데이터 조회 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

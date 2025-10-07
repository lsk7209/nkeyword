import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage-adapter';
import type { KeywordData } from '@/lib/types';

/**
 * 데이터 조회 API
 * 메모리 저장소에서 데이터를 조회
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[데이터 조회] API 호출 시작');
    const storageAdapter = getStorageAdapter();
    const data: KeywordData[] = await storageAdapter.getKeywords();
    
    console.log(`[데이터 조회] 저장소에서 ${data.length}개 키워드 조회`);
    console.log('[데이터 조회] 조회된 데이터:', JSON.stringify(data, null, 2));
    
    if (data.length === 0) {
      console.log('[데이터 조회] ⚠️ 저장소가 비어있습니다');
    }
    
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

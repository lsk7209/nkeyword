import { NextResponse } from 'next/server';
import { clearDocumentCountCache } from '../batch/route';

export async function POST() {
  try {
    console.log('[캐시 초기화] 클라이언트 요청 수신');
    
    // 캐시 초기화
    const clearedCount = clearDocumentCountCache();
    
    return NextResponse.json({
      success: true,
      message: `캐시 초기화 완료: ${clearedCount}개 항목 삭제`,
      clearedCount,
    });
  } catch (error) {
    console.error('[캐시 초기화] 오류:', error);
    return NextResponse.json(
      { success: false, error: '캐시 초기화 실패' },
      { status: 500 }
    );
  }
}

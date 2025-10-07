import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage-adapter';

/**
 * 데이터 마이그레이션 API
 * LocalStorage 데이터를 Supabase로 마이그레이션
 */
export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();
    
    if (action === 'import') {
      // LocalStorage 데이터를 Supabase로 가져오기
      const storage = getStorageAdapter();
      
      if (data && Array.isArray(data) && data.length > 0) {
        await storage.addKeywords(data);
        
        return NextResponse.json({
          success: true,
          message: `${data.length}개 키워드가 성공적으로 가져와졌습니다.`,
          imported: data.length
        });
      } else {
        return NextResponse.json({
          success: false,
          error: '가져올 데이터가 없습니다.'
        }, { status: 400 });
      }
    }
    
    if (action === 'export') {
      // 현재 데이터 내보내기
      const storage = getStorageAdapter();
      const keywords = await storage.getKeywords();
      
      return NextResponse.json({
        success: true,
        data: keywords,
        count: keywords.length
      });
    }
    
    return NextResponse.json({
      success: false,
      error: '지원하지 않는 작업입니다.'
    }, { status: 400 });
    
  } catch (error) {
    console.error('[마이그레이션] 오류:', error);
    return NextResponse.json({
      success: false,
      error: '마이그레이션 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

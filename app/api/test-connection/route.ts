import { NextRequest, NextResponse } from 'next/server';
import { testConnection, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Supabase 연결 테스트 API
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[연결 테스트] 시작');
    
    // 환경 변수 확인
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.NEXT_PUBLIC_nkeywordSUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !!process.env.NEXT_PUBLIC_nkeywordSUPABASE_ANON_KEY,
      supabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      isConfigured: isSupabaseConfigured
    };
    
    console.log('[연결 테스트] 환경 변수 확인:', envCheck);
    
    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success: false,
        error: 'Supabase 환경 변수가 설정되지 않았습니다.',
        envCheck
      }, { status: 400 });
    }
    
    // 실제 연결 테스트
    const connectionResult = await testConnection();
    
    if (connectionResult) {
      console.log('[연결 테스트] ✅ 성공');
      return NextResponse.json({
        success: true,
        message: 'Supabase 연결 성공!',
        envCheck,
        connectionResult
      });
    } else {
      console.log('[연결 테스트] ❌ 실패');
      return NextResponse.json({
        success: false,
        error: 'Supabase 연결 실패',
        envCheck,
        connectionResult
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[연결 테스트] 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '연결 테스트 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

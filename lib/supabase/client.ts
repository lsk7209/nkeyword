/**
 * Supabase 클라이언트
 * Vercel 환경에서 영구 저장소로 사용
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_nkeywordSUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_nkeywordSUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase 설정 확인
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);

// 디버깅 로그
console.log('[Supabase] 환경 변수 확인:', {
  supabaseUrl: !!supabaseUrl,
  supabaseAnonKey: !!supabaseAnonKey,
  supabaseServiceRoleKey: !!supabaseServiceRoleKey,
  isConfigured: isSupabaseConfigured,
  urlValue: supabaseUrl?.substring(0, 30) + '...',
  anonKeyValue: supabaseAnonKey?.substring(0, 30) + '...'
});

// Supabase 클라이언트 생성
export const supabase: SupabaseClient<Database> = isSupabaseConfigured 
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : {} as SupabaseClient<Database>;

export const supabaseAdmin: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : {} as SupabaseClient<Database>;

// 연결 테스트
export async function testConnection() {
  if (!isSupabaseConfigured) {
    console.warn('[Supabase] 연결 테스트 건너김: 환경 변수가 설정되지 않았습니다.');
    return false;
  }

  try {
    const { data, error } = await supabase.from('keywords').select('count').limit(1);
    if (error) {
      console.error('[Supabase] 연결 테스트 실패:', error);
      return false;
    }
    console.log('[Supabase] 연결 테스트 성공');
    return true;
  } catch (error) {
    console.error('[Supabase] 연결 테스트 오류:', error);
    return false;
  }
}